'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function Filters({ defaultRoom, defaultStatus, defaultMonth, defaultYear }: { defaultRoom?: string; defaultStatus?: string; defaultMonth?: number; defaultYear?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState(defaultRoom || '');
  const [status, setStatus] = useState(defaultStatus || '');
  const [month, setMonth] = useState<number | ''>(defaultMonth || '');
  const [year, setYear] = useState<number | ''>(defaultYear || '');

  const submit = (nextRoom?: string, nextStatus?: string, nextMonth?: number | '', nextYear?: number | '') => {
    const r = typeof nextRoom === 'string' ? nextRoom : room;
    const s = typeof nextStatus === 'string' ? nextStatus : status;
    const m = nextMonth !== undefined ? nextMonth : month;
    const y = nextYear !== undefined ? nextYear : year;
    
    const params = new URLSearchParams(searchParams.toString());
    if (r && r.trim()) params.set('room', r.trim()); else params.delete('room');
    if (s && s.trim()) params.set('status', s.trim()); else params.delete('status');
    if (m !== '') params.set('month', m.toString()); else params.delete('month');
    if (y !== '') params.set('year', y.toString()); else params.delete('year');
    
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/payments?${qs}` : `/payments`);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
      <div className="flex-1">
        <div className="text-sm text-slate-500">ค้นหาตามห้อง</div>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="เช่น 230"
          className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
        />
      </div>
      <div>
        <div className="text-sm text-slate-500">เดือน</div>
        <select
          value={month}
          onChange={(e) => {
            const val = Number(e.target.value);
            setMonth(val);
            submit(undefined, undefined, val, undefined);
          }}
          className="mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
        >
          <option value="0">ทั้งหมด</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1]}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="text-sm text-slate-500">ปี</div>
        <select
          value={year}
          onChange={(e) => {
            const val = Number(e.target.value);
            setYear(val);
            submit(undefined, undefined, undefined, val);
          }}
          className="mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
        >
          <option value="0">ทั้งหมด</option>
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>{y + 543}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="text-sm text-slate-500">สถานะ</div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            submit(undefined, e.target.value);
          }}
          className="mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
        >
          <option value="">ทั้งหมด</option>
          <option value="PENDING">รอยืนยัน</option>
          <option value="VERIFIED">ตรวจสอบแล้ว</option>
          <option value="REJECTED">ปฏิเสธ</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => submit()}
          className="px-4 py-2 rounded-lg border border-[#f5a987] text-[#f5a987] hover:bg-[#f5a987]/10 transition"
        >
          ค้นหา
        </button>
        <button
          onClick={() => {
            setRoom('');
            setStatus('');
            setMonth('');
            setYear('');
            router.push('/payments');
          }}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </div>
  );
}
