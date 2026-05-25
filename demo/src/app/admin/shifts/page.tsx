"use client";

import { Banknote, Briefcase, Clock3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ShiftCalendar } from "@/components/admin/ShiftCalendar";
import { ShiftModal } from "@/components/admin/ShiftModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, formatCurrency, getStoredSession, isShiftToday } from "@/lib/utils";
import type { ShiftRecord, ShiftsResponse } from "@/types";

export default function AdminShiftsPage(): JSX.Element {
  const [data, setData] = useState<ShiftsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadShifts = useCallback(async () => {
    try {
      if (!getStoredSession()) {
        return;
      }
      const response = await apiFetch<ShiftsResponse>("/api/shifts");
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load shifts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const metrics = useMemo(() => {
    const shifts = data?.shifts ?? [];
    const today = shifts.filter(isShiftToday);
    return {
      scheduledToday: today.length,
      active: shifts.filter((shift) => shift.status === "ACTIVE").length,
      totalValue: shifts.reduce((sum, shift) => {
        const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 36e5;
        return sum + hours * shift.payRate;
      }, 0)
    };
  }, [data?.shifts]);

  const handleCreate = async (payload: { guardId: string; siteId: string; startTime: string; endTime: string; payRate: number }): Promise<void> => {
    setIsCreating(true);
    try {
      await apiFetch<{ shift: ShiftRecord }>("/api/shifts", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast.success("Shift created successfully");
      await loadShifts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create shift");
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Operations planning</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Shift scheduler</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Manage deployment coverage, pay rates, and roster assignment from a clean weekly view.</p>
        </div>
        <Button variant="outline" onClick={() => void loadShifts()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <section className="dashboard-grid">
        {[
          { label: "Scheduled today", value: metrics.scheduledToday, icon: Briefcase },
          { label: "Active shifts", value: metrics.active, icon: Clock3 },
          { label: "Weekly planned value", value: formatCurrency(metrics.totalValue), icon: Banknote }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-medium text-slate-300">{item.label}</CardTitle>
                <div className="rounded-xl bg-primary/15 p-2 text-primary">
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
          <CardContent className="py-20 text-center text-slate-400">Loading shift schedule...</CardContent>
        </Card>
      ) : data ? (
        <ShiftCalendar shifts={data.shifts} onCreateShift={() => setIsModalOpen(true)} />
      ) : null}

      <ShiftModal open={isModalOpen} onOpenChange={setIsModalOpen} guards={data?.guards ?? []} sites={data?.sites ?? []} onSubmit={handleCreate} />
      {isCreating && <div className="text-sm text-slate-400">Saving new shift...</div>}
    </div>
  );
}
