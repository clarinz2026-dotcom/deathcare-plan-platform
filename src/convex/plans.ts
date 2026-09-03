import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, MutationCtx } from "./_generated/server";

/**
 * Plan catalog management.
 *
 * Plans are the plan types a client can hold (e.g. Isidore, Gabriel, Raphael,
 * Michael). Each plan carries TWO monthly prices:
 *   - price    — the current monthly amortization (e.g. ₱500 for Isidore)
 *   - oldPrice — the legacy monthly rate for clients still on old pricing
 *                (e.g. ₱250 for Isidore)
 *
 * The full plan price is the monthly rate x PLAN_TERM_MONTHS (60 months).
 *
 * The Bulk Upload page matches the spreadsheet "Plan Type" column against
 * these plan names (case-insensitive) and auto-creates a contract using the
 * monthly price chosen per client (old or current), plus backdated payments
 * for the months already paid.
 *
 * Who can manage: Super Admin and CEO only. Everyone signed-in can read the
 * list (bulk upload needs it to preview contract creation).
 */

/** Standard plan term used to derive the full plan price: monthly x 60 months. */
export const PLAN_TERM_MONTHS = 60;

/** Full plan price = monthly rate x 60-month term. */
export const fullPlanPrice = (monthly: number): number =>
  Math.round(monthly * PLAN_TERM_MONTHS);

/** All plans, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    return plans.sort((a, b) => b._creationTime - a._creationTime);
  },
});

async function assertCanManage(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found.");

  if (user.role !== "super_admin" && user.role !== "ceo") {
    throw new Error("Only the Super Admin or CEO can manage plans.");
  }
  return userId;
}

/** Find an existing plan by name, case-insensitive. */
async function findByName(ctx: { db: MutationCtx["db"] }, name: string) {
  const plans = await ctx.db.query("plans").collect();
  return (
    plans.find((p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()) ??
    null
  );
}

function validMonthly(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0.`);
  }
  return Math.round(value);
}

/** Create a plan. */
export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(), // current monthly price
    oldPrice: v.optional(v.number()), // legacy monthly price
    monthlyRate: v.optional(v.number()), // legacy alias (deprecated)
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await assertCanManage(ctx);

    const name = args.name.trim();
    if (!name) throw new Error("Plan name is required.");

    const price = validMonthly(args.price, "Current monthly price");
    if (price === undefined) throw new Error("Current monthly price is required.");

    const oldPrice = validMonthly(args.oldPrice, "Old monthly price");

    if (await findByName(ctx, name)) {
      throw new Error(`A plan named "${name}" already exists.`);
    }

    const planId = await ctx.db.insert("plans", {
      name,
      price,
      oldPrice: oldPrice ?? undefined,
      monthlyRate:
        args.monthlyRate && args.monthlyRate > 0
          ? Math.round(args.monthlyRate)
          : undefined,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
      createdBy: userId,
    });

    const user = await ctx.db.get(userId);
    await ctx.db.insert("audit_log", {
      action: "create",
      entityType: "client",
      entityId: planId,
      userId,
      userName: user?.name ?? user?.email ?? "Unknown",
      description: `Plan "${name}" created — current ₱${price.toLocaleString()}/mo (full ₱${fullPlanPrice(price).toLocaleString()})` +
        (oldPrice ? `, old ₱${oldPrice.toLocaleString()}/mo (full ₱${fullPlanPrice(oldPrice).toLocaleString()})` : ""),
      newValues: { name, price, oldPrice: oldPrice ?? undefined },
      timestamp: Date.now(),
    });

    return { success: true, planId };
  },
});

/** Update a plan (name, monthly prices, active flag). */
export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    oldPrice: v.optional(v.number()),
    monthlyRate: v.optional(v.number()), // legacy alias (deprecated)
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await assertCanManage(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found.");

    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Plan name is required.");
      const existing = await findByName(ctx, name);
      if (existing && existing._id !== args.planId) {
        throw new Error(`A plan named "${name}" already exists.`);
      }
      patch.name = name;
    }

    if (args.price !== undefined) {
      const price = validMonthly(args.price, "Current monthly price");
      if (price === undefined) throw new Error("Current monthly price is required.");
      patch.price = price;
    }

    if (args.oldPrice !== undefined) {
      patch.oldPrice = validMonthly(args.oldPrice, "Old monthly price");
    }

    if (args.monthlyRate !== undefined) {
      patch.monthlyRate =
        args.monthlyRate > 0 ? Math.round(args.monthlyRate) : undefined;
    }

    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.planId, patch);

    const user = await ctx.db.get(userId);
    await ctx.db.insert("audit_log", {
      action: "update",
      entityType: "client",
      entityId: args.planId,
      userId,
      userName: user?.name ?? user?.email ?? "Unknown",
      description: `Plan "${plan.name}" updated`,
      oldValues: { name: plan.name, price: plan.price, oldPrice: plan.oldPrice ?? undefined, isActive: plan.isActive },
      newValues: patch,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/** Remove a plan. Blocked while contracts still reference the plan name. */
export const remove = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const userId = await assertCanManage(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found.");

    const contracts = await ctx.db.query("contracts").collect();
    const inUse = contracts.filter(
      (c) => c.planType.toLowerCase().trim() === plan.name.toLowerCase().trim(),
    ).length;

    if (inUse > 0) {
      throw new Error(
        `Cannot remove "${plan.name}" — it is used by ${inUse} contract${inUse !== 1 ? "s" : ""}. Deactivate it instead.`,
      );
    }

    await ctx.db.delete(args.planId);

    const user = await ctx.db.get(userId);
    await ctx.db.insert("audit_log", {
      action: "delete",
      entityType: "client",
      entityId: args.planId,
      userId,
      userName: user?.name ?? user?.email ?? "Unknown",
      description: `Plan "${plan.name}" removed`,
      oldValues: { name: plan.name, price: plan.price, oldPrice: plan.oldPrice ?? undefined },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});