import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface PlanFormState {
  name: string;
  price: string;
  monthlyRate: string;
}

const EMPTY_FORM: PlanFormState = { name: "", price: "", monthlyRate: "" };

const peso = (n: number) => `₱${n.toLocaleString()}`;

export default function Plans() {
  const roleData = useQuery(api.users.hasRole);
  const plans = useQuery(api.plans.list) ?? [];
  const contracts = useQuery(api.contracts.list) ?? [];

  const createPlan = useMutation(api.plans.create);
  const updatePlan = useMutation(api.plans.update);
  const removePlan = useMutation(api.plans.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ _id: string; name: string; price: number; monthlyRate?: number } | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = roleData?.role === "super_admin" || roleData?.role === "ceo";

  // Contract usage per plan (case-insensitive name match, like bulk import).
  const contractCountByPlan = (planName: string) =>
    contracts.filter(
      (c) => c.planType.toLowerCase().trim() === planName.toLowerCase().trim(),
    ).length;

  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (plan: (typeof plans)[number]) => {
    setEditingPlan({
      _id: plan._id,
      name: plan.name,
      price: plan.price,
      monthlyRate: plan.monthlyRate,
    });
    setForm({
      name: plan.name,
      price: String(plan.price),
      monthlyRate: plan.monthlyRate ? String(plan.monthlyRate) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const price = parseFloat(form.price.replace(/,/g, ""));
    const monthlyRate = form.monthlyRate.trim()
      ? parseFloat(form.monthlyRate.replace(/,/g, ""))
      : undefined;

    if (!name) {
      toast.error("Plan name is required.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid total price greater than 0.");
      return;
    }
    if (monthlyRate !== undefined && (isNaN(monthlyRate) || monthlyRate <= 0)) {
      toast.error("Enter a valid monthly rate, or leave it blank.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingPlan) {
        await updatePlan({
          planId: editingPlan._id as any,
          name,
          price,
          monthlyRate: monthlyRate ?? undefined,
        });
        toast.success(`Plan "${name}" updated.`);
      } else {
        await createPlan({ name, price, monthlyRate: monthlyRate ?? undefined });
        toast.success(`Plan "${name}" created.`);
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: (typeof plans)[number]) => {
    setIsDeleting(true);
    try {
      await removePlan({ planId: plan._id as any });
      toast.success(`Plan "${plan.name}" removed.`);
      setDeletingId(null);
    } catch (error: any) {
      toast.error(error?.message || "Could not remove the plan.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!roleData) {
    return <div className="p-6 text-sm text-muted-foreground font-mono">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          Only the Super Admin or CEO can manage plans.
        </p>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.isActive !== false).length;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-terminal-green/10 flex items-center justify-center">
          <Package className="h-5 w-5 text-terminal-green" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
          <p className="text-xs text-muted-foreground">
            Plan types (e.g. Isidore, Gabriel, Raphael, Michael). When a bulk
            upload row has a matching plan type, a contract is created
            automatically using the plan's price.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Total Plans
            </p>
            <p className="text-2xl font-bold mt-1">{plans.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Active Plans
            </p>
            <p className="text-2xl font-bold mt-1 text-terminal-green">
              {activePlans}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Contracts on Plans
            </p>
            <p className="text-2xl font-bold mt-1">{contracts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-terminal-green" />
        <p>
          Plan names are matched <span className="font-medium text-foreground">case-insensitively</span>{" "}
          against the "Plan Type" column during bulk upload. The monthly rate
          is used as the default for backdated payments when a row has months
          paid but no Amount — you can still override it per row in the upload
          preview (e.g. 250 or 500 for old-price clients).
        </p>
      </div>

      {/* Plans table */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Plan Catalog ({plans.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {plans.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground font-mono">
                No plans yet — add your first plan to start auto-creating
                contracts on bulk upload.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {["Plan Name", "Total Price", "Monthly Rate", "Contracts", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const usage = contractCountByPlan(plan.name);
                  const isActive = plan.isActive !== false;
                  return (
                    <tr key={plan._id} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                        {plan.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {peso(plan.price)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {plan.monthlyRate ? peso(plan.monthlyRate) : "—"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">
                        {usage > 0 ? (
                          <Badge variant="outline" className="text-[10px] font-mono terminal-status-current">
                            {usage}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isActive ? (
                          <Badge variant="outline" className="text-[10px] font-mono terminal-status-current">
                            active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-mono terminal-status-claim">
                            inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(plan)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingId(plan._id as any)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              <span className="text-terminal-green">$</span>{" "}
              {editingPlan ? "Edit Plan" : "New Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update the plan name or pricing."
                : "Create a plan type that bulk upload can match against."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Plan Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Isidore"
                className="font-mono text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Total Price (₱) *</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 15000"
                  className="font-mono text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Monthly Rate (₱) — optional</Label>
                <Input
                  type="number"
                  value={form.monthlyRate}
                  onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })}
                  placeholder="e.g. 250"
                  className="font-mono text-sm mt-1"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              The monthly rate is the default per-payment amount for backdated
              payments when a bulk row has months paid but no Amount.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              <span className="text-terminal-amber">$</span> Remove Plan?
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const plan = plans.find((p) => String(p._id) === deletingId);
                if (!plan) return null;
                const usage = contractCountByPlan(plan.name);
                return usage > 0
                  ? `"${plan.name}" is used by ${usage} contract${usage !== 1 ? "s" : ""} and cannot be removed. You can deactivate it instead.`
                  : `This permanently removes "${plan.name}" from the plan catalog. Existing contracts are not affected.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const plan = plans.find((p) => String(p._id) === deletingId);
                if (plan) handleDelete(plan);
              }}
              disabled={isDeleting || contractCountByPlan(plans.find((p) => String(p._id) === deletingId)?.name ?? "") > 0}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}