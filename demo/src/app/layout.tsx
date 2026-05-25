import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "DPR Security Demo",
  description: "Industry-grade security guard management demo built with Next.js 14 and Prisma."
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
