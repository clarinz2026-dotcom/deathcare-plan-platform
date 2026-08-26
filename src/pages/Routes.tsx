import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Users,
  Truck,
  Trash2,
  UserPlus,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Id } from "@/convex/_generated/dataModel";

export default function RoutesPage() {
  const routes = useQuery(api.collectorRoutes.list);
  const allClients = useQuery(api.clients.list, {});
  const createRoute = useMutation(api.collectorRoutes.create);
  const deleteRoute = useMutation(api.collectorRoutes.remove);
  const addClientToRoute = useMutation(api.collectorRoutes.addClient);
  const removeClientFromRoute = useMutation(api.collectorRoutes.removeClient);
  const autoAssign = useMutation(api.collectorRoutes.autoAssign);
  const navigate = useNavigate();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState<string | null>(null);
  const [showAddClientDialog, setShowAddClientDialog] = useState<string | null>(null);

  // Create form
  const [routeName, setRouteName] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [notes, setNotes] = useState("");
  const [collectorId, setCollectorId] = useState<string>("");

  // Add client form
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [stopOrder, setStopOrder] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState("");

  if (!routes || !allClients) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleCreateRoute = async () => {
    if (!routeName || !area) return;
    await createRoute({
      routeName,
      area,
      city: city || undefined,
      province: province || undefined,
      assignedCollector: collectorId ? (collectorId as Id<"users">) : undefined,
      frequency,
      notes: notes || undefined,
    });
    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setRouteName("");
    setArea("");
    setCity("");
    setProvince("");
    setFrequency("daily");
    setNotes("");
    setCollectorId("");
  };

  const handleAddClient = async (routeId: string) => {
    if (!selectedClientId) return;
    await addClientToRoute({
      routeId: routeId as Id<"collector_routes">,
      clientId: selectedClientId as Id<"clients">,
      stopOrder,
      estimatedTime: estimatedTime || undefined,
    });
    setShowAddClientDialog(null);
    setSelectedClientId("");
    setStopOrder(1);
    setEstimatedTime("");
  };

  const handleAutoAssign = async (routeId: string) => {
    const result = await autoAssign({
      routeId: routeId as Id<"collector_routes">,
    });
    alert(`Auto-assigned ${result.added} client(s) to this route.`);
  };

  const handleDelete = async (routeId: string) => {
    if (confirm("Delete this route and all its assignments?")) {
      await deleteRoute({ routeId: routeId as Id<"collector_routes"> });
    }
  };

  const activeRoutes = routes.filter((r) => r.isActive);
  const inactiveRoutes = routes.filter((r) => !r.isActive);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">&gt; Collector Routes</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Manage field collector assignments and stop routing
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono text-sm">
              <Plus className="h-4 w-4" /> New Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="font-mono">&gt; Create Route</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono">Route Name *</Label>
                <Input
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. Manila East Morning Run"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Area *</Label>
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Manila East"
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-mono">City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Auto-assign filter"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono">Province</Label>
                  <Input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Auto-assign filter"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly" | "monthly")}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Assigned Collector</Label>
                <Select value={collectorId} onValueChange={setCollectorId}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Select collector..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Unassigned)</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="finance_staff">Finance Staff</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="font-mono text-sm"
                />
              </div>
              <Button
                className="w-full font-mono"
                onClick={handleCreateRoute}
                disabled={!routeName || !area}
              >
                Create Route
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Routes", value: routes.length, icon: Truck },
          { label: "Active Routes", value: activeRoutes.length, icon: MapPin },
          { label: "Assigned Collectors", value: new Set(routes.filter((r) => r.assignedCollector).map((r) => r.assignedCollector)).size, icon: Users },
          { label: "Total Stops", value: routes.reduce((sum, r) => sum + r.clientCount, 0), icon: MapPin },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold font-mono">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Routes */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          &gt; Active Routes ({activeRoutes.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRoutes.map((route) => (
            <Card key={route._id} className="hover:border-terminal-green/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-mono truncate">{route.routeName}</CardTitle>
                    <CardDescription className="text-xs font-mono flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {route.area}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
                    {route.frequency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Collector info */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Collector:</span>
                  <span className="text-foreground font-medium">{route.collectorName}</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                    <span>{route.completedCount}/{route.clientCount} stops completed</span>
                    <span>
                      {route.clientCount > 0
                        ? Math.round((route.completedCount / route.clientCount) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-terminal-green rounded-full transition-all"
                      style={{
                        width: `${route.clientCount > 0 ? (route.completedCount / route.clientCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Location details */}
                {(route.city || route.province) && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {route.city && `City: ${route.city}`}
                    {route.city && route.province && " · "}
                    {route.province && `Province: ${route.province}`}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-mono gap-1"
                    onClick={() => navigate(`/routes/${route._id}`)}
                  >
                    View <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-mono gap-1"
                    onClick={() => setShowAddClientDialog(route._id)}
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-mono gap-1 text-terminal-amber"
                    onClick={() => handleAutoAssign(route._id)}
                    title="Auto-assign clients by city/province"
                  >
                    <Zap className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-mono text-destructive"
                    onClick={() => handleDelete(route._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Inactive Routes */}
      {inactiveRoutes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            &gt; Inactive Routes ({inactiveRoutes.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveRoutes.map((route) => (
              <Card key={route._id} className="opacity-60">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-mono truncate">{route.routeName}</CardTitle>
                      <CardDescription className="text-xs font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {route.area}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
                      inactive
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-mono text-destructive"
                      onClick={() => handleDelete(route._id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {routes.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-mono text-muted-foreground">No routes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a route to start assigning collectors to client stops.
          </p>
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog
        open={showAddClientDialog !== null}
        onOpenChange={(open) => {
          if (!open) setShowAddClientDialog(null);
        }}
      >
        <DialogContent className="max-w-md mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="font-mono">&gt; Add Client to Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono">Client *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="font-mono text-sm">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {allClients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-mono">Stop Order</Label>
                <Input
                  type="number"
                  value={stopOrder}
                  onChange={(e) => setStopOrder(parseInt(e.target.value) || 1)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono">Est. Time</Label>
                <Input
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="9:00 AM"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button
              className="w-full font-mono"
              onClick={() => showAddClientDialog && handleAddClient(showAddClientDialog)}
              disabled={!selectedClientId}
            >
              Add to Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
