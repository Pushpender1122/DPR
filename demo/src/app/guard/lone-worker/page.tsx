"use client";

import { ActivitySquare } from "lucide-react";
import { toast } from "sonner";

import { LoneWorkerTimer } from "@/components/guard/LoneWorkerTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, getStoredSession } from "@/lib/utils";

export default function GuardLoneWorkerPage(): JSX.Element {
  const handleSafeCheckIn = async (): Promise<void> => {
    await apiFetch<{ message: string }>("/api/lone-worker", {
      method: "POST",
      body: JSON.stringify({ status: "SAFE" })
    });
    toast.success("Safety check-in logged");
  };

  const handleMissedCheckIn = async (): Promise<void> => {
    try {
      const session = getStoredSession();
      await apiFetch<{ message: string }>("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          type: "LONE_WORKER_MISSED",
          message: `${session?.user.name ?? "Guard"} missed the 15-minute lone worker safety confirmation.`,
          guardName: session?.user.name ?? "Guard",
          siteName: session?.user.siteName ?? "Assigned site",
          severity: "CRITICAL"
        })
      });
      toast.error("Missed lone worker check-in escalated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to escalate missed check-in");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <LoneWorkerTimer onSafeCheckIn={handleSafeCheckIn} onMissedCheckIn={handleMissedCheckIn} />
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-2xl">Safety operations notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-white">
              <ActivitySquare className="h-5 w-5 text-cyan-300" />
              <p className="font-semibold">{getStoredSession()?.user.name ?? "Guard"}</p>
            </div>
            <p className="mt-3 text-sm text-slate-400">Stay responsive to every 15-minute welfare request. A missed acknowledgment triggers an admin alert card in the monitoring dashboard.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm text-slate-400">
            Demo tip: use <span className="font-semibold text-white">Fast-forward demo</span> to push the timer close to zero and show the escalation workflow quickly.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
