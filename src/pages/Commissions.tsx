import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { ScrollableTable } from "@/components/ScrollableTable";

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/20",
  approved: "bg-terminal-green/10 text-terminal-green border border-terminal-green/20",
  paid: "bg-blue-50 text-blue-700 border border-blue-200",
  rejected: "bg-terminal-red/10 text-terminal-red border border-terminal-red/20",
};

export default function Commissions() {
  const summary = useQuery(api.commissions.summary);
  const commissions = useQuery(api.commissions.list, {});
  const approveCommission = useMutation(api.commissions.approve);
  const markPaid = useMutation(api.commissions.markPaid);
  const rejectCommission = useMutation(api.commissions.reject);

  const [filter, setFilter] = useState<string>("all");

  const filtered = commissions?.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded bg-terminal-green/10 flex items-center justify-center">
          <DollarSign className="h-4.5 w-4.5 text-terminal-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Agent commission tracking and payouts
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Pending</p>
                <p className="text-xl font-bold text-terminal-amber">
                  {formatPHP(summary?.totalPending ?? 0)}
                </p>
              </div>
              <Clock className="h-5 w-5 text-terminal-amber/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Approved</p>
                <p className="text-xl font-bold text-terminal-green">
                  {formatPHP(summary?.totalApproved ?? 0)}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-terminal-green/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Paid</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatPHP(summary?.totalPaid ?? 0)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Total</p>
                <p className="text-xl font-bold">{summary?.totalCount ?? 0}</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "paid", "rejected"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="font-mono text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">All Commissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollableTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-mono">Agent</TableHead>
                  <TableHead className="text-xs font-mono">Client</TableHead>
                  <TableHead className="text-xs font-mono">Payment</TableHead>
                  <TableHead className="text-xs font-mono">Rate</TableHead>
                  <TableHead className="text-xs font-mono">Commission</TableHead>
                  <TableHead className="text-xs font-mono">Status</TableHead>
                  <TableHead className="text-xs font-mono">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="text-xs font-mono">{c.agentName}</TableCell>
                    <TableCell className="text-xs font-mono">{c.clientName}</TableCell>
                    <TableCell className="text-xs font-mono">{formatPHP(c.paymentAmount)}</TableCell>
                    <TableCell className="text-xs font-mono">{c.commissionRate}%</TableCell>
                    <TableCell className="text-xs font-bold font-mono">{formatPHP(c.commissionAmount)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-mono ${STATUS_STYLES[c.status] || ""}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-terminal-green h-7 text-xs"
                              onClick={() => approveCommission({ commissionId: c._id })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-terminal-red h-7 text-xs"
                              onClick={() => rejectCommission({ commissionId: c._id })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {c.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 h-7 text-xs"
                            onClick={() => markPaid({ commissionId: c._id })}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs font-mono">
                      No commissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollableTable>
        </CardContent>
      </Card>
    </div>
  );
}
