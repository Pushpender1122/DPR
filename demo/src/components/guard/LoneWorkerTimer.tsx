"use client";

import { ShieldCheck, Siren, TimerReset } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoneWorkerTimerProps {
  onSafeCheckIn: () => Promise<void>;
  onMissedCheckIn: () => Promise<void>;
}

const FULL_DURATION = 15 * 60;

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function LoneWorkerTimer({ onSafeCheckIn, onMissedCheckIn }: LoneWorkerTimerProps): JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(FULL_DURATION);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      void onMissedCheckIn();
    }
  }, [onMissedCheckIn, secondsLeft]);

  const handleSafe = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSafeCheckIn();
      hasTriggeredRef.current = false;
      setSecondsLeft(FULL_DURATION);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fastForward = (): void => {
    setSecondsLeft(5);
    hasTriggeredRef.current = false;
  };

  const progress = Math.max(5, (secondsLeft / FULL_DURATION) * 100);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-2xl">15-minute safety pulse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Next welfare confirmation</p>
          <p className="mt-4 text-6xl font-semibold tracking-tight text-white">{formatRemaining(secondsLeft)}</p>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Button onClick={handleSafe} disabled={isSubmitting} className="h-12">
            <ShieldCheck className="h-4 w-4" />
            {isSubmitting ? "Confirming..." : "I'm Safe"}
          </Button>
          <Button onClick={fastForward} variant="outline" className="h-12">
            <TimerReset className="h-4 w-4" />
            Fast-forward demo
          </Button>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <Siren className="mt-0.5 h-4 w-4" />
            <p>If the timer reaches 00:00, the system escalates a missed lone-worker alert to the admin dashboard immediately.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
