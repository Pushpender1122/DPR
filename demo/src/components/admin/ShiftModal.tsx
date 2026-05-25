"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SiteOption, UserOption } from "@/types";

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guards: UserOption[];
  sites: SiteOption[];
  onSubmit: (payload: { guardId: string; siteId: string; startTime: string; endTime: string; payRate: number }) => Promise<void>;
}

export function ShiftModal({ open, onOpenChange, guards, sites, onSubmit }: ShiftModalProps): JSX.Element {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [guardId, setGuardId] = useState(guards[0]?.id ?? "");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [payRate, setPayRate] = useState("20");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (guards[0]?.id && !guardId) {
      setGuardId(guards[0].id);
    }
    if (sites[0]?.id && !siteId) {
      setSiteId(sites[0].id);
    }
  }, [guardId, guards, siteId, sites]);

  const handleSubmit = async (): Promise<void> => {
    if (!guardId || !siteId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      await onSubmit({
        guardId,
        siteId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        payRate: Number(payRate)
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a new shift</DialogTitle>
          <DialogDescription>Assign a guard, confirm site coverage, and set the billable pay rate.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Guard</Label>
            <Select value={guardId} onValueChange={setGuardId}>
              <SelectTrigger>
                <SelectValue placeholder="Select guard" />
              </SelectTrigger>
              <SelectContent>
                {guards.map((guard) => (
                  <SelectItem key={guard.id} value={guard.id}>
                    {guard.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-date">Date</Label>
            <Input id="shift-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-rate">Pay rate (£ / hr)</Label>
            <Input id="pay-rate" type="number" min="1" step="0.5" value={payRate} onChange={(event) => setPayRate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-time">Start time</Label>
            <Input id="start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">End time</Label>
            <Input id="end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
