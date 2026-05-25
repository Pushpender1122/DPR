"use client";

import { Toaster as Sonner } from "sonner";

const Toaster = (): JSX.Element => (
  <Sonner
    richColors
    position="top-right"
    theme="dark"
    toastOptions={{
      className: "border border-white/10 bg-slate-950 text-slate-50"
    }}
  />
);

export { Toaster };
