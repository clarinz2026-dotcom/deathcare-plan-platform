import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  current: "Current",
  delinquent_30: "30d Late",
  delinquent_60: "60d Late",
  delinquent_90: "90d Late",
  lapsed: "Lapsed",
  fully_paid: "Fully Paid",
  assigned_death_claim: "Death Claim",
};

const STATUS_COLORS: Record<string, string> = {
  current: "terminal-status-current",
  delinquent_30: "terminal-status-delinquent",
  delinquent_60: "terminal-status-delinquent",
  delinquent_90: "terminal-status-claim",
  lapsed: "terminal-status-claim",
  fully_paid: "terminal-status-paid",
  assigned_death_claim: "terminal-status-claim",
};

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function Dashboard() {
  const summary = useQuery(api.dashboard.summary);
  const recentPayments = useQuery(api.dashboard.recentPayments);
  const delinquent = useQuery(api.dashboard.delinquentContracts);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground font-mono">Loading dashboard...</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Clients",
      value: summary.totalClients,
      icon: Users,
      color: "text-terminal-green",
    },
    {
      label: "Active Contracts",
      value: summary.totalContracts,
      icon: FileText,
      color: "text-foreground",
    },
    {
      label: "Today's Collections",
      value: formatPHP(summary.todayAmount),
      sub: `${summary.todayPayments} payment${summary.todayPayments !== 1 ? "s" : ""}`,
      icon: Banknote,
      color: "text-terminal-green",
    },
    {
      label: "Monthly Collections",
      value: formatPHP(summary.monthAmount),
      sub: `${summary.monthPayments} payment${summary.monthPayments !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      color: "text-terminal-amber",
    },
    {
      label: "Total Collected",
      value: formatPHP(summary.totalCollected),
      sub: `of ${formatPHP(summary.totalContractValue)} total`,
      icon: CreditCard,
      color: "text-terminal-green",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          <span className="text-terminal-green">&gt;</span> Dashboard
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight">{stat.value}</p>
              {stat.sub && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stat.sub}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent payments */}
        <Card className="lg:col-span-2 border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentPayments || recentPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center font-mono">
                No payments recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {recentPayments.slice(0, 8).map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.client
                          ? `${p.client.lastName}, ${p.client.firstName}`
                          : "Unknown Client"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.contract?.contractNumber || "—"} ·{" "}
                        {p.paymentChannel.toUpperCase().replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-terminal-green">
                        {formatPHP(p.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(p.paymentDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract status breakdown + delinquents */}
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Contract Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(summary.contractsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${STATUS_COLORS[status] || ""}`}
                    >
                      {STATUS_LABELS[status] || status}
                    </Badge>
                    <span className="text-sm font-bold font-mono">{count}</span>
                  </div>
                ))}
                {Object.keys(summary.contractsByStatus).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2 font-mono">
                    No contracts yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delinquent alerts */}
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-terminal-amber" />
                Delinquent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!delinquent || delinquent.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2 font-mono">
                  All accounts current ✓
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {delinquent.map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {c.client
                            ? `${c.client.lastName}, ${c.client.firstName}`
                            : "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {c.contractNumber}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono shrink-0 ml-2 ${STATUS_COLORS[c.contractStatus] || ""}`}
                      >
                        {STATUS_LABELS[c.contractStatus] || c.contractStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
