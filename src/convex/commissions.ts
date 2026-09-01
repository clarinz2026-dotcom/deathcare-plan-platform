import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Set commission rate for an agent.
 */
export const setAgentRate = mutation({
  args: {
    agentId: v.id("users"),
    commissionRate: v.number(), // percentage
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if settings already exist
    const existing = await ctx.db
      .query("agent_commission_settings")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { commissionRate: args.commissionRate });
    } else {
      await ctx.db.insert("agent_commission_settings", {
        agentId: args.agentId,
        commissionRate: args.commissionRate,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Create commission record when a payment is recorded.
 */
export const createCommission = mutation({
  args: {
    agentId: v.id("users"),
    contractId: v.id("contracts"),
    clientId: v.id("clients"),
    paymentId: v.id("payments"),
    paymentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get agent commission rate
    const settings = await ctx.db
      .query("agent_commission_settings")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .first();

    const rate = settings?.commissionRate ?? 5; // default 5%
    const commissionAmount = Math.round(args.paymentAmount * (rate / 100));

    const commissionId = await ctx.db.insert("commissions", {
      agentId: args.agentId,
      contractId: args.contractId,
      clientId: args.clientId,
      paymentId: args.paymentId,
      paymentAmount: args.paymentAmount,
      commissionRate: rate,
      commissionAmount,
      status: "pending",
      createdAt: Date.now(),
    });

    return { commissionId, commissionAmount };
  },
});

/**
 * Approve a commission.
 */
export const approve = mutation({
  args: { commissionId: v.id("commissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.commissionId, {
      status: "approved",
      approvedBy: userId,
      approvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark commission as paid.
 */
export const markPaid = mutation({
  args: { commissionId: v.id("commissions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commissionId, {
      status: "paid",
      paidAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Reject a commission.
 */
export const reject = mutation({
  args: { commissionId: v.id("commissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.commissionId, {
      status: "rejected",
      approvedBy: userId,
      approvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List commissions, optionally filtered by agent or status.
 */
export const list = query({
  args: {
    agentId: v.optional(v.id("users")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("paid"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    let commissions;

    if (args.agentId) {
      commissions = await ctx.db
        .query("commissions")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .order("desc")
        .collect();
    } else {
      commissions = await ctx.db
        .query("commissions")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    if (args.status) {
      commissions = commissions.filter((c) => c.status === args.status);
    }

    // Enrich with names
    const enriched = await Promise.all(
      commissions.map(async (c) => {
        const agent = await ctx.db.get(c.agentId);
        const client = await ctx.db.get(c.clientId);
        return { ...c, agentName: agent?.name || agent?.email || "Unknown", clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown" };
      })
    );

    return enriched;
  },
});

/**
 * Summary stats for commissions.
 */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("commissions").collect();

    const totalPending = all
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalApproved = all
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPaid = all
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalCount = all.length;

    return { totalPending, totalApproved, totalPaid, totalCount };
  },
});
