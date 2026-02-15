'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function Filters({ defaultRoom, defaultStatus }: { defaultRoom?: string; defaultStatus?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState(defaultRoom || '');
  const [status, setStatus] = useState(defaultStatus || '');

  const submit = (nextRoom?: string, nextStatus?: string) => {
    const r = typeof nextRoom === 'string' ? nextRoom : room;
    const s = typeof nextStatus === 'string' ? nextStatus : status;
    const params = new URLSearchParams(searchParams.toString());
    if (r && r.trim()) params.set('room', r.trim());
    if (s && s.trim()) params.set('status', s.trim());
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
          placeholder="เช่น 230"
          className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
        />
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
