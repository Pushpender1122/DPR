import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { CalendarPlus, Clock3, PoundSterling } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ShiftRecord } from "@/types";

interface ShiftCalendarProps {
  shifts: ShiftRecord[];
  onCreateShift: () => void;
}

export function ShiftCalendar({ shifts, onCreateShift }: ShiftCalendarProps): JSX.Element {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <Card className="glass-panel overflow-hidden">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-2xl">Weekly shift scheduler</CardTitle>
          <p className="mt-2 text-sm text-slate-400">Drag-free, operations-focused weekly visibility with assignment and pay rate context.</p>
        </div>
        <Button onClick={onCreateShift} className="min-w-[180px]">
          <CalendarPlus className="h-4 w-4" />
          Create shift
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-7">
          {days.map((day) => {
            const shiftsForDay = shifts.filter((shift) => isSameDay(new Date(shift.startTime), day));

            return (
              <div key={day.toISOString()} className="min-h-[320px] rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{format(day, "EEE")}</p>
                    <p className="text-xl font-semibold text-white">{format(day, "d MMM")}</p>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {shiftsForDay.length} shift{shiftsForDay.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {shiftsForDay.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center text-sm text-slate-500">
                    No assignment yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shiftsForDay.map((shift) => (
                      <div
                        key={shift.id}
                        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-500/10 p-4 shadow-lg shadow-primary/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{shift.guardName}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{shift.siteName}</p>
                          </div>
                          <Badge className="bg-white/10 text-white">{shift.status}</Badge>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-200">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-cyan-300" />
                            <span>
                              {format(new Date(shift.startTime), "HH:mm")} - {format(new Date(shift.endTime), "HH:mm")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PoundSterling className="h-4 w-4 text-emerald-300" />
                            <span>{formatCurrency(shift.payRate)} / hr</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
