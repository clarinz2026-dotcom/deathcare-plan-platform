import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Bulk create clients (CLIENT-ONLY import) from parsed CSV/XLSX data.
 *
 * Expected template columns:
 *   No. | Planholder Name | LPA NO | Plan Type | Effectivity Date |
 *   Due Date | Installment | Amount | 30 | 60 | 90 | Contact No. | Address
 *
 * Only the client record is created. Due Date, Installment (months already
 * paid), Amount, and the 30/60/90 columns are reference-only info and are
 * preserved in the client's notes field.
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
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const userName = user?.name || user?.email || "Unknown";

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < args.clients.length; i++) {
      const row = args.clients[i];
      try {
        const planholderName = (row.planholderName || "").trim();
        const contactNumber = (row.contactNumber || "").trim();
        const address = (row.address || "").trim();

        if (!planholderName) {
          throw new Error("Planholder name is required");
        }
        if (!contactNumber) {
          throw new Error("Contact number is required");
        }
        if (!address) {
          throw new Error("Address is required");
        }

        const { firstName, lastName, middleName } = splitFullName(planholderName);

        // Clients table requires a DOB; bulk sheets don't carry one, so store a
        // neutral placeholder (can be corrected later in the client profile).
        const clientId = await ctx.db.insert("clients", {
          firstName,
          lastName,
          middleName,
          dateOfBirth: new Date("1990-01-01").getTime(),
          gender: "other",
          contactNumber,
          email: undefined,
          address,
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
            contactNumber,
            address,
          },
          timestamp: Date.now(),
        });

        results.success++;
      } catch (error) {
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
      description: `Bulk upload completed: ${results.success} created, ${results.failed} failed`,
      newValues: {
        totalRows: args.clients.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
      timestamp: Date.now(),
    });

    return results;
  },
});

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
