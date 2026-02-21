'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type DateRangeValue = {
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
};

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function formatThaiDateDisplay(s?: string) {
  const d = parseYMD(s);
  if (!d) return '';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthDays(year: number, monthIndex: number) {
  // monthIndex: 0..11
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const days = [];
  for (let i = 1; i <= last.getDate(); i++) {
    days.push(new Date(year, monthIndex, i));
  }
  return { first, last, days };
}

function isInRange(d: Date, start?: Date, end?: Date) {
  if (!start || !end) return false;
  const a = start.getTime();
  const b = end.getTime();
  const t = d.getTime();
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return t >= lo && t <= hi;
}

export function DateRangeInput(props: {
  value?: DateRangeValue;
  onChange?: (next: DateRangeValue) => void;
  className?: string;
  placeholder?: string;
}) {
  const { value, onChange, className, placeholder } = props;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startD = parseYMD(value?.start);
  const endD = parseYMD(value?.end);

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0..11

  // drag selection state
  const [dragStart, setDragStart] = useState<Date | undefined>(undefined);
  const [dragEnd, setDragEnd] = useState<Date | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const left = useMemo(() => monthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const right = useMemo(() => {
    const m = viewMonth + 1;
    const y = viewYear + Math.floor(m / 12);
    const mm = m % 12;
    return monthDays(y, mm);
  }, [viewYear, viewMonth]);

  const displayText = useMemo(() => {
    const a = formatThaiDateDisplay(value?.start);
    const b = formatThaiDateDisplay(value?.end);
    if (a && b) return `${a} - ${b}`;
    if (a) return a;
    if (b) return b;
    return placeholder || 'เลือกช่วงวันที่';
  }, [value?.start, value?.end, placeholder]);

  const commitDrag = () => {
    if (dragStart && dragEnd) {
      const start = toYMD(new Date(Math.min(dragStart.getTime(), dragEnd.getTime())));
      const end = toYMD(new Date(Math.max(dragStart.getTime(), dragEnd.getTime())));
      onChange?.({ start, end });
    }
    setDragging(false);
  };

  const handleDayMouseDown = (d: Date) => {
    setDragging(true);
    setDragStart(d);
    setDragEnd(d);
  };
  const handleDayMouseEnter = (d: Date) => {
    if (!dragging) return;
    setDragEnd(d);
  };
  const handleDayMouseUp = () => {
    commitDrag();
  };

  const clear = () => {
    onChange?.({ start: undefined, end: undefined });
    setDragStart(undefined);
    setDragEnd(undefined);
  };

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        className="w-full border rounded px-3 py-2 text-sm bg-white text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {displayText}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg p-3 w-[560px]">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-[#8b5a3c]">
              เลือกช่วงวันที่
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 border rounded bg-white"
                onClick={() => {
                  let m = viewMonth - 1;
                  let y = viewYear;
                  if (m < 0) {
                    m = 11;
                    y -= 1;
                  }
                  setViewMonth(m);
                  setViewYear(y);
                }}
                title="ก่อนหน้า"
              >
                ‹
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded bg-white"
                onClick={() => {
                  let m = viewMonth + 1;
                  let y = viewYear;
                  if (m > 11) {
                    m = 0;
                    y += 1;
                  }
                  setViewMonth(m);
                  setViewYear(y);
                }}
                title="ถัดไป"
              >
                ›
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded bg-white"
                onClick={clear}
              >
                ล้าง
              </button>
            </div>
          </div>
          <div
            className="grid grid-cols-2 gap-4 select-none"
            onMouseLeave={() => setDragging(false)}
          >
            {[left, right].map((cal, idx) => (
              <div key={idx}>
                <div className="text-sm font-medium text-[#8b5a3c] mb-1">
                  {cal.first.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-7 text-xs text-slate-500 mb-1">
                  {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
                    <div key={d} className="text-center py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* leading blanks */}
                  {Array.from({ length: (cal.first.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`b-${i}`} className="py-2"></div>
                  ))}
                  {cal.days.map((d) => {
                    const selected =
                      isInRange(d, dragStart ?? startD, dragEnd ?? endD) ||
                      isInRange(d, startD, endD);
                    const isEdge =
                      !!startD && d.getTime() === startD.getTime() ||
                      !!endD && d.getTime() === endD.getTime() ||
                      !!dragStart && d.getTime() === dragStart.getTime() ||
                      !!dragEnd && d.getTime() === dragEnd.getTime();
                    return (
                      <div
                        key={toYMD(d)}
                        onMouseDown={() => handleDayMouseDown(d)}
                        onMouseEnter={() => handleDayMouseEnter(d)}
                        onMouseUp={handleDayMouseUp}
                        className={`text-center py-2 rounded cursor-pointer transition-colors
                          ${selected ? 'bg-[#fbe8de]' : 'hover:bg-slate-100'}
                          ${isEdge ? 'font-semibold text-[#8b5a3c] border border-[#f5a987]' : 'text-slate-700'}
                        `}
                        title={d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            ลากเพื่อเลือกช่วงวันที่ หรือคลิกวันเริ่มและวันสิ้นสุด
          </div>
        </div>
      )}
    </div>
  );
}

