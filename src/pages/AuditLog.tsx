import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  User,
  FileText,
  CreditCard,
  Users,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const ACTION_COLORS: Record<string, string> = {
  create: "terminal-status-current",
  update: "terminal-status-delinquent",
  delete: "terminal-status-claim",
  status_change: "terminal-status-paid",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Status Changed",
};

const ENTITY_ICONS: Record<string, typeof Users> = {
  client: Users,
  contract: FileText,
  payment: CreditCard,
  receipt: FileText,
};

export default function AuditLog() {
  const [limit, setLimit] = useState(50);
  
  const logs = useQuery(api.audit.list, { limit });

  if (!logs) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground font-mono">Loading audit log...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-xs text-muted-foreground font-mono">
            &gt; system.audit.trail — {logs.length} entries
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-mono"
          onClick={() => setLimit(limit + 50)}
        >
          <RefreshCw className="h-4 w-4" />
          Load More
        </Button>
      </div>

      {/* Log Entries */}
      {logs.length === 0 ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="py-8 text-center">
            <History className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground font-mono">
              No audit entries yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const Icon = ENTITY_ICONS[log.entityType] || FileText;
            return (
              <Card key={log._id} className="border-border/60 shadow-none">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${ACTION_COLORS[log.action] || ""}`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {log.entityType}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{log.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.userName}
                        </span>
                        <span className="font-mono">
                          {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>

                      {/* Show old/new values if available */}
                      {log.oldValues && log.newValues && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                          <div className="flex gap-4">
                            {log.oldValues.contractStatus && (
                              <span className="text-muted-foreground">
                                <span className="line-through">{log.oldValues.contractStatus}</span>
                                {" → "}
                                <span className="text-terminal-green font-medium">
                                  {log.newValues.contractStatus}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
