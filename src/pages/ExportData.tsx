import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Users,
  FileText,
  CreditCard,
  Receipt,
} from "lucide-react";

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function ExportData() {
  const clients = useQuery(api.clients.list, {});
  const contracts = useQuery(api.contracts.list, {});
  const payments = useQuery(api.payments.list, {});
  const receipts = useQuery(api.receipts.list, {});

  const handleExportAll = async () => {
    const XLSX = await import("xlsx");

    // Clients sheet
    const clientRows = [
      ["Client Export"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["First Name", "Last Name", "Middle Name", "Contact", "Email", "Address", "City", "Province", "Zip", "Beneficiary", "Relationship"],
      ...(clients?.map((c) => [
        c.firstName, c.lastName, c.middleName || "", c.contactNumber,
        c.email || "", c.address, c.city, c.province, c.zipCode,
        c.beneficiaryName, c.beneficiaryRelationship,
      ]) || []),
    ];

    // Contracts sheet
    const contractRows = [
      ["Contract Export"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["Contract #", "Client ID", "Plan Type", "Plan Amount", "Monthly", "Total Paid", "Balance", "Status", "Start Date", "Maturity Date"],
      ...(contracts?.map((c) => [
        c.contractNumber, c.clientId, c.planType, c.planAmount,
        c.monthlyAmortization, c.totalPaid, c.planAmount - c.totalPaid,
        c.contractStatus,
        new Date(c.startDate).toLocaleDateString(),
        c.maturityDate ? new Date(c.maturityDate).toLocaleDateString() : "",
      ]) || []),
    ];

    // Payments sheet
    const paymentRows = [
      ["Payment Export"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["OR #", "Contract #", "Amount", "Channel", "Date", "Reference", "Remarks"],
      ...(payments?.map((p) => [
        p.orNumber || "", p.contractId, formatPHP(p.amount),
        p.paymentChannel, new Date(p.paymentDate).toLocaleDateString(),
        p.referenceNumber || p.chequeNumber || "", p.remarks || "",
      ]) || []),
    ];

    // Receipts sheet
    const receiptRows = [
      ["Receipt Export"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["Receipt #", "Contract #", "Amount", "Channel", "Issued To", "Plan Type", "Status", "Date"],
      ...(receipts?.map((r) => [
        r.receiptNumber, r.contractNumber, formatPHP(r.amount),
        r.paymentChannel, r.issuedTo, r.planType, r.status,
        new Date(r.createdAt).toLocaleDateString(),
      ]) || []),
    ];

    const wb = XLSX.utils.book_new();

    const wsClients = XLSX.utils.aoa_to_sheet(clientRows);
    wsClients["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsClients, "Clients");

    const wsContracts = XLSX.utils.aoa_to_sheet(contractRows);
    XLSX.utils.book_append_sheet(wb, wsContracts, "Contracts");

    const wsPayments = XLSX.utils.aoa_to_sheet(paymentRows);
    XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

    const wsReceipts = XLSX.utils.aoa_to_sheet(receiptRows);
    XLSX.utils.book_append_sheet(wb, wsReceipts, "Receipts");

    XLSX.writeFile(wb, `Evangelist_Funeral_Services_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const datasets = [
    { label: "Clients", icon: Users, count: clients?.length ?? 0, color: "text-terminal-green" },
    { label: "Contracts", icon: FileText, count: contracts?.length ?? 0, color: "text-blue-600" },
    { label: "Payments", icon: CreditCard, count: payments?.length ?? 0, color: "text-terminal-amber" },
    { label: "Receipts", icon: Receipt, count: receipts?.length ?? 0, color: "text-purple-600" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded bg-terminal-green/10 flex items-center justify-center">
          <Download className="h-4.5 w-4.5 text-terminal-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Download your entire database as Excel
          </p>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {datasets.map((d) => (
          <Card key={d.label}>
            <CardContent className="p-4 text-center">
              <d.icon className={`h-6 w-6 mx-auto mb-2 ${d.color}`} />
              <p className={`text-2xl font-bold ${d.color}`}>{d.count}</p>
              <p className="text-xs text-muted-foreground font-mono">{d.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Button */}
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <Download className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-mono font-medium">Export All Data</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Downloads an Excel file with separate sheets for Clients, Contracts, Payments, and Receipts
            </p>
          </div>
          <Button onClick={handleExportAll} className="gap-2 font-mono">
            <Download className="h-4 w-4" /> Download XLSX
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
