"use client";

import { Bell, CalendarDays, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { clearStoredSession, cn, getStoredSession } from "@/lib/utils";

const navigation = [
  { href: "/admin/shifts", label: "Shifts", icon: CalendarDays },
  { href: "/admin/alerts", label: "Alerts", icon: Bell }
];

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Admin");

  useEffect(() => {
    const session = getStoredSession();

    if (!session || session.user.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    setName(session.user.name);
    setReady(true);
  }, [router]);

  const signOut = (): void => {
    clearStoredSession();
    router.replace("/");
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading admin workspace...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden w-80 flex-col border-r border-white/10 bg-slate-950/80 p-6 lg:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Admin</p>
            <p className="text-xl font-semibold">Ops Command</p>
          </div>
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active ? "bg-primary text-white shadow-glow" : "text-slate-300 hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-slate-400">Operations administrator</p>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}
