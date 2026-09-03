import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query, MutationCtx } from "./_generated/server";

/**
 * Plan catalog management.
 *
 * Plans are the plan types a client can hold (e.g. Isidore, Gabriel, Raphael,
 * Michael). The Bulk Upload page matches the spreadsheet "Plan Type" column
 * against these plan names (case-insensitive) and auto-creates a contract
 * using the plan's price.
 *
 * Who can manage: Super Admin and CEO only. Everyone signed-in can read the
 * list (bulk upload needs it to preview contract creation).
 */

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

/** Create a plan. */
export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    monthlyRate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await assertCanManage(ctx);

    const name = args.name.trim();
    if (!name) throw new Error("Plan name is required.");
    if (args.price <= 0) throw new Error("Plan price must be greater than 0.");

    if (await findByName(ctx, name)) {
      throw new Error(`A plan named "${name}" already exists.`);
    }

    const planId = await ctx.db.insert("plans", {
      name,
      price: args.price,
      monthlyRate: args.monthlyRate && args.monthlyRate > 0 ? args.monthlyRate : undefined,
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
      description: `Plan "${name}" created (₱${args.price.toLocaleString()})`,
      newValues: { name, price: args.price, monthlyRate: args.monthlyRate },
      timestamp: Date.now(),
    });

    return { success: true, planId };
  },
});

/** Update a plan (name, price, monthly rate, active flag). */
export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    monthlyRate: v.optional(v.number()),
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
      if (args.price <= 0) throw new Error("Plan price must be greater than 0.");
      patch.price = args.price;
    }

    if (args.monthlyRate !== undefined) {
      patch.monthlyRate = args.monthlyRate > 0 ? args.monthlyRate : undefined;
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
      oldValues: { name: plan.name, price: plan.price, monthlyRate: plan.monthlyRate, isActive: plan.isActive },
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
      oldValues: { name: plan.name, price: plan.price },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});