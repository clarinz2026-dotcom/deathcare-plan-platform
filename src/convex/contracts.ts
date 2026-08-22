import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const contractStatusValidator = v.union(
  v.literal("current"),
  v.literal("delinquent_30"),
  v.literal("delinquent_60"),
  v.literal("delinquent_90"),
  v.literal("lapsed"),
  v.literal("fully_paid"),
  v.literal("assigned_death_claim"),
);

/**
 * List contracts, optionally filtered by client or status.
 */
export const list = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let contracts;

    if (args.clientId) {
      contracts = await ctx.db
        .query("contracts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .collect();
    } else if (args.status) {
      contracts = await ctx.db
        .query("contracts")
        .withIndex("by_status", (q) =>
          q.eq("contractStatus", args.status as any)
        )
        .order("desc")
        .collect();
    } else {
      contracts = await ctx.db.query("contracts").order("desc").collect();
    }

    // Attach client info
    const enriched = await Promise.all(
      contracts.map(async (c) => {
        const client = await ctx.db.get(c.clientId);
        return { ...c, client };
      })
    );

    return enriched;
  },
});

/**
 * Get a single contract with full details.
 */
export const get = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return null;

    const client = await ctx.db.get(contract.clientId);
    return { ...contract, client };
  },
});

/**
 * Create a new contract for a client.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    contractNumber: v.string(),
    planType: v.string(),
    planAmount: v.number(),
    monthlyAmortization: v.number(),
    startDate: v.number(),
    maturityDate: v.optional(v.number()),
    assignedAgent: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("contracts", {
      ...args,
      totalPaid: 0,
      contractStatus: "current",
      createdAt: Date.now(),
      createdBy: userId,
    });
  },
});

/**
 * Update a contract's status.
 */
export const updateStatus = mutation({
  args: {
    contractId: v.id("contracts"),
    contractStatus: contractStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.contractId, {
      contractStatus: args.contractStatus,
    });
  },
});
