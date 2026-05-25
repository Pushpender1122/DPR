import { BellRing, Clock3, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { alertIndicatorClass, formatDateTime, severityStyles } from "@/lib/utils";
import type { AlertRecord } from "@/types";

interface AlertCardProps {
  alert: AlertRecord;
}

export function AlertCard({ alert }: AlertCardProps): JSX.Element {
  const Icon = alert.type === "LONE_WORKER_MISSED" ? ShieldAlert : alert.type === "MISSED_CLOCK_IN" ? Clock3 : BellRing;

  return (
    <Card className={`overflow-hidden border ${severityStyles(alert.severity)}`}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl ${alertIndicatorClass(alert)}`}>
          <Icon className="h-5 w-5 text-slate-950" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-white/10 bg-black/20 text-slate-100">
              {alert.severity}
            </Badge>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{alert.type.replace(/_/g, " ")}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{alert.message}</p>
            <p className="mt-1 text-sm text-slate-300">
              {alert.guardName} • {alert.siteName}
            </p>
          </div>
          <p className="text-xs text-slate-400">{formatDateTime(alert.createdAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
