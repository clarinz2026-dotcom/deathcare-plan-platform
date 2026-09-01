import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { roleValidator } from "./schema";
import { mutation, query, QueryCtx } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return user;
  },
});

/**
 * Check if the current user has a specific role.
 */
export const hasRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user)
      return {
        isSuperAdmin: false,
        isCeo: false,
        isManager: false,
        isFinance: false,
        isCashier: false,
        isCollector: false,
        role: null,
      };
    return {
      isSuperAdmin: user.role === "super_admin",
      isCeo: user.role === "ceo",
      isManager: user.role === "manager",
      isFinance: user.role === "finance_staff",
      isCashier: user.role === "cashier",
      isCollector: user.role === "collector",
      role: user.role ?? null,
    };
  },
});

/**
 * List all users (for role management). Only super_admin can use this.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];
    const currentUserDoc = await ctx.db.get(currentUserId);
    if (!currentUserDoc || currentUserDoc.role !== "super_admin") return [];

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role ?? null,
      createdAt: u._creationTime,
    }));
  },
});

/**
 * Claim super_admin role. Can only be called once — if a super_admin already exists, it fails.
 * This is the one-time setup for the app owner.
 */
export const claimSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if a super_admin already exists
    const existingSuperAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .first();

    if (existingSuperAdmin) {
      throw new Error(
        "A super admin already exists. Only one super admin is allowed.",
      );
    }

    // Assign super_admin to this user
    await ctx.db.patch(userId, { role: "super_admin" });

    // Log it
    const user = await ctx.db.get(userId);
    await ctx.db.insert("audit_log", {
      action: "create",
      entityType: "client", // reuse as system event
      entityId: userId,
      userId: userId,
      userName: user?.name ?? user?.email ?? "Unknown",
      description: `Super Admin role claimed by ${user?.name ?? user?.email}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Set a user's role. Only super_admin can do this.
 */
export const setRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentUserDoc = await ctx.db.get(currentUserId);
    if (!currentUserDoc || currentUserDoc.role !== "super_admin") {
      throw new Error("Only the super admin can assign roles.");
    }

    // Prevent changing your own role
    if (args.userId === currentUserId) {
      throw new Error("Super admin cannot change their own role.");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found.");

    const oldRole = targetUser.role;
    await ctx.db.patch(args.userId, { role: args.role });

    // Audit log
    await ctx.db.insert("audit_log", {
      action: "status_change",
      entityType: "client", // reuse as system event
      entityId: args.userId,
      userId: currentUserId,
      userName: currentUserDoc.name ?? currentUserDoc.email ?? "Unknown",
      description: `Role changed for ${targetUser.name ?? targetUser.email}: ${oldRole ?? "none"} → ${args.role}`,
      oldValues: { role: oldRole },
      newValues: { role: args.role },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if a super_admin exists in the system.
 */
export const hasSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .first();
    return { hasSuperAdmin: existing !== null };
  },
});

/**
 * Internal helper to get the current user.
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
};
