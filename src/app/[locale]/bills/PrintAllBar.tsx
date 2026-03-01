'use client';

import { Invoice } from '@/services/api';

export default function PrintAllBar({ invoices }: { invoices: Invoice[] }) {
  const activeInvoices = invoices.filter(
    (i) => i.status !== 'CANCELLED' && i.status !== 'PAID',
  );

  const printAll = () => {
    if (!activeInvoices.length) {
      alert('ไม่มีบิลที่ยังไม่ถูกยกเลิกและยังไม่ชำระแล้วให้พิมพ์');
      return;
    }

    const ids = activeInvoices.map((i) => i.id);
    const key = `print_ids_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(ids));

    window.open(
      `/bills/print-all?key=${key}`,
      '_blank'
    );
  };

  return (
    <button
      onClick={printAll}
      className="px-3 py-2 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900"
      title={`พิมพ์ใบแจ้งหนี้ทุกห้อง (ไม่รวมยกเลิก/ชำระแล้ว ${activeInvoices.length} ใบ)`}
    >
      พิมพ์ทุกห้อง ({activeInvoices.length})
    </button>
  );
}
