'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

export default function MonthYearSelector({ defaultMonth, defaultYear }: Props) {
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);

  const years = useMemo(() => {
    const y = defaultYear;
    return [y - 1, y, y + 1];
  }, [defaultYear]);

  const href = useMemo(
    () => `/reports/dorm-summary?month=${month}&year=${year}`,
    [month, year],
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white">
        <label className="text-sm text-slate-600">เดือน</label>
        <select
          className="text-sm text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {thaiMonthLabel(m)}
            </option>
          ))}
        </select>
        <label className="text-sm text-slate-600">ปี</label>
        <select
          className="text-sm text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y + 543}
            </option>
          ))}
        </select>
      </div>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-2 rounded-full bg-[#f5a987] text-white font-medium hover:bg-[#e09b7d]"
      >
        รายงานแยกหอ
      </Link>
      <div className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm">
        ปี {year + 543}
      </div>
    </div>
  );
}
