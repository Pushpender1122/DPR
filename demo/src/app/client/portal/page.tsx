"use client";

import { Building2, FileClock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { TimesheetTable } from "@/components/client/TimesheetTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, formatDateTime } from "@/lib/utils";
import type { ClientPortalResponse } from "@/types";

export default function ClientPortalPage(): JSX.Element {
  const [data, setData] = useState<ClientPortalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPortal = useCallback(async () => {
    try {
      const response = await apiFetch<ClientPortalResponse>("/api/timesheet");
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load portal data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  if (isLoading) {
    return (
      <Card className="glass-panel">
        <CardContent className="py-20 text-center text-slate-400">Loading client dashboard...</CardContent>
      </Card>
    );
  }

  if (!data) {
    return <div className="text-slate-400">No site data available.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Building2 className="h-6 w-6 text-amber-300" />
              {data.site.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>{data.site.address}</p>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-400">Guards on shift today</p>
              <p className="mt-2 text-4xl font-semibold text-white">{data.onShiftToday.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              On-site coverage today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {data.onShiftToday.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">No guards on shift today.</div>
              ) : (
                data.onShiftToday.map((shift) => (
                  <div key={shift.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">{shift.guardName}</p>
                        <p className="text-sm text-slate-400">{formatDateTime(shift.startTime, "EEE dd MMM • HH:mm")}</p>
                      </div>
                      <Badge variant="outline" className="border-white/10 text-slate-200">
                        {shift.status}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                      <FileClock className="h-4 w-4 text-cyan-300" />
                      Ends {formatDateTime(shift.endTime, "HH:mm")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <TimesheetTable siteName={data.site.name} entries={data.timesheet} />
    </div>
  );
}
