import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Search, Plus, Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Clients() {
  const { user } = useAuth();
  const clients = useQuery(api.clients.list, {});
  const contracts = useQuery(api.contracts.list, {});
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    contactNumber: "",
    email: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    occupation: "",
    beneficiaryName: "",
    beneficiaryRelationship: "",
    beneficiaryContact: "",
  });

  const createClient = useMutation(api.clients.create);

  const filteredClients = clients?.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.lastName.toLowerCase().includes(q) ||
      c.firstName.toLowerCase().includes(q) ||
      c.contactNumber.includes(q)
    );
  });

  // Map client to their contract status
  const clientContracts = contracts
    ? Object.fromEntries(contracts.map((c) => [c.clientId, c]))
    : {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createClient({
      ...form,
      dateOfBirth: form.dateOfBirth
        ? new Date(form.dateOfBirth).getTime()
        : Date.now(),
      middleName: form.middleName || undefined,
      email: form.email || undefined,
      occupation: form.occupation || undefined,
      beneficiaryContact: form.beneficiaryContact || undefined,
    });
    setDialogOpen(false);
    setForm({
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: "male",
      contactNumber: "",
      email: "",
      address: "",
      city: "",
      province: "",
      zipCode: "",
      occupation: "",
      beneficiaryName: "",
      beneficiaryRelationship: "",
      beneficiaryContact: "",
    });
  };

  const inputClass =
    "font-mono text-sm bg-background border-border h-9 focus-visible:ring-terminal-green";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-terminal-green">&gt;</span> Clients
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {clients?.length || 0} total client{(clients?.length || 0) !== 1 && "s"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono">
                <span className="text-terminal-green">$</span> Add New Client
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Personal Info */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Personal Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Middle Name</Label>
                    <Input
                      value={form.middleName}
                      onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gender *</Label>
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value as typeof form.gender })
                      }
                      className="font-mono text-sm bg-background border border-border rounded-md h-9 px-2 w-full"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Contact Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Contact Number *</Label>
                    <Input
                      value={form.contactNumber}
                      onChange={(e) =>
                        setForm({ ...form, contactNumber: e.target.value })
                      }
                      placeholder="09XX-XXX-XXXX"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Address *</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">City *</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Province *</Label>
                    <Input
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ZIP Code *</Label>
                    <Input
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Beneficiary */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Beneficiary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Beneficiary Name *</Label>
                    <Input
                      value={form.beneficiaryName}
                      onChange={(e) =>
                        setForm({ ...form, beneficiaryName: e.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Relationship *</Label>
                    <Input
                      value={form.beneficiaryRelationship}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          beneficiaryRelationship: e.target.value,
                        })
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Create Client
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 font-mono text-sm"
        />
      </div>

      {/* Client table */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Client
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono">
                  Plan
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-mono text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredClients ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm font-mono">
                    Loading clients...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-mono">
                      {search ? "No clients match your search" : "No clients yet. Add one to get started."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => {
                  const contract = clientContracts[client._id];
                  return (
                    <TableRow
                      key={client._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/clients/${client._id}`)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">
                          {client.lastName}, {client.firstName}
                        </p>
                        {client.middleName && (
                          <p className="text-[11px] text-muted-foreground">
                            {client.middleName}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-mono">{client.contactNumber}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {client.city}, {client.province}
                        </p>
                      </TableCell>
                      <TableCell>
                        {contract ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              contract.contractStatus === "current"
                                ? "terminal-status-current"
                                : contract.contractStatus === "fully_paid"
                                  ? "terminal-status-paid"
                                  : contract.contractStatus.startsWith("delinquent")
                                    ? "terminal-status-delinquent"
                                    : contract.contractStatus === "lapsed"
                                      ? "terminal-status-lapsed"
                                      : "terminal-status-claim"
                            }`}
                          >
                            {contract.contractStatus.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            No contract
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contract ? (
                          <div>
                            <p className="text-xs">{contract.planType}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              ₱{contract.monthlyAmortization.toLocaleString()}/mo
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                          View <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
