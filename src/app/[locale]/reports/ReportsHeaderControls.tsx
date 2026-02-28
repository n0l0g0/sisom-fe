'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  defaultMonth: number;
  defaultYear: number;
};

function thaiMonthLabel(m: number) {
  const labels = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];
  return labels[m - 1] || '';
}

export default function ReportsHeaderControls({ defaultMonth, defaultYear }: Props) {
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);

  const years = useMemo(() => {
    const y = defaultYear;
    return [y - 1, y, y + 1];
  }, [defaultYear]);

  const dormReportHref = useMemo(
    () => `/reports/dorm-summary?month=${month}&year=${year}`,
    [month, year],
  );

  const handleExport = () => {
    // Implement export logic or link here
    // For now, simple alert or placeholder
    alert(`Exporting report for ${month}/${year}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Month Selector */}
      <div className="relative">
        <select
          className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-700 transition-colors cursor-pointer"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {thaiMonthLabel(m)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Year Selector */}
      <div className="relative">
        <select
          className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-slate-700 transition-colors cursor-pointer"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y + 543}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {/* Reports by Dorm Button (Keep existing functionality) */}
      <Link
        href={dormReportHref}
        className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm"
      >
        รายงานแยกหอ
      </Link>

      {/* Export Report Button */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all duration-200"
      >
        <Download className="h-4 w-4" />
        Export Report
      </button>
    </div>
  );
}
