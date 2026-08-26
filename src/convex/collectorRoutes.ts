import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all collector routes.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("collector_routes").order("desc").collect();

    const enriched = await Promise.all(
      routes.map(async (route) => {
        const collector = route.assignedCollector
          ? await ctx.db.get(route.assignedCollector)
          : null;
        const clients = await ctx.db
          .query("route_clients")
          .withIndex("by_route", (q) => q.eq("routeId", route._id))
          .collect();
        return {
          ...route,
          collectorName: collector?.name || collector?.email || "Unassigned",
          clientCount: clients.length,
          completedCount: clients.filter((c) => c.isCompleted).length,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Get a single route with its clients.
 */
export const get = query({
  args: { routeId: v.id("collector_routes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) return null;

    const collector = route.assignedCollector
      ? await ctx.db.get(route.assignedCollector)
      : null;

    const routeClients = await ctx.db
      .query("route_clients")
      .withIndex("by_route", (q) => q.eq("routeId", route._id))
      .collect();

    const enrichedClients = await Promise.all(
      routeClients.map(async (rc) => {
        const client = await ctx.db.get(rc.clientId);
        const contracts = await ctx.db
          .query("contracts")
          .withIndex("by_client", (q) => q.eq("clientId", rc.clientId))
          .collect();
        const totalDue = contracts.reduce(
          (sum, c) => sum + (c.planAmount - c.totalPaid),
          0,
        );
        const hasDelinquent = contracts.some(
          (c) =>
            c.contractStatus === "delinquent_30" ||
            c.contractStatus === "delinquent_60" ||
            c.contractStatus === "delinquent_90",
        );

        return {
          ...rc,
          client,
          totalDue,
          hasDelinquent,
          contractCount: contracts.length,
        };
      }),
    );

    return {
      ...route,
      collectorName: collector?.name || collector?.email || "Unassigned",
      clients: enrichedClients,
    };
  },
});

/**
 * Get routes assigned to a specific collector (for collector's own view).
 */
export const myRoutes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const routes = await ctx.db
      .query("collector_routes")
      .withIndex("by_collector", (q) => q.eq("assignedCollector", userId))
      .collect();

    const enriched = await Promise.all(
      routes.map(async (route) => {
        const clients = await ctx.db
          .query("route_clients")
          .withIndex("by_route", (q) => q.eq("routeId", route._id))
          .collect();

        const enrichedClients = await Promise.all(
          clients.map(async (rc) => {
            const client = await ctx.db.get(rc.clientId);
            const contracts = await ctx.db
              .query("contracts")
              .withIndex("by_client", (q) => q.eq("clientId", rc.clientId))
              .collect();
            const totalDue = contracts.reduce(
              (sum, c) => sum + (c.planAmount - c.totalPaid),
              0,
            );
            const hasDelinquent = contracts.some(
              (c) =>
                c.contractStatus === "delinquent_30" ||
                c.contractStatus === "delinquent_60" ||
                c.contractStatus === "delinquent_90",
            );
            // Get last payment
            const payments = await ctx.db
              .query("payments")
              .withIndex("by_client", (q) => q.eq("clientId", rc.clientId))
              .order("desc")
              .collect();
            const lastPayment = payments[0];

            return {
              ...rc,
              client,
              totalDue,
              hasDelinquent,
              lastPaymentDate: lastPayment?.paymentDate,
              lastPaymentAmount: lastPayment?.amount,
            };
          }),
        );

        return {
          ...route,
          clients: enrichedClients,
          completedCount: clients.filter((c) => c.isCompleted).length,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Create a new collector route.
 */
export const create = mutation({
  args: {
    routeName: v.string(),
    area: v.string(),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    assignedCollector: v.optional(v.id("users")),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const routeId = await ctx.db.insert("collector_routes", {
      routeName: args.routeName,
      area: args.area,
      city: args.city || undefined,
      province: args.province || undefined,
      assignedCollector: args.assignedCollector || undefined,
      frequency: args.frequency,
      isActive: true,
      notes: args.notes || undefined,
      createdAt: Date.now(),
      createdBy: userId,
    });

    // Audit
    const user = await ctx.db.get(userId);
    await ctx.db.insert("audit_log", {
      action: "create",
      entityType: "client", // Reuse entity type
      entityId: routeId,
      userId,
      userName: user?.name || user?.email || "Unknown",
      description: `Route "${args.routeName}" created for area ${args.area}`,
      newValues: { routeName: args.routeName, area: args.area, frequency: args.frequency },
      timestamp: Date.now(),
    });

    return routeId;
  },
});

/**
 * Update a collector route.
 */
export const update = mutation({
  args: {
    routeId: v.id("collector_routes"),
    routeName: v.optional(v.string()),
    area: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    assignedCollector: v.optional(v.id("users")),
    frequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { routeId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.routeName !== undefined) patch.routeName = updates.routeName;
    if (updates.area !== undefined) patch.area = updates.area;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.province !== undefined) patch.province = updates.province;
    if (updates.assignedCollector !== undefined) patch.assignedCollector = updates.assignedCollector;
    if (updates.frequency !== undefined) patch.frequency = updates.frequency;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.notes !== undefined) patch.notes = updates.notes;

    await ctx.db.patch(routeId, patch);
    return routeId;
  },
});

/**
 * Delete a collector route and its client assignments.
 */
export const remove = mutation({
  args: { routeId: v.id("collector_routes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete all route_clients for this route
    const routeClients = await ctx.db
      .query("route_clients")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();
    for (const rc of routeClients) {
      await ctx.db.delete(rc._id);
    }

    await ctx.db.delete(args.routeId);
    return true;
  },
});

/**
 * Add a client to a route.
 */
export const addClient = mutation({
  args: {
    routeId: v.id("collector_routes"),
    clientId: v.id("clients"),
    stopOrder: v.number(),
    estimatedTime: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already assigned
    const existing = await ctx.db
      .query("route_clients")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();
    if (existing.some((rc) => rc.clientId === args.clientId)) {
      throw new Error("Client already assigned to this route");
    }

    const rcId = await ctx.db.insert("route_clients", {
      routeId: args.routeId,
      clientId: args.clientId,
      stopOrder: args.stopOrder,
      estimatedTime: args.estimatedTime || undefined,
      notes: args.notes || undefined,
      isCompleted: false,
      createdAt: Date.now(),
    });

    return rcId;
  },
});

/**
 * Remove a client from a route.
 */
export const removeClient = mutation({
  args: { routeClientId: v.id("route_clients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.routeClientId);
    return true;
  },
});

/**
 * Mark a route stop as completed.
 */
export const completeStop = mutation({
  args: { routeClientId: v.id("route_clients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.routeClientId, {
      isCompleted: true,
      completedAt: Date.now(),
      completedBy: userId,
    });

    return true;
  },
});

/**
 * Mark a route stop as not completed (undo).
 */
export const uncompleteStop = mutation({
  args: { routeClientId: v.id("route_clients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.routeClientId, {
      isCompleted: false,
      completedAt: undefined,
      completedBy: undefined,
    });

    return true;
  },
});

/**
 * Auto-assign clients to a route by city/province.
 */
export const autoAssign = mutation({
  args: {
    routeId: v.id("collector_routes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");

    // Get existing assigned client IDs
    const existing = await ctx.db
      .query("route_clients")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();
    const existingClientIds = new Set(existing.map((rc) => rc.clientId));

    // Find clients matching the route's city/province
    let clients;
    if (route.city) {
      clients = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("city"), route.city))
        .collect();
    } else if (route.province) {
      clients = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("province"), route.province))
        .collect();
    } else {
      return { added: 0 };
    }

    let added = 0;
    let stopOrder = existing.length + 1;

    for (const client of clients) {
      if (!existingClientIds.has(client._id)) {
        await ctx.db.insert("route_clients", {
          routeId: args.routeId,
          clientId: client._id,
          stopOrder: stopOrder++,
          isCompleted: false,
          createdAt: Date.now(),
        });
        added++;
      }
    }

    return { added };
  },
});
