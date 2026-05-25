"use client";

import { Activity, ShieldAlert, Siren } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AlertCard } from "@/components/admin/AlertCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/utils";
import type { AlertRecord } from "@/types";

export default function AdminAlertsPage(): JSX.Element {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = useCallback(async (silent = false) => {
    try {
      const response = await apiFetch<{ alerts: AlertRecord[] }>("/api/alerts");
      setAlerts(response.alerts);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Unable to load alerts");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    const interval = window.setInterval(() => {
      void loadAlerts(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  const metrics = useMemo(
    () => ({
      critical: alerts.filter((alert) => alert.severity === "CRITICAL").length,
      high: alerts.filter((alert) => alert.severity === "HIGH").length,
      low: alerts.filter((alert) => alert.severity === "LOW").length
    }),
    [alerts]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Live monitoring</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Admin alert dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Incoming attendance and welfare incidents stream into this view every 5 seconds.</p>
        </div>
        <Button variant="outline" onClick={() => void loadAlerts()}>
          <Activity className="h-4 w-4" />
          Refresh now
        </Button>
      </div>

      <section className="dashboard-grid">
        {[
          { label: "Critical alerts", value: metrics.critical, icon: ShieldAlert },
          { label: "High severity", value: metrics.high, icon: Siren },
          { label: "Green confirmations", value: metrics.low, icon: Activity }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-slate-300">{item.label}</CardTitle>
                <div className="rounded-xl bg-white/5 p-2 text-white">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-white">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {isLoading ? (
        <Card className="glass-panel">
          <CardContent className="py-20 text-center text-slate-400">Loading live alerts...</CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="py-20 text-center text-slate-400">No alerts yet. Guard activity will appear here in real time.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
