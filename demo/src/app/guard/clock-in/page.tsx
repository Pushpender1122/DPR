"use client";

import { MapPin, Navigation, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PhoneFrame } from "@/components/guard/PhoneFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, clockStatusBadge, formatClockStatus, formatDateTime, scenarioLabel } from "@/lib/utils";
import type { ClockInResponse, ClockInScenario, ShiftsResponse } from "@/types";

const fallbackCoords = { lat: 51.5074, lng: -0.1278 };

export default function GuardClockInPage(): JSX.Element {
  const [data, setData] = useState<ShiftsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scenario, setScenario] = useState<ClockInScenario>("ON_TIME");
  const [coords, setCoords] = useState(fallbackCoords);
  const [result, setResult] = useState<ClockInResponse | null>(null);

  const loadShift = useCallback(async () => {
    try {
      const response = await apiFetch<ShiftsResponse>("/api/shifts");
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load your shift");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  const captureCoords = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setCoords(fallbackCoords);
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          resolve();
        },
        () => {
          setCoords(fallbackCoords);
          resolve();
        },
        { enableHighAccuracy: false, timeout: 4000 }
      );
    });
  }, []);

  useEffect(() => {
    void captureCoords();
  }, [captureCoords]);

  const currentShift = data?.currentShift ?? null;
  const displayedCoords = useMemo(() => {
    if (scenario === "WRONG_LOCATION") {
      return { lat: 40.7128, lng: -74.006 };
    }
    return coords;
  }, [coords, scenario]);

  const handleClockIn = async (): Promise<void> => {
    if (!currentShift) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch<ClockInResponse>("/api/clock-in", {
        method: "POST",
        body: JSON.stringify({
          shiftId: currentShift.id,
          lat: displayedCoords.lat,
          lng: displayedCoords.lng,
          scenario
        })
      });
      setResult(response);
      toast.success(response.message);
      await loadShift();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clock-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <PhoneFrame>
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Mobile attendance</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Guard clock-in</h1>
          </div>

          <Card className="border-white/10 bg-white/[0.04]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Assigned site</p>
                  <p className="font-semibold text-white">{currentShift?.siteName ?? "No active assignment"}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Scheduled start</p>
                <p className="font-medium text-white">{currentShift ? formatDateTime(currentShift.startTime) : "Awaiting dispatch"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">Demo scenario</p>
            <Select value={scenario} onValueChange={(value) => setScenario(value as ClockInScenario)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["ON_TIME", "LATE", "WRONG_LOCATION"] as ClockInScenario[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {scenarioLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 font-medium text-white">
              <MapPin className="h-4 w-4 text-cyan-300" />
              Captured coordinates
            </div>
            <p className="mt-2">Lat {displayedCoords.lat.toFixed(4)} • Lng {displayedCoords.lng.toFixed(4)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => void captureCoords()}>
              <Navigation className="h-4 w-4" />
              Refresh GPS
            </Button>
            <Button onClick={() => void handleClockIn()} disabled={!currentShift || isSubmitting}>
              {isSubmitting ? "Clocking in..." : "Clock in now"}
            </Button>
          </div>
        </div>
      </PhoneFrame>

      <div className="space-y-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Attendance intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-slate-400">Loading assigned shift...</p>
            ) : currentShift ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">Current assignment</p>
                      <p className="text-2xl font-semibold text-white">{currentShift.siteName}</p>
                    </div>
                    <Button variant="outline" onClick={() => void loadShift()}>
                      <RefreshCw className="h-4 w-4" />
                      Sync
                    </Button>
                  </div>
                  <p className="mt-3 text-slate-300">{currentShift.siteAddress}</p>
                  <p className="mt-4 text-sm text-slate-400">Start: {formatDateTime(currentShift.startTime)}</p>
                </div>
                {result ? (
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-400">Latest result</p>
                        <p className="text-xl font-semibold text-white">Clock-in recorded</p>
                      </div>
                      <Badge className={clockStatusBadge(result.clockIn.status)}>{formatClockStatus(result.clockIn.status)}</Badge>
                    </div>
                    <p className="mt-3 text-slate-300">{result.message}</p>
                    <p className="mt-2 text-sm text-slate-500">Recorded {formatDateTime(result.clockIn.timestamp)}</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-slate-400">
                    Use the demo scenario selector to trigger on-time, late, or wrong-location outcomes.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-slate-400">No scheduled shift is currently assigned to this guard.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
