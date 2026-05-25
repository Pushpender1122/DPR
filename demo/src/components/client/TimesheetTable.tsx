"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { TimesheetEntry } from "@/types";

interface TimesheetTableProps {
  siteName: string;
  entries: TimesheetEntry[];
}

export function TimesheetTable({ siteName, entries }: TimesheetTableProps): JSX.Element {
  const handleDownload = (): void => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${siteName} Weekly Timesheet`, 14, 18);
    doc.setFontSize(11);
    doc.text("Security operations summary for current week", 14, 26);

    autoTable(doc, {
      startY: 34,
      head: [["Date", "Guard", "Scheduled", "Clock In", "Hours", "Rate", "Total", "Status"]],
      body: entries.map((entry) => [
        formatDateTime(entry.date, "dd MMM yyyy"),
        entry.guardName,
        entry.scheduled,
        entry.clockIn,
        entry.hours.toFixed(2),
        formatCurrency(entry.payRate),
        formatCurrency(entry.totalPay),
        entry.status
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      bodyStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42] }
    });

    doc.save(`${siteName.toLowerCase().replace(/\s+/g, "-")}-timesheet.pdf`);
  };

  const total = entries.reduce((sum, entry) => sum + entry.totalPay, 0);

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-2xl">Current week timesheet</CardTitle>
          <p className="mt-2 text-sm text-slate-400">Read-only billing and attendance transparency for client stakeholders.</p>
        </div>
        <Button onClick={handleDownload} disabled={entries.length === 0}>
          <Download className="h-4 w-4" />
          Download Weekly Timesheet PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Guard</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                  No timesheet activity available for the current week.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.shiftId}>
                  <TableCell>{formatDateTime(entry.date, "dd MMM")}</TableCell>
                  <TableCell>{entry.guardName}</TableCell>
                  <TableCell>{entry.scheduled}</TableCell>
                  <TableCell>{entry.clockIn}</TableCell>
                  <TableCell>{entry.hours.toFixed(2)}</TableCell>
                  <TableCell>{formatCurrency(entry.payRate)}</TableCell>
                  <TableCell>{formatCurrency(entry.totalPay)}</TableCell>
                  <TableCell>{entry.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex justify-end border-t border-white/10 pt-4">
          <div className="rounded-2xl bg-white/[0.04] px-5 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Weekly total</p>
            <p className="text-2xl font-semibold text-white">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
