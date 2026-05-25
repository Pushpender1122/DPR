"use client";

import { Clock3, LogOut, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearStoredSession, cn, getStoredSession } from "@/lib/utils";

const nav = [
  { href: "/guard/clock-in", label: "Clock-In", icon: Clock3 },
  { href: "/guard/lone-worker", label: "Lone Worker", icon: Timer }
];

export default function GuardLayout({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Guard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session || session.user.role !== "GUARD") {
      router.replace("/");
      return;
    }
    setName(session.user.name);
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading guard app...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Guard mobile</p>
              <p className="text-xl font-semibold text-white">{name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={cn("inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition", pathname === item.href ? "bg-white text-slate-950" : "bg-white/5 text-slate-200 hover:bg-white/10")}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="outline" onClick={() => { clearStoredSession(); router.replace("/"); }}>
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
