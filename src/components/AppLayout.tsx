import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["ceo", "manager", "finance_staff", "cashier"] },
  { to: "/clients", icon: Users, label: "Clients", roles: ["ceo", "manager", "finance_staff", "cashier"] },
  { to: "/contracts", icon: FileText, label: "Contracts", roles: ["ceo", "manager", "finance_staff"] },
  { to: "/payments", icon: CreditCard, label: "Payments", roles: ["ceo", "manager", "finance_staff", "cashier"] },
  { to: "/receipts", icon: Receipt, label: "Receipts", roles: ["ceo", "manager", "finance_staff", "cashier"] },
];

const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  finance_staff: "Finance Staff",
  cashier: "Cashier",
  manager: "Manager",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const roleData = useQuery(api.users.hasRole);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const userRole = roleData?.role ?? "ceo";
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  // Bottom nav items (always show first 5 for mobile)
  const bottomNavItems = visibleNav.slice(0, 5);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground truncate">
                LifePlan
              </span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                v1.0
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-border px-3 py-3">
          {!collapsed && (
            <div className="mb-2 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.name || user?.email || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {ROLE_LABELS[userRole] || userRole}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`w-full text-muted-foreground hover:text-foreground ${collapsed ? "px-0" : ""}`}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2 text-xs">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-terminal-green/10 flex items-center justify-center">
            <span className="text-terminal-green font-bold text-[10px] font-mono">LP</span>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">LifePlan</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {ROLE_LABELS[userRole] || userRole}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed top-[52px] left-0 right-0 z-50 bg-sidebar border-b border-border shadow-lg">
            <nav className="py-2 px-2">
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.name || user?.email || "User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {ROLE_LABELS[userRole] || userRole}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-[52px]" />

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sidebar">
        <div className="flex items-center justify-around py-1.5 px-1">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md min-w-0 transition-colors ${
                  isActive
                    ? "text-terminal-green"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span className="text-[9px] font-medium truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
