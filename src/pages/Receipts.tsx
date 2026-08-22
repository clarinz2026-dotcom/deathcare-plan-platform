import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt as ReceiptIcon, Printer } from "lucide-react";
import { ScrollableTable } from "@/components/ScrollableTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CHANNEL_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank Transfer",
  check: "Check",
};

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function Receipts() {
  const receipts = useQuery(api.receipts.list, {});
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-terminal-green">&gt;</span> Receipts
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Official receipts issued for payments
        </p>
      </div>

      {/* Receipt table */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Receipt #
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Date
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Issued To
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Plan
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Channel
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!receipts ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm font-mono">
                    Loading receipts...
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <ReceiptIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-mono">
                      No receipts issued yet
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((r) => (
                  <TableRow
                    key={r._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedReceipt(r)}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {r.receiptNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(r.paymentDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{r.issuedTo}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.planType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {CHANNEL_LABELS[r.paymentChannel] || r.paymentChannel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          r.status === "active"
                            ? "terminal-status-current"
                            : r.status === "cancelled"
                              ? "terminal-status-claim"
                              : "text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-terminal-green">
                        {formatPHP(r.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </ScrollableTable>
        </CardContent>
      </Card>

      {/* Receipt detail dialog */}
      <Dialog
        open={!!selectedReceipt}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
      >
        <DialogContent className="max-w-md mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              Official Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="border border-border rounded-lg p-6 space-y-4 bg-white">
              {/* Receipt header */}
              <div className="text-center border-b border-border pb-4">
                <h3 className="font-bold text-lg tracking-tight">LifePlan</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Pre-Need Deathcare Services
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Official Receipt
                </p>
              </div>

              {/* Receipt number */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Receipt No.
                  </p>
                  <p className="font-mono text-sm font-bold">
                    {selectedReceipt.receiptNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Date
                  </p>
                  <p className="font-mono text-sm">
                    {format(
                      new Date(selectedReceipt.paymentDate),
                      "MMMM d, yyyy"
                    )}
                  </p>
                </div>
              </div>

              {/* Client info */}
              <div className="space-y-1 border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Received From
                </p>
                <p className="text-sm font-medium">{selectedReceipt.issuedTo}</p>
              </div>

              {/* Plan info */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Contract
                </p>
                <p className="text-sm font-mono">
                  {selectedReceipt.contractNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedReceipt.planType}
                </p>
              </div>

              {/* Amount */}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-baseline">
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Amount Paid
                  </p>
                  <p className="font-mono text-xl font-bold text-terminal-green">
                    {formatPHP(selectedReceipt.amount)}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-1">
                  via {CHANNEL_LABELS[selectedReceipt.paymentChannel] || selectedReceipt.paymentChannel}
                </p>
              </div>

              {/* Status */}
              <div className="text-center pt-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    selectedReceipt.status === "active"
                      ? "terminal-status-current"
                      : "terminal-status-claim"
                  }`}
                >
                  {selectedReceipt.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
