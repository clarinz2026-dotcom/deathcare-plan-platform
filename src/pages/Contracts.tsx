import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
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

const TABS = [
  { key: "all", label: "All" },
  { key: "current", label: "Current" },
  { key: "delinquent", label: "Delinquent" },
  { key: "lapsed", label: "Lapsed" },
  { key: "fully_paid", label: "Fully Paid" },
  { key: "assigned_death_claim", label: "Death Claim" },
];

export default function Contracts() {
  const contracts = useQuery(api.contracts.list, {});
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const filtered = contracts?.filter((c) => {
    if (filter === "all") return true;
    if (filter === "delinquent")
      return c.contractStatus.startsWith("delinquent");
    return c.contractStatus === filter;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-terminal-green">&gt;</span> Contracts
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {contracts?.length || 0} total contract{(contracts?.length || 0) !== 1 && "s"}
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs font-mono"
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Contract cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {!filtered ? (
          <p className="text-sm text-muted-foreground font-mono col-span-full py-8 text-center">
            Loading contracts...
          </p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-mono">
              No contracts match this filter
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const progress = c.planAmount
              ? Math.min((c.totalPaid / c.planAmount) * 100, 100)
              : 0;
            return (
              <Card
                key={c._id}
                className="border-border/60 shadow-none cursor-pointer hover:border-border transition-colors"
                onClick={() => navigate(`/clients/${c.clientId}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">
                      {c.contractNumber}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        STATUS_COLORS[c.contractStatus] || ""
                      }`}
                    >
                      {STATUS_LABELS[c.contractStatus] || c.contractStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Client */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      {c.client
                        ? `${c.client.lastName}, ${c.client.firstName}`
                        : "Unknown"}
                    </p>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {/* Plan details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase text-[10px]">
                        Plan
                      </p>
                      <p className="font-medium">{c.planType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase text-[10px]">
                        Monthly
                      </p>
                      <p className="font-mono">
                        {formatPHP(c.monthlyAmortization)}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">
                        {formatPHP(c.totalPaid)} / {formatPHP(c.planAmount)}
                      </span>
                      <span className="text-terminal-green font-medium">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terminal-green rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <p className="text-[10px] text-muted-foreground">
                    Started: {format(new Date(c.startDate), "MMM d, yyyy")}
                    {c.maturityDate &&
                      ` · Matures: ${format(new Date(c.maturityDate), "MMM d, yyyy")}`}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
