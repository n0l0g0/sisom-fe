 'use client';
 
 import { useMemo, useState } from 'react';
 import { api, Invoice } from '@/services/api';
 import { useRouter } from 'next/navigation';
 
 export default function SendAllBar({ invoices }: { invoices: Invoice[] }) {
   const router = useRouter();
   const monthKeys = useMemo(() => {
     const set = new Set<string>();
     for (const inv of invoices) {
       set.add(`${inv.year}-${String(inv.month).padStart(2, '0')}`);
     }
     return Array.from(set).sort().reverse();
   }, [invoices]);
   const [selected, setSelected] = useState<string | null>(
     monthKeys[0] || null,
   );
   const thai = [
     'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
   ];
   const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sendAll = async () => {
    if (!selected || loading) return;
    const [y, m] = selected.split('-');
    try {
      setLoading(true);
      await api.sendAllInvoices(Number(m), Number(y));
      router.refresh();
      alert('ส่งบิลทั้งหมดเรียบร้อย');
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
        onChange={(e) => setSelected(e.target.value || null)}
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
    </div>
  );
 }
