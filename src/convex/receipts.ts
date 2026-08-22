import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * List all receipts, optionally filtered by client.
 */
export const list = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let receipts;

    if (args.clientId) {
      receipts = await ctx.db
        .query("receipts")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .order("desc")
        .collect();
    } else {
      receipts = await ctx.db
        .query("receipts")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    return receipts;
  },
});

/**
 * Get a single receipt by ID.
 */
export const get = query({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const client = await ctx.db.get(receipt.clientId);
    const payment = await ctx.db.get(receipt.paymentId);

    return { ...receipt, client, payment };
  },
});

/**
 * Get receipt by receipt number.
 */
export const getByNumber = query({
  args: { receiptNumber: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("receipts")
      .withIndex("by_receiptNumber", (q) =>
        q.eq("receiptNumber", args.receiptNumber)
      )
      .collect();

    return results[0] ?? null;
  },
});
