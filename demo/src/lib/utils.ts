import { type ClassValue, clsx } from "clsx";
import { format, isSameDay, startOfWeek } from "date-fns";
import { twMerge } from "tailwind-merge";

import type {
  AlertRecord,
  ClockInScenario,
  ClockStatus,
  DemoSession,
  ShiftRecord,
  Severity
} from "@/types";

const SESSION_KEY = "dpr-demo-session";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date, pattern = "EEE, MMM d • HH:mm"): string {
  return format(new Date(value), pattern);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatClockStatus(status: ClockStatus): string {
  return status.replace(/_/g, " ");
}

export function clockStatusBadge(status: ClockStatus): string {
  switch (status) {
    case "ON_TIME":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
    case "LATE":
      return "bg-amber-500/15 text-amber-200 border-amber-500/40";
    case "WRONG_LOCATION":
      return "bg-rose-500/15 text-rose-200 border-rose-500/40";
    default:
      return "bg-slate-500/15 text-slate-200 border-slate-500/40";
  }
}

export function severityStyles(severity: Severity): string {
  switch (severity) {
    case "LOW":
      return "border-emerald-500/40 bg-emerald-500/10";
    case "MEDIUM":
      return "border-amber-500/40 bg-amber-500/10";
    case "HIGH":
      return "border-orange-500/40 bg-orange-500/10";
    case "CRITICAL":
      return "border-rose-500/40 bg-rose-500/10";
    default:
      return "border-border bg-card";
  }
}

export function alertIndicatorClass(alert: AlertRecord): string {
  switch (alert.severity) {
    case "LOW":
      return "bg-emerald-400";
    case "MEDIUM":
      return "bg-amber-400";
    case "HIGH":
      return "bg-orange-400";
    case "CRITICAL":
      return "bg-rose-400";
    default:
      return "bg-slate-400";
  }
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const earthRadius = 6371e3;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function getStoredSession(): DemoSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setStoredSession(session: DemoSession): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function clearStoredSession(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  if (session?.token) {
    headers.set("Authorization", "Bearer " + session.token);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store"
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

export function weekStartsOnMonday(date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function isShiftToday(shift: ShiftRecord): boolean {
  return isSameDay(new Date(shift.startTime), new Date());
}

export function scenarioLabel(scenario: ClockInScenario): string {
  switch (scenario) {
    case "ON_TIME":
      return "On-time arrival";
    case "LATE":
      return "Late arrival (+20m)";
    case "WRONG_LOCATION":
      return "Wrong location";
    default:
      return scenario;
  }
}
