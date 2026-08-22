import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, CreditCard, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const client = useQuery(
    api.clients.get,
    clientId ? { clientId: clientId as any } : "skip"
  );
  const contracts = useQuery(
    api.contracts.list,
    clientId ? { clientId: clientId as any } : {}
  );
  const payments = useQuery(
    api.payments.list,
    clientId ? { clientId: clientId as any } : {}
  );

  const createContract = useMutation(api.contracts.create);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    contractNumber: "",
    planType: "",
    planAmount: "",
    monthlyAmortization: "",
    startDate: "",
  });

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground font-mono">Loading client...</p>
      </div>
    );
  }

  const fullName = client.middleName
    ? `${client.lastName}, ${client.firstName} ${client.middleName}`
    : `${client.lastName}, ${client.firstName}`;

  const clientContracts = contracts || [];
  const clientPayments = payments || [];

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    await createContract({
      clientId: clientId as any,
      contractNumber: contractForm.contractNumber,
      planType: contractForm.planType,
      planAmount: Number(contractForm.planAmount),
      monthlyAmortization: Number(contractForm.monthlyAmortization),
      startDate: contractForm.startDate
        ? new Date(contractForm.startDate).getTime()
        : Date.now(),
    });
    setContractDialogOpen(false);
    setContractForm({
      contractNumber: "",
      planType: "",
      planAmount: "",
      monthlyAmortization: "",
      startDate: "",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {client.contactNumber} · {client.city}, {client.province}
          </p>
        </div>
      </div>

      {/* Client info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Personal */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              Personal Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-medium">{fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-mono text-xs">
                {format(new Date(client.dateOfBirth), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gender</span>
              <span className="capitalize">{client.gender}</span>
            </div>
            {client.occupation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Occupation</span>
                <span>{client.occupation}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-mono text-xs">{client.contactNumber}</span>
            </div>
            {client.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-xs">{client.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-xs text-right max-w-[200px]">
                {client.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">City / Province</span>
              <span className="text-xs">
                {client.city}, {client.province}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Beneficiary */}
        <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
              Beneficiary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{client.beneficiaryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationship</span>
              <span>{client.beneficiaryRelationship}</span>
            </div>
            {client.beneficiaryContact && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span className="font-mono text-xs">
                  {client.beneficiaryContact}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contracts section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Contracts ({clientContracts.length})
        </h2>
        <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono">
                <span className="text-terminal-green">$</span> New Contract
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleContractSubmit} className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Contract Number *</Label>
                <Input
                  value={contractForm.contractNumber}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, contractNumber: e.target.value })
                  }
                  placeholder="e.g. CTR-2024-0001"
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Plan Type *</Label>
                <Input
                  value={contractForm.planType}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, planType: e.target.value })
                  }
                  placeholder="e.g. Memorial Plan A"
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Total Plan Amount (₱) *</Label>
                  <Input
                    type="number"
                    value={contractForm.planAmount}
                    onChange={(e) =>
                      setContractForm({ ...contractForm, planAmount: e.target.value })
                    }
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Monthly (₱) *</Label>
                  <Input
                    type="number"
                    value={contractForm.monthlyAmortization}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        monthlyAmortization: e.target.value,
                      })
                    }
                    className="font-mono text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Start Date *</Label>
                <Input
                  type="date"
                  value={contractForm.startDate}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, startDate: e.target.value })
                  }
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create Contract
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clientContracts.length === 0 ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-mono">
              No contracts yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clientContracts.map((contract) => {
            const progress = contract.planAmount
              ? Math.min((contract.totalPaid / contract.planAmount) * 100, 100)
              : 0;
            return (
              <Card key={contract._id} className="border-border/60 shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">
                      {contract.contractNumber}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        STATUS_COLORS[contract.contractStatus] || ""
                      }`}
                    >
                      {contract.contractStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Plan
                      </p>
                      <p className="font-medium">{contract.planType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Monthly
                      </p>
                      <p className="font-mono text-sm">
                        {formatPHP(contract.monthlyAmortization)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Total
                      </p>
                      <p className="font-mono text-sm">
                        {formatPHP(contract.planAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        Paid
                      </p>
                      <p className="font-mono text-sm text-terminal-green font-bold">
                        {formatPHP(contract.totalPaid)}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terminal-green rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right font-mono">
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Started:{" "}
                    {format(new Date(contract.startDate), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payments section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          Payment History ({clientPayments.length})
        </h2>
      </div>

      {clientPayments.length === 0 ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="py-8 text-center">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-mono">
              No payments recorded
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Contract
                  </th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Channel
                  </th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    OR #
                  </th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientPayments.map((p) => (
                  <tr key={p._id} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 px-4 font-mono text-xs">
                      {format(new Date(p.paymentDate), "MMM d, yyyy")}
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {p.contract?.contractNumber || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {p.paymentChannel.toUpperCase().replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {p.orNumber || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-terminal-green">
                      {formatPHP(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
