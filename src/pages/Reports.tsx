import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useState } from "react";

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

const CHANNEL_COLORS: Record<string, string> = {
  cash: "#2d8a4e",
  gcash: "#007dfe",
  maya: "#00c4b4",
  bank_transfer: "#d4a017",
  check: "#6b6b60",
};

const STATUS_COLORS: Record<string, string> = {
  current: "#2d8a4e",
  "30_days": "#d4a017",
  "60_days": "#e67e22",
  "90_days": "#c0392b",
  lapsed: "#8b0000",
  fully_paid: "#27ae60",
};

const STATUS_LABELS: Record<string, string> = {
  current: "Current",
  "30_days": "30 Days Late",
  "60_days": "60 Days Late",
  "90_days": "90 Days Late",
  lapsed: "Lapsed",
  fully_paid: "Fully Paid",
};

export default function Reports() {
  const [refreshing, setRefreshing] = useState(false);
  
  const collectionSummary = useQuery(api.reports.collectionSummary);
  const byChannel = useQuery(api.reports.byChannel);
  const byCashier = useQuery(api.reports.byCashier);
  const dailyCollections = useQuery(api.reports.dailyCollections);
  const agingReport = useQuery(api.reports.agingReport);
  const monthlyTrend = useQuery(api.reports.monthlyTrend);

  if (!collectionSummary || !byChannel || !agingReport) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground font-mono">Loading reports...</p>
      </div>
    );
  }

  const channelData = Object.entries(byChannel).map(([name, data]) => ({
    name: name.replace(/_/g, " ").toUpperCase(),
    value: data.amount,
    count: data.count,
    color: CHANNEL_COLORS[name] || "#6b6b60",
  }));

  const agingData = Object.entries(agingReport)
    .filter(([key]) => key !== "fully_paid")
    .map(([key, data]) => ({
      name: STATUS_LABELS[key] || key,
      value: data.amount,
      count: data.count,
      color: STATUS_COLORS[key] || "#6b6b60",
    }));

  const totalReceivables = agingData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collection Reports</h1>
          <p className="text-xs text-muted-foreground font-mono">
            &gt; reports.collections.summary
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 font-mono">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatPHP(collectionSummary.today.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">{collectionSummary.today.count} payments</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatPHP(collectionSummary.thisWeek.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">{collectionSummary.thisWeek.count} payments</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-terminal-green">
              {formatPHP(collectionSummary.thisMonth.amount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{collectionSummary.thisMonth.count} payments</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Year to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{formatPHP(collectionSummary.yearToDate.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">{collectionSummary.yearToDate.count} payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Collections by Channel */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Collections by Channel (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatPHP(value)}
                    contentStyle={{
                      background: "#f8f7f4",
                      border: "1px solid #e5e5e0",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {channelData.map((ch) => (
                <div key={ch.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span className="text-muted-foreground">{ch.name}</span>
                  <span className="font-mono font-medium">{formatPHP(ch.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Collections Chart */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daily Collections (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyCollections && dailyCollections.some((d) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyCollections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="#6b6b60"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="#6b6b60"
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatPHP(value)}
                    contentStyle={{
                      background: "#f8f7f4",
                      border: "1px solid #e5e5e0",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="amount" fill="#2d8a4e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No collections this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aging Report & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging Report */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <Users className="h-4 w-4" />
              Outstanding Receivables Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agingData.map((item) => {
                const percentage = totalReceivables > 0 ? (item.value / totalReceivables) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="text-xs text-muted-foreground">({item.count})</span>
                      </div>
                      <span className="font-mono font-medium">{formatPHP(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Outstanding</span>
                <span className="font-mono font-bold text-lg">{formatPHP(totalReceivables)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Collections Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend && monthlyTrend.some((m) => m.amount > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fontFamily: "monospace" }}
                    stroke="#6b6b60"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    stroke="#6b6b60"
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatPHP(value)}
                    contentStyle={{
                      background: "#f8f7f4",
                      border: "1px solid #e5e5e0",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2d8a4e"
                    strokeWidth={2}
                    dot={{ fill: "#2d8a4e", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No trend data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cashier Performance */}
      {byCashier && Object.keys(byCashier).length > 0 && (
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
              Cashier Performance (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Cashier
                  </th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Transactions
                  </th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Total Collected
                  </th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Avg. per Transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCashier)
                  .sort(([, a], [, b]) => b.amount - a.amount)
                  .map(([userId, data]) => (
                    <tr key={userId} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 px-4 font-medium">{data.name}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{data.count}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-terminal-green">
                        {formatPHP(data.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                        {formatPHP(data.count > 0 ? data.amount / data.count : 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Last Month Comparison */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Month-over-Month Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-mono">Last Month</p>
              <p className="text-xl font-bold font-mono">{formatPHP(collectionSummary.lastMonth.amount)}</p>
              <p className="text-xs text-muted-foreground">{collectionSummary.lastMonth.count} payments</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-mono">This Month</p>
              <p className="text-xl font-bold font-mono text-terminal-green">
                {formatPHP(collectionSummary.thisMonth.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{collectionSummary.thisMonth.count} payments</p>
            </div>
          </div>
          {collectionSummary.lastMonth.amount > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              {(() => {
                const change = ((collectionSummary.thisMonth.amount - collectionSummary.lastMonth.amount) / collectionSummary.lastMonth.amount) * 100;
                const isPositive = change >= 0;
                return (
                  <p className={`text-sm font-mono ${isPositive ? "text-terminal-green" : "text-red-600"}`}>
                    {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}% vs last month
                  </p>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
