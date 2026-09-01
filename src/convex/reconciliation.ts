import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Start/end-of-day reconciliation.
 * Creates a new reconciliation record with actual amounts and computes variance.
 */
export const create = mutation({
  args: {
    totalCash: v.number(),
    totalGCash: v.number(),
    totalMaya: v.number(),
    totalBankTransfer: v.number(),
    totalCheck: v.number(),
    totalActual: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 86400000;

    // Get all payments recorded today
    const todayPayments = await ctx.db
      .query("payments")
      .withIndex("by_paymentDate", (q) =>
        q.gte("paymentDate", todayStart).lt("paymentDate", todayEnd)
      )
      .collect();

    const totalRecorded = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalRecordedBreakdown = {
      cash: todayPayments
        .filter((p) => p.paymentChannel === "cash")
        .reduce((sum, p) => sum + p.amount, 0),
      gcash: todayPayments
        .filter((p) => p.paymentChannel === "gcash")
        .reduce((sum, p) => sum + p.amount, 0),
      maya: todayPayments
        .filter((p) => p.paymentChannel === "maya")
        .reduce((sum, p) => sum + p.amount, 0),
      bank_transfer: todayPayments
        .filter((p) => p.paymentChannel === "bank_transfer")
        .reduce((sum, p) => sum + p.amount, 0),
      check: todayPayments
        .filter((p) => p.paymentChannel === "check")
        .reduce((sum, p) => sum + p.amount, 0),
    };

    const variance = args.totalActual - totalRecorded;

    const reconciliationId = await ctx.db.insert("daily_reconciliation", {
      cashierId: userId,
      reconciliationDate: todayStart,
      totalCash: args.totalCash,
      totalGCash: args.totalGCash,
      totalMaya: args.totalMaya,
      totalBankTransfer: args.totalBankTransfer,
      totalCheck: args.totalCheck,
      totalRecorded,
      totalActual: args.totalActual,
      variance,
      status: "closed",
      notes: args.notes,
      createdAt: Date.now(),
    });

    return {
      reconciliationId,
      totalRecorded,
      variance,
      recordedBreakdown: totalRecordedBreakdown,
      paymentCount: todayPayments.length,
    };
  },
});

/**
 * List reconciliations, optionally filtered by cashier.
 */
export const list = query({
  args: {
    cashierId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let records;

    if (args.cashierId) {
      records = await ctx.db
        .query("daily_reconciliation")
        .withIndex("by_cashier", (q) => q.eq("cashierId", args.cashierId!))
        .order("desc")
        .collect();
    } else {
      records = await ctx.db
        .query("daily_reconciliation")
        .withIndex("by_date")
        .order("desc")
        .collect();
    }

    // Enrich with cashier name
    const enriched = await Promise.all(
      records.map(async (r) => {
        const cashier = await ctx.db.get(r.cashierId);
        return {
          ...r,
          cashierName: cashier?.name || cashier?.email || "Unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Review a reconciliation (manager/CEO).
 */
export const review = mutation({
  args: {
    reconciliationId: v.id("daily_reconciliation"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.reconciliationId, {
      status: "reviewed",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      notes: args.notes,
    });

    return { success: true };
  },
});

/**
 * Get today's summary for a cashier.
 */
export const todaySummary = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 86400000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_paymentDate", (q) =>
        q.gte("paymentDate", todayStart).lt("paymentDate", todayEnd)
      )
      .collect();

    const byChannel = {
      cash: payments.filter((p) => p.paymentChannel === "cash").reduce((s, p) => s + p.amount, 0),
      gcash: payments.filter((p) => p.paymentChannel === "gcash").reduce((s, p) => s + p.amount, 0),
      maya: payments.filter((p) => p.paymentChannel === "maya").reduce((s, p) => s + p.amount, 0),
      bank_transfer: payments.filter((p) => p.paymentChannel === "bank_transfer").reduce((s, p) => s + p.amount, 0),
      check: payments.filter((p) => p.paymentChannel === "check").reduce((s, p) => s + p.amount, 0),
    };

    const total = payments.reduce((s, p) => s + p.amount, 0);

    return { total, count: payments.length, byChannel };
  },
});
