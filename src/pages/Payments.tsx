import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Plus, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollableTable } from "@/components/ScrollableTable";

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function Payments() {
  const payments = useQuery(api.payments.list, {});
  const contracts = useQuery(api.contracts.list, {});
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const recordPayment = useMutation(api.payments.record);

  const [form, setForm] = useState({
    contractId: "",
    amount: "",
    paymentChannel: "cash" as
      | "cash"
      | "gcash"
      | "maya"
      | "bank_transfer"
      | "check",
    paymentDate: new Date().toISOString().split("T")[0],
    orNumber: "",
    referenceNumber: "",
    chequeNumber: "",
    bankName: "",
    remarks: "",
  });

  // Filter active contracts for selection
  const activeContracts =
    contracts?.filter((c) => c.contractStatus !== "fully_paid") || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await recordPayment({
        contractId: form.contractId as any,
        amount: Number(form.amount),
        paymentChannel: form.paymentChannel,
        paymentDate: form.paymentDate
          ? new Date(form.paymentDate).getTime()
          : Date.now(),
        orNumber: form.orNumber || undefined,
        referenceNumber: form.referenceNumber || undefined,
        chequeNumber: form.chequeNumber || undefined,
        bankName: form.bankName || undefined,
        remarks: form.remarks || undefined,
      });
      toast.success(`Payment recorded! Receipt: ${result.receiptNumber}`);
      setDialogOpen(false);
      setForm({
        contractId: "",
        amount: "",
        paymentChannel: "cash",
        paymentDate: new Date().toISOString().split("T")[0],
        orNumber: "",
        referenceNumber: "",
        chequeNumber: "",
        bankName: "",
        remarks: "",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-terminal-green">&gt;</span> Payments
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {payments?.length || 0} total payment{(payments?.length || 0) !== 1 && "s"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Record Payment</span>
              <span className="sm:hidden">Record</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="font-mono">
                <span className="text-terminal-green">$</span> Record Payment
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Contract *</Label>
                <select
                  value={form.contractId}
                  onChange={(e) =>
                    setForm({ ...form, contractId: e.target.value })
                  }
                  className="font-mono text-sm bg-background border border-border rounded-md h-9 px-2 w-full"
                  required
                >
                  <option value="">Select contract...</option>
                  {activeContracts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.contractNumber} — {c.client?.lastName},{" "}
                      {c.client?.firstName} — {c.planType} (
                      {formatPHP(c.planAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Amount (₱) *</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Channel *</Label>
                  <select
                    value={form.paymentChannel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentChannel: e.target.value as typeof form.paymentChannel,
                      })
                    }
                    className="font-mono text-sm bg-background border border-border rounded-md h-9 px-2 w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment Date *</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm({ ...form, paymentDate: e.target.value })
                  }
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Reference Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {form.paymentChannel === "check" && (
                    <>
                      <div>
                        <Label className="text-xs">Cheque Number</Label>
                        <Input
                          value={form.chequeNumber}
                          onChange={(e) =>
                            setForm({ ...form, chequeNumber: e.target.value })
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bank Name</Label>
                        <Input
                          value={form.bankName}
                          onChange={(e) =>
                            setForm({ ...form, bankName: e.target.value })
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                    </>
                  )}
                  {(form.paymentChannel === "gcash" ||
                    form.paymentChannel === "maya" ||
                    form.paymentChannel === "bank_transfer") && (
                    <div className="col-span-2">
                      <Label className="text-xs">Reference Number</Label>
                      <Input
                        value={form.referenceNumber}
                        onChange={(e) =>
                          setForm({ ...form, referenceNumber: e.target.value })
                        }
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs">Remarks</Label>
                <Input
                  value={form.remarks}
                  onChange={(e) =>
                    setForm({ ...form, remarks: e.target.value })
                  }
                  placeholder="Optional notes..."
                  className="font-mono text-sm"
                />
              </div>

              <Button type="submit" className="w-full">
                Record Payment & Issue Receipt
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment table */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Date
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Client
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Contract
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Channel
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  OR #
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!payments ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm font-mono">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-mono">
                      No payments recorded yet
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow
                    key={p._id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs">
                      {format(new Date(p.paymentDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {p.client
                          ? `${p.client.lastName}, ${p.client.firstName}`
                          : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.contract?.contractNumber || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {p.paymentChannel.toUpperCase().replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.orNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-terminal-green">
                        {formatPHP(p.amount)}
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
    </div>
  );
}
