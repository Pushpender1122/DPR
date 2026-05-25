import { Smartphone } from "lucide-react";
import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2.75rem] border border-white/15 bg-slate-950/80 p-3 shadow-2xl shadow-indigo-950/40">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500">
        <span>09:41</span>
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-5">
        <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-white/10" />
        {children}
      </div>
    </div>
  );
}
