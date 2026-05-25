"use client";

import { LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearStoredSession, cn, getStoredSession } from "@/lib/utils";

export default function ClientLayout({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (!session || session.user.role !== "CLIENT") {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading client portal...</div>;
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Client portal</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Site visibility</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/client/portal" className={cn("inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition", pathname === "/client/portal" ? "bg-white text-slate-950" : "bg-white/5 text-slate-200 hover:bg-white/10")}>
              <Users className="h-4 w-4" />
              Portal overview
            </Link>
            <Button variant="outline" onClick={() => { clearStoredSession(); router.replace("/"); }}>
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
