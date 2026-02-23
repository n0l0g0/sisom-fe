 'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Invoice } from '@/services/api';
import { useRouter } from 'next/navigation';
import SendAllProgressDialog, { RoomProgress } from './SendAllProgressDialog';
 
 
export default function SendAllBar({
  invoices,
  onMonthChange,
}: {
  invoices: Invoice[];
  onMonthChange?: (value: string | null) => void;
}) {
   const router = useRouter();
   const monthKeys = useMemo(() => {
     const set = new Set<string>();
     for (const inv of invoices) {
       set.add(`${inv.year}-${String(inv.month).padStart(2, '0')}`);
     }
     return Array.from(set).sort().reverse();
   }, [invoices]);
   const [selected, setSelected] = useState<string | null>(null);
   const thai = [
     'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
   ];
   const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [roomStatuses, setRoomStatuses] = useState<RoomProgress[]>([]);

  useEffect(() => {
    if (!selected && monthKeys[0]) {
      const value = monthKeys[0];
      setSelected(value);
      if (onMonthChange) onMonthChange(value);
    }
  }, [monthKeys, selected]);

  const sendAll = async () => {
    if (!selected || loading) return;
    const [y, m] = selected.split('-');
    const year = Number(y);
    const month = Number(m);
    const targets = invoices
      .filter((inv) => inv.year === year && inv.month === month)
      .map((inv) => ({
        roomId: inv.contract?.room?.id || '',
        roomLabel:
          (inv.contract?.room?.building?.code ||
            inv.contract?.room?.building?.name ||
            '') +
          '/' +
          String((inv.contract?.room?.number || '').replace(/^\s*B\s*/i, '').trim() || '-'),
      }))
      .filter((t) => t.roomId.length > 0);
    if (targets.length === 0) return;
    try {
      setLoading(true);
      setOpen(true);
      setCompleted(0);
      setFailed(0);
      setProgress(0);
      setRoomStatuses(
        targets.map<RoomProgress>((t) => ({
          roomLabel: t.roomLabel,
          status: 'pending',
        })),
      );
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        try {
          await api.sendRoomInvoice(t.roomId, month, year);
          setRoomStatuses((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'success' };
            return next;
          });
          setCompleted((c) => c + 1);
        } catch (e: any) {
          setRoomStatuses((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'failed', message: e?.message };
            return next;
          });
          setFailed((f) => f + 1);
        } finally {
          const pct = Math.round(((i + 1) / targets.length) * 100);
          setProgress(pct);
        }
      }
      router.refresh();
    } catch (e) {
      alert((e as Error).message || 'ส่งบิลทั้งหมดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selected || exporting) return;
    const [y, m] = selected.split('-');
    try {
      setExporting(true);
      await api.exportInvoices(Number(m), Number(y));
    } catch (e) {
      alert((e as Error).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-slate-600">จัดการบิล</label>
      <select
        value={selected || ''}
        onChange={(e) => {
          const value = e.target.value || null;
          setSelected(value);
          if (onMonthChange) onMonthChange(value);
        }}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
      >
        {monthKeys.map((key) => {
          const [y, m] = key.split('-');
          const label = `${thai[Math.max(0, Math.min(11, Number(m) - 1))]} ${y}`;
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>
      <button
        onClick={handleExport}
        disabled={!selected || exporting}
        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:opacity-90 transition shadow-sm disabled:opacity-50"
      >
        {exporting ? 'กำลัง Export...' : 'Export Excel'}
      </button>
      <button
        onClick={sendAll}
        disabled={!selected || loading}
        className="px-4 py-2 rounded-lg bg-[#f5a987] text-white hover:opacity-90 transition shadow-sm disabled:opacity-50"
      >
        {loading ? 'กำลังส่ง...' : 'ส่งทั้งหมด'}
      </button>
      <SendAllProgressDialog
        open={open}
        onClose={() => setOpen(false)}
        progress={progress}
        total={roomStatuses.length}
        completed={completed}
        failed={failed}
        roomStatuses={roomStatuses}
      />
    </div>
  );
 }
