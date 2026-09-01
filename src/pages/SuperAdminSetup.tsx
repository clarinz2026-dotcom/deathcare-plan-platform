import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Crown, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminSetup() {
  const hasSuperAdmin = useQuery(api.users.hasSuperAdmin);
  const roleData = useQuery(api.users.hasRole);
  const claimSuperAdmin = useMutation(api.users.claimSuperAdmin);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Already has super admin role
  if (roleData?.role === "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center">
          <Crown className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold">You are the Super Admin</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You have full system access. Go to Role Management to assign roles to other users.
        </p>
        <Button onClick={() => navigate("/role-management")} className="gap-2 mt-2">
          Go to Role Management
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Loading
  if (!hasSuperAdmin || !roleData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Super admin already claimed by someone else
  if (hasSuperAdmin.hasSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold">Super Admin Already Assigned</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          A Super Admin has already been set up for this system. Please contact them to get your role assigned.
        </p>
      </div>
    );
  }

  const handleClaim = async () => {
    setLoading(true);
    try {
      await claimSuperAdmin();
      setClaimed(true);
      toast.success("You are now the Super Admin!");
    } catch (error: any) {
      toast.error(error.message || "Failed to claim Super Admin role");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (claimed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Super Admin Activated!</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You now have full control over the system. Start by assigning roles to your team members.
        </p>
        <Button onClick={() => navigate("/role-management")} className="gap-2 mt-2">
          Set Up Team Roles
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // First-time claim screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <div className="text-center space-y-2">
        <div className="h-20 w-20 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
          <Crown className="h-10 w-10 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Super Admin Setup</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          This is the first time the app is being set up. You can claim the <strong>Super Admin</strong> role —
          only <strong>one person</strong> can be Super Admin. This is irreversible.
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded bg-purple-100 flex items-center justify-center mt-0.5">
              <Crown className="h-3 w-3 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Full System Control</p>
              <p className="text-xs text-muted-foreground">
                Access all pages, data, and settings
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded bg-blue-100 flex items-center justify-center mt-0.5">
              <ShieldCheck className="h-3 w-3 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Manage All Users</p>
              <p className="text-xs text-muted-foreground">
                Assign and change roles for every user
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center mt-0.5">
              <ArrowRight className="h-3 w-3 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Cannot Be Changed</p>
              <p className="text-xs text-muted-foreground">
                Your Super Admin role is permanent and protected
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleClaim}
          disabled={loading}
          className="w-full gap-2"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Crown className="h-4 w-4" />
              Claim Super Admin Role
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Signed in as: {roleData?.role ? "has account" : "new user"}
        </p>
      </div>
    </div>
  );
}
