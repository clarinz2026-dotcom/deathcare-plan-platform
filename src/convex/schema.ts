import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Roles ──────────────────────────────────────────────────────────────────
export const ROLES = {
  CEO: "ceo",
  FINANCE_STAFF: "finance_staff",
  CASHIER: "cashier",
  MANAGER: "manager",
} as const;

export const roleValidator = v.union(
  v.literal("ceo"),
  v.literal("finance_staff"),
  v.literal("cashier"),
  v.literal("manager"),
  v.literal("collector"),
);

// ─── Enum values ────────────────────────────────────────────────────────────
export const CONTRACT_STATUSES = [
  "current",
  "delinquent_30",
  "delinquent_60",
  "delinquent_90",
  "lapsed",
  "fully_paid",
  "assigned_death_claim",
] as const;

export const PAYMENT_CHANNELS = [
  "cash",
  "gcash",
  "maya",
  "bank_transfer",
  "check",
] as const;

export const OR_STATUSES = ["active", "exhausted", "cancelled"] as const;

// ─── Validators ─────────────────────────────────────────────────────────────
const contractStatusValidator = v.union(
  v.literal("current"),
  v.literal("delinquent_30"),
  v.literal("delinquent_60"),
  v.literal("delinquent_90"),
  v.literal("lapsed"),
  v.literal("fully_paid"),
  v.literal("assigned_death_claim"),
);

const paymentChannelValidator = v.union(
  v.literal("cash"),
  v.literal("gcash"),
  v.literal("maya"),
  v.literal("bank_transfer"),
  v.literal("check"),
);

const orStatusValidator = v.union(
  v.literal("active"),
  v.literal("exhausted"),
  v.literal("cancelled"),
);

// ─── Schema ─────────────────────────────────────────────────────────────────
const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Clients / planholders
    clients: defineTable({
      firstName: v.string(),
      lastName: v.string(),
      middleName: v.optional(v.string()),
      dateOfBirth: v.number(),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
      contactNumber: v.string(),
      email: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      province: v.string(),
      zipCode: v.string(),
      occupation: v.optional(v.string()),
      beneficiaryName: v.string(),
      beneficiaryRelationship: v.string(),
      beneficiaryContact: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      createdBy: v.id("users"),
    })
      .index("by_lastName", ["lastName"])
      .index("by_createdAt", ["createdAt"]),

    // Contracts / plans
    contracts: defineTable({
      clientId: v.id("clients"),
      contractNumber: v.string(),
      planType: v.string(),
      planAmount: v.number(),
      monthlyAmortization: v.number(),
      totalPaid: v.number(),
      contractStatus: contractStatusValidator,
      startDate: v.number(),
      maturityDate: v.optional(v.number()),
      assignedAgent: v.optional(v.id("users")),
      createdAt: v.number(),
      createdBy: v.id("users"),
    })
      .index("by_client", ["clientId"])
      .index("by_status", ["contractStatus"])
      .index("by_contractNumber", ["contractNumber"]),

    // Payments
    payments: defineTable({
      contractId: v.id("contracts"),
      clientId: v.id("clients"),
      amount: v.number(),
      paymentChannel: paymentChannelValidator,
      paymentDate: v.number(),
      orNumber: v.optional(v.string()),
      referenceNumber: v.optional(v.string()),
      chequeNumber: v.optional(v.string()),
      bankName: v.optional(v.string()),
      remarks: v.optional(v.string()),
      recordedBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_contract", ["contractId"])
      .index("by_client", ["clientId"])
      .index("by_paymentDate", ["paymentDate"])
      .index("by_orNumber", ["orNumber"]),

    // Audit log
    audit_log: defineTable({
      action: v.union(
        v.literal("create"),
        v.literal("update"),
        v.literal("delete"),
        v.literal("status_change"),
      ),
      entityType: v.union(
        v.literal("client"),
        v.literal("contract"),
        v.literal("payment"),
        v.literal("receipt"),
      ),
      entityId: v.string(),
      userId: v.id("users"),
      userName: v.optional(v.string()),
      description: v.string(),
      oldValues: v.optional(v.any()),
      newValues: v.optional(v.any()),
      timestamp: v.number(),
    })
      .index("by_entity", ["entityType", "entityId"])
      .index("by_user", ["userId"])
      .index("by_timestamp", ["timestamp"])
      .index("by_action", ["action"]),

    // Collector routes
    collector_routes: defineTable({
      routeName: v.string(),
      area: v.string(), // e.g. "Manila East", "Quezon City North"
      city: v.optional(v.string()),
      province: v.optional(v.string()),
      assignedCollector: v.optional(v.id("users")),
      frequency: v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
      ),
      isActive: v.boolean(),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      createdBy: v.id("users"),
    })
      .index("by_collector", ["assignedCollector"])
      .index("by_area", ["area"]),

    // Route assignments — which clients are on which route
    route_clients: defineTable({
      routeId: v.id("collector_routes"),
      clientId: v.id("clients"),
      stopOrder: v.number(), // Order of stop in the route
      estimatedTime: v.optional(v.string()), // e.g. "9:00 AM"
      notes: v.optional(v.string()),
      isCompleted: v.boolean(),
      completedAt: v.optional(v.number()),
      completedBy: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_route", ["routeId"])
      .index("by_client", ["clientId"]),

    // Receipts
    receipts: defineTable({
      paymentId: v.id("payments"),
      contractId: v.id("contracts"),
      clientId: v.id("clients"),
      receiptNumber: v.string(),
      amount: v.number(),
      paymentChannel: paymentChannelValidator,
      paymentDate: v.number(),
      issuedTo: v.string(),
      planType: v.string(),
      contractNumber: v.string(),
      status: orStatusValidator,
      issuedBy: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_payment", ["paymentId"])
      .index("by_client", ["clientId"])
      .index("by_receiptNumber", ["receiptNumber"])
      .index("by_createdAt", ["createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
