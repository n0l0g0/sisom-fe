'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = Number(e.target.value);
    setMonth(newMonth);
    router.push(`/reports?month=${newMonth}&year=${year}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    setYear(newYear);
    router.push(`/reports?month=${month}&year=${newYear}`);
  };

  const handleExport = () => {
    // Placeholder export
    alert(`Exporting report for ${month}/${year}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
      {/* Month Selector */}
      <div className="relative">
        <select
          className="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
          value={month}
          onChange={handleMonthChange}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {thaiMonthLabel(m)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      </div>

      {/* Year Selector */}
      <div className="relative">
        <select
          className="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
          value={year}
          onChange={handleYearChange}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y + 543}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      </div>

      {/* Export Report Button */}
      <button
        onClick={handleExport}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium shadow-md shadow-indigo-500/20 transition-all active:scale-95"
      >
        <Download className="h-4 w-4" />
        <span>Export Report</span>
      </button>
    </div>
  );
}
