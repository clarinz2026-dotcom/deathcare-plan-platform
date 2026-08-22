import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";

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
    if (!user) return { isCeo: false, isManager: false, isFinance: false, isCashier: false, role: null };
    return {
      isCeo: user.role === "ceo",
      isManager: user.role === "manager",
      isFinance: user.role === "finance_staff",
      isCashier: user.role === "cashier",
      role: user.role ?? null,
    };
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
