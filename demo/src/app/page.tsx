"use client";

import { ArrowRight, Building2, ShieldCheck, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setStoredSession } from "@/lib/utils";
import type { DemoSession } from "@/types";

const portals = [
  {
    title: "Admin Portal",
    description: "Command-centre scheduling, live alerts, shift finance, and operations oversight.",
    email: "admin@demo.com",
    password: "demo123",
    route: "/admin/shifts",
    icon: UserCog,
    accent: "from-indigo-500/30 to-cyan-500/20"
  },
  {
    title: "Guard App",
    description: "Mobile-first clock-in flows, lone worker protection, and shift readiness checks.",
    email: "guard@demo.com",
    password: "demo123",
    route: "/guard/clock-in",
    icon: ShieldCheck,
    accent: "from-emerald-500/30 to-cyan-500/20"
  },
  {
    title: "Client Portal",
    description: "Read-only site visibility, weekly timesheets, and professional reporting exports.",
    email: "client@demo.com",
    password: "demo123",
    route: "/client/portal",
    icon: Building2,
    accent: "from-amber-500/30 to-orange-500/20"
  }
] as const;

export default function LandingPage(): JSX.Element {
  const router = useRouter();
  const [loadingPortal, setLoadingPortal] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string, route: string): Promise<void> => {
    setLoadingPortal(email);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const payload = (await response.json()) as DemoSession & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed");
      }

      setStoredSession(payload);
      toast.success("Demo login successful");
      router.push(route);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setLoadingPortal(null);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-300">
              DPR Security Operations Demo
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white lg:text-6xl">
                A polished command platform for modern guard management.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300">
                Showcase scheduling, attendance compliance, lone worker safety, and client-grade transparency in one production-style demo experience.
              </p>
            </div>
          </div>
          <Card className="glass-panel bg-gradient-to-br from-white/10 via-white/5 to-transparent">
            <CardContent className="grid gap-4 p-6 md:grid-cols-3">
              {[
                { label: "Shift planning", value: "Weekly" },
                { label: "Alert refresh", value: "5 sec" },
                { label: "PDF exports", value: "Ready" }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isLoading = loadingPortal === portal.email;

            return (
              <Card key={portal.title} className={`overflow-hidden bg-gradient-to-br ${portal.accent}`}>
                <CardHeader>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/20">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-3xl">{portal.title}</CardTitle>
                  <CardDescription className="text-slate-200/80">{portal.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                    <p>{portal.email}</p>
                    <p className="mt-1 text-slate-300">Password: {portal.password}</p>
                  </div>
                  <Button className="w-full justify-between" onClick={() => void handleLogin(portal.email, portal.password, portal.route)} disabled={isLoading}>
                    {isLoading ? "Signing in..." : `Open ${portal.title}`}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
