import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Bulk create clients (and contracts when a plan type matches) from parsed
 * CSV/XLSX data.
 *
 * Expected template columns:
 *   No. | Planholder Name | LPA NO | Plan Type | Effectivity Date |
 *   Due Date | Installment | Amount | 30 | 60 | 90 | Contact No. | Address
 *
 * Behavior per row:
 * - A client record is always created (Planholder Name required).
 * - If the row's Plan Type matches an existing plan on the Plans page
 *   (case-insensitive), a CONTRACT is also created automatically:
 *   - contract number  = LPA NO (if present) else auto-generated
 *   - plan amount      = the plan's price from the Plans page
 *   - start date       = the Effectivity Date column (or today if blank)
 *   - status           = current
 * - Backdated payments: if Installment = N (months already paid), N payment
 *   records are created, one per month starting from the effectivity date.
 *   Each payment's amount:
 *     1. CSV Amount ÷ N (when the Amount column is filled)
 *     2. else the per-row monthlyRate chosen in the upload preview
 *     3. else the plan's monthlyRate from the Plans page
 *     4. else plan price ÷ N
 * - If the Plan Type does not match any plan, the client is imported with no
 *   contract (reference info is still kept on the client's notes).
 */

export const bulkCreateClients = mutation({
  args: {
    clients: v.array(
      v.object({
        no: v.optional(v.string()),
        planholderName: v.optional(v.string()),
        lpaNo: v.optional(v.string()),
        planType: v.optional(v.string()),
        effectivityDate: v.optional(v.string()),
        dueDate: v.optional(v.string()),
        installment: v.optional(v.string()),
        amount: v.optional(v.string()),
        due30: v.optional(v.string()),
        due60: v.optional(v.string()),
        due90: v.optional(v.string()),
        contactNumber: v.optional(v.string()),
        address: v.optional(v.string()),
        // Monthly rate chosen in the preview for rows without an Amount
        // (e.g. 250 or 500 for old-price clients).
        monthlyRate: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const userName = user?.name || user?.email || "Unknown";

    // Load the plan catalog once and index by normalized name.
    const allPlans = await ctx.db.query("plans").collect();
    const plansByName = new Map<string, (typeof allPlans)[number]>();
    for (const plan of allPlans) {
      if (plan.isActive === false) continue;
      plansByName.set(plan.name.toLowerCase().trim(), plan);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      contractsCreated: 0,
      paymentsCreated: 0,
    };

    for (let i = 0; i < args.clients.length; i++) {
      const row = args.clients[i];
      let clientId: string | null = null;
      try {
        const planholderName = (row.planholderName || "").trim();
        const contactNumber = (row.contactNumber || "").trim();
        const address = (row.address || "").trim();

        if (!planholderName) {
          throw new Error("Planholder name is required");
        }

        const { firstName, lastName, middleName } = splitFullName(planholderName);

        // Clients table requires a DOB; bulk sheets don't carry one, so store a
        // neutral placeholder (can be corrected later in the client profile).
        clientId = await ctx.db.insert("clients", {
          firstName,
          lastName,
          middleName,
          dateOfBirth: new Date("1990-01-01").getTime(),
          gender: "other",
          contactNumber: contactNumber || "",
          email: undefined,
          address: address || "",
          city: "",
          province: "",
          zipCode: "",
          occupation: undefined,
          beneficiaryName: "TBD",
          beneficiaryRelationship: "TBD",
          beneficiaryContact: undefined,
          notes: buildReferenceNotes(row) || undefined,
          createdAt: Date.now(),
          createdBy: userId,
        });

        await ctx.db.insert("audit_log", {
          action: "create",
          entityType: "client",
          entityId: clientId,
          userId,
          userName,
          description: `Client ${firstName} ${lastName} created via bulk upload`,
          newValues: {
            firstName,
            lastName,
            contactNumber: contactNumber || "",
            address: address || "",
          },
          timestamp: Date.now(),
        });

        // ── Contract auto-creation when the plan type matches ────────────
        const planType = (row.planType || "").trim();
        if (planType) {
          const plan = plansByName.get(planType.toLowerCase());
          if (plan) {
            const contractId = await createContractForRow(ctx, {
              row,
              plan,
              clientId,
              userId,
              userName,
            });
            results.contractsCreated++;
            results.paymentsCreated += contractId.paymentsCreated;
          }
        }

        results.success++;
      } catch (error) {
        // If the client was created but a later step failed, clean it up so
        // no orphan clients are left behind.
        if (clientId) {
          try {
            await ctx.db.delete(clientId);
          } catch {
            // ignore cleanup failure — better to keep the row error visible
          }
        }
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await ctx.db.insert("audit_log", {
      action: "create",
      entityType: "client",
      entityId: "bulk-upload",
      userId,
      userName,
      description: `Bulk upload completed: ${results.success} created, ${results.failed} failed, ${results.contractsCreated} contracts, ${results.paymentsCreated} backdated payments`,
      newValues: {
        totalRows: args.clients.length,
        success: results.success,
        failed: results.failed,
        contractsCreated: results.contractsCreated,
        paymentsCreated: results.paymentsCreated,
        errors: results.errors,
      },
      timestamp: Date.now(),
    });

    return results;
  },
});

/** Create a contract (+ backdated payments) for one imported row. */
async function createContractForRow(
  ctx: { db: any },
  args: {
    row: {
      lpaNo?: string;
      effectivityDate?: string;
      installment?: string;
      amount?: string;
      monthlyRate?: number;
    };
    plan: { name: string; price: number; monthlyRate?: number };
    clientId: string;
    userId: string;
    userName: string;
  },
) {
  const { row, plan, clientId, userId, userName } = args;

  const startDate = parseDate(row.effectivityDate) ?? Date.now();
  const monthsPaid = Math.max(0, parseInt(row.installment || "", 10) || 0);

  // Per-payment amount: CSV Amount ÷ months, else the chosen monthly rate,
  // else the plan's default monthly rate, else plan price ÷ months.
  const csvAmount = parseAmount(row.amount);
  let perPayment = 0;
  if (csvAmount !== null && monthsPaid > 0) {
    perPayment = Math.round(csvAmount / monthsPaid);
  } else if (row.monthlyRate && row.monthlyRate > 0) {
    perPayment = row.monthlyRate;
  } else if (plan.monthlyRate && plan.monthlyRate > 0) {
    perPayment = plan.monthlyRate;
  } else if (monthsPaid > 0) {
    perPayment = Math.round(plan.price / monthsPaid);
  }

  const contractNumber =
    (row.lpaNo || "").trim() ||
    `EFS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const totalPaid = perPayment * monthsPaid;

  const contractId = await ctx.db.insert("contracts", {
    clientId,
    contractNumber,
    planType: plan.name,
    planAmount: plan.price,
    monthlyAmortization: perPayment,
    totalPaid,
    contractStatus: "current",
    startDate,
    maturityDate: undefined,
    assignedAgent: undefined,
    createdAt: Date.now(),
    createdBy: userId,
  });

  await ctx.db.insert("audit_log", {
    action: "create",
    entityType: "contract",
    entityId: contractId,
    userId,
    userName,
    description: `Contract ${contractNumber} (${plan.name}) auto-created via bulk upload`,
    newValues: {
      contractNumber,
      planType: plan.name,
      planAmount: plan.price,
      monthlyAmortization: perPayment,
      totalPaid,
      startDate,
    },
    timestamp: Date.now(),
  });

  // Backdated payments — one per month already paid, starting from the
  // effectivity date.
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  let paymentsCreated = 0;
  for (let m = 0; m < monthsPaid; m++) {
    await ctx.db.insert("payments", {
      contractId,
      clientId,
      amount: perPayment,
      paymentChannel: "cash",
      paymentDate: startDate + m * MONTH_MS,
      orNumber: undefined,
      referenceNumber: undefined,
      chequeNumber: undefined,
      bankName: undefined,
      remarks: `Backdated (bulk import) — month ${m + 1} of ${monthsPaid}`,
      recordedBy: userId,
      createdAt: Date.now(),
    });
    paymentsCreated++;
  }

  return { contractId, paymentsCreated };
}

/** Split "Juan Dela Cruz", "Juan B. Dela Cruz", or "Dela Cruz, Juan" into parts. */
function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
  middleName?: string;
} {
  if (fullName.includes(",")) {
    // "Last Name, First Middle"
    const [surnamePart, givenPart] = fullName.split(",", 2);
    const lastName = (surnamePart || "").trim() || "Unknown";
    const given = (givenPart || "").trim().split(/\s+/).filter(Boolean);
    const firstName = given.shift() || "Unknown";
    return {
      firstName,
      lastName,
      middleName: given.length > 0 ? given.join(" ") : undefined,
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
  return {
    firstName,
    lastName,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : undefined,
  };
}

/** Parse a date from common spreadsheet formats, or null. */
function parseDate(value?: string): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return isNaN(time) ? null : time;
}

/** Parse a numeric amount (commas allowed), or null. */
function parseAmount(value?: string): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const num = parseFloat(raw.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

/** Keep all reference-only columns (due date, months paid, amounts, aging) in one string. */
function buildReferenceNotes(row: {
  no?: string;
  lpaNo?: string;
  planType?: string;
  effectivityDate?: string;
  dueDate?: string;
  installment?: string;
  amount?: string;
  due30?: string;
  due60?: string;
  due90?: string;
}): string | null {
  const refs: Array<[string, string | undefined]> = [
    ["No.", row.no],
    ["LPA NO", row.lpaNo],
    ["Plan Type", row.planType],
    ["Effectivity Date", row.effectivityDate],
    ["Due Date", row.dueDate],
    ["Months Paid", row.installment],
    ["Amount", row.amount],
    ["30", row.due30],
    ["60", row.due60],
    ["90", row.due90],
  ];

  const parts = refs
    .filter(([, value]) => value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  return parts.length > 0 ? parts.join(" | ") : null;
}