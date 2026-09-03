import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Search,
  Plus,
  Users,
  ArrowRight,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScrollableTable } from "@/components/ScrollableTable";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  current: "Current",
  delinquent_30: "30 Days Late",
  delinquent_60: "60 Days Late",
  delinquent_90: "90 Days Late",
  lapsed: "Lapsed",
  fully_paid: "Fully Paid",
  assigned_death_claim: "Death Claim",
  no_contract: "No Contract",
};

const STATUS_COLORS: Record<string, string> = {
  current: "terminal-status-current",
  delinquent_30: "terminal-status-delinquent",
  delinquent_60: "terminal-status-delinquent",
  delinquent_90: "terminal-status-claim",
  lapsed: "terminal-status-claim",
  fully_paid: "terminal-status-paid",
  assigned_death_claim: "terminal-status-claim",
  no_contract: "text-muted-foreground",
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "current", label: "Current" },
  { key: "delinquent_30", label: "30 Days Late" },
  { key: "delinquent_60", label: "60 Days Late" },
  { key: "delinquent_90", label: "90 Days Late" },
  { key: "lapsed", label: "Lapsed" },
  { key: "fully_paid", label: "Fully Paid" },
  { key: "assigned_death_claim", label: "Death Claim" },
];

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PAGE_SIZE = 15;

/** Build a compact page-number list: first, last, and pages around the current one. */
function getPageItems(
  current: number,
  total: number,
): Array<number | "gap"> {
  const wanted = new Set<number>();
  for (let p = 0; p < total; p++) {
    if (p === 0 || p === total - 1 || Math.abs(p - current) <= 1) wanted.add(p);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  let prev: number | null = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) items.push("gap");
    items.push(p);
    prev = p;
  }
  return items;
}

export default function Clients() {
  const clientsWithStatus = useQuery(api.clients.listWithStatus, {});
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Multi-select / bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state (15 per page)
  const [page, setPage] = useState(0);

  // Go back to page 1 whenever the search or status tab changes
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const bulkDelete = useMutation(api.clients.bulkDelete);

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

  const toggleClient = (clientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await bulkDelete({
        clientIds: [...selectedIds] as any,
      });
      toast.success(`Deleted ${result.deleted} client${result.deleted !== 1 ? "s" : ""}.`);
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not delete the selected clients.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter clients by search and computed status
  const filteredClients = clientsWithStatus?.filter((item) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        item.client.lastName.toLowerCase().includes(q) ||
        item.client.firstName.toLowerCase().includes(q) ||
        item.client.contactNumber.includes(q);
      if (!matchesSearch) return false;
    }
    // Status filter
    if (statusFilter !== "all") {
      if (item.computedStatus !== statusFilter) return false;
    }
    return true;
  });

  // Count clients per computed status for badge counts
  const statusCounts: Record<string, number> = {};
  if (clientsWithStatus) {
    for (const item of clientsWithStatus) {
      statusCounts[item.computedStatus] = (statusCounts[item.computedStatus] || 0) + 1;
    }
  }
  const clientCount = clientsWithStatus?.length || 0;

  const selectedNames = (clientsWithStatus ?? [])
    .filter((item) => selectedIds.has(String(item.client._id)))
    .map((item) => `${item.client.lastName}, ${item.client.firstName}`);

  // Pagination over the filtered list (15 per page)
  const totalFiltered = filteredClients?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageClients = filteredClients?.slice(pageStart, pageStart + PAGE_SIZE);
  const pageItems = getPageItems(currentPage, totalPages);

  // Selection helpers against the rows on the current page
  const pageClientIds = (pageClients ?? []).map((item) => String(item.client._id));
  const allVisibleSelected =
    pageClientIds.length > 0 && pageClientIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = pageClientIds.some((id) => selectedIds.has(id));

  const toggleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        pageClientIds.forEach((id) => next.delete(id));
      } else {
        pageClientIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-terminal-green">&gt;</span> Clients
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {clientCount} total client{clientCount !== 1 && "s"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Client</span>
              <span className="sm:hidden">New</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2 sm:mx-0">
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

      {/* Search + Status filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? clientCount
                : statusCounts[tab.key] || 0;
            return (
              <Button
                key={tab.key}
                variant={statusFilter === tab.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-mono gap-1.5"
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-4 min-w-4 px-1 text-[9px] font-mono"
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {selectedIds.size} client{selectedIds.size !== 1 ? "s" : ""} selected
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="h-7 text-xs"
          >
            Clear
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete ({selectedIds.size})
          </Button>
        </div>
      )}

      {/* Client table */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          <ScrollableTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                    }
                    onCheckedChange={toggleSelectVisible}
                    aria-label="Select all visible clients"
                  />
                </TableHead>
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm font-mono">
                    Loading clients...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-mono">
                      {search || statusFilter !== "all"
                        ? "No clients match your filters"
                        : "No clients yet. Add one to get started."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                (pageClients ?? []).map(({ client, contract, computedStatus, daysSincePayment }) => {
                  const isSelected = selectedIds.has(String(client._id));
                  return (
                    <TableRow
                      key={client._id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        isSelected ? "bg-terminal-green/5" : ""
                      }`}
                      onClick={() => navigate(`/clients/${client._id}`)}
                    >
                      <TableCell
                        className="w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleClient(String(client._id))}
                          aria-label={`Select ${client.lastName}, ${client.firstName}`}
                        />
                      </TableCell>
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
                        <p className="text-xs font-mono">
                          {client.contactNumber || "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {[client.city, client.province].filter(Boolean).join(", ") || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              STATUS_COLORS[computedStatus] || ""
                            }`}
                          >
                            {STATUS_LABELS[computedStatus] || computedStatus.replace(/_/g, " ")}
                          </Badge>
                          {daysSincePayment !== null && computedStatus !== "no_contract" && (
                            <p className="text-[10px] text-muted-foreground">
                              {daysSincePayment}d since last payment
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contract ? (
                          <div>
                            <p className="text-xs">{contract.planType}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {formatPHP(contract.monthlyAmortization)}/mo
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
          </ScrollableTable>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground font-mono">
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalFiltered)} of{" "}
                {totalFiltered}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {pageItems.map((item, idx) =>
                  item === "gap" ? (
                    <span key={`gap-${idx}`} className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-7 min-w-7 px-2 text-xs font-mono"
                      onClick={() => setPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              <span className="text-terminal-amber">$</span> Delete {selectedIds.size} Client{selectedIds.size !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                This permanently deletes the selected client records and their
                attached data:
              </p>
              <p className="font-mono text-xs">
                contracts · payments · receipts · payment schedules ·
                commissions · death claims · route stops
              </p>
              {selectedNames.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">
                    Selected
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 font-mono text-xs">
                    {selectedNames.slice(0, 8).map((name) => (
                      <div key={name}>• {name}</div>
                    ))}
                    {selectedNames.length > 8 && (
                      <div className="text-muted-foreground">
                        …and {selectedNames.length - 8} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-destructive font-medium pt-1">
                This action cannot be undone. Audit logs are kept for history.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete {selectedIds.size} Client{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
