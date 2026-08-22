import { query } from "./_generated/server";

/**
 * Dashboard summary stats for the main overview.
 */
export const summary = query({
  handler: async (ctx) => {
    // Count clients
    const clients = await ctx.db.query("clients").collect();
    const totalClients = clients.length;

    // Count contracts by status
    const contracts = await ctx.db.query("contracts").collect();
    const contractsByStatus: Record<string, number> = {};
    let totalContractValue = 0;
    let totalCollected = 0;

    for (const c of contracts) {
      contractsByStatus[c.contractStatus] =
        (contractsByStatus[c.contractStatus] || 0) + 1;
      totalContractValue += c.planAmount;
      totalCollected += c.totalPaid;
    }

    // Total payments
    const payments = await ctx.db.query("payments").collect();
    const totalPayments = payments.length;
    const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    // Today's payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayPayments = payments.filter((p) => p.paymentDate >= todayStart);
    const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    // This month's payments
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const monthPayments = payments.filter((p) => p.paymentDate >= monthStart);
    const monthAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalClients,
      totalContracts: contracts.length,
      contractsByStatus,
      totalContractValue,
      totalCollected,
      totalPayments,
      totalPaymentAmount,
      todayPayments: todayPayments.length,
      todayAmount,
      monthPayments: monthPayments.length,
      monthAmount,
    };
  },
});

/**
 * Recent activity: latest payments across the system.
 */
export const recentPayments = query({
  args: {},
  handler: async (ctx) => {
    const payments = await ctx.db
      .query("payments")
      .order("desc")
      .take(20);

    const enriched = await Promise.all(
      payments.map(async (p) => {
        const client = await ctx.db.get(p.clientId);
        const contract = await ctx.db.get(p.contractId);
        return { ...p, client, contract };
      })
    );

    return enriched;
  },
});

/**
 * Upcoming delinquent contracts (for alerts).
 */
export const delinquentContracts = query({
  handler: async (ctx) => {
    const statuses = [
      "delinquent_30",
      "delinquent_60",
      "delinquent_90",
      "lapsed",
    ] as const;

    const results = [];
    for (const status of statuses) {
      const contracts = await ctx.db
        .query("contracts")
        .withIndex("by_status", (q) => q.eq("contractStatus", status))
        .collect();

      for (const c of contracts) {
        const client = await ctx.db.get(c.clientId);
        results.push({ ...c, client });
      }
    }

    return results;
  },
});
