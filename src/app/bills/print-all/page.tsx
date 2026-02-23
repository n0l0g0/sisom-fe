'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Invoice } from '@/services/api';
import { InvoicePrint } from '../[id]/print/page';

function PrintAllPage() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids');
  const auto = searchParams.get('auto');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!ids) {
        setError('ไม่พบ ID ของบิล');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await api.getInvoices({ ids });
        if (cancelled) return;
        const filtered = data.filter(
          (inv) => inv.status !== 'CANCELLED' && inv.status !== 'PAID',
        );
        const sorted = filtered.sort((a, b) => {
          const ab =
            a.contract?.room?.building?.code ||
            a.contract?.room?.building?.name ||
            '';
          const bb =
            b.contract?.room?.building?.code ||
            b.contract?.room?.building?.name ||
            '';
          const an = Number((ab.match(/\d+/)?.[0] ?? '0'));
          const bn = Number((bb.match(/\d+/)?.[0] ?? '0'));
          if (an !== bn) return an - bn;
          const ar =
            (a.contract?.room?.number || '')
              .replace(/^\s*B\s*/i, '')
              .trim() || '';
          const br =
            (b.contract?.room?.number || '')
              .replace(/^\s*B\s*/i, '')
              .trim() || '';
          const arn = parseInt(ar, 10);
          const brn = parseInt(br, 10);
          const aIsNum = Number.isFinite(arn);
          const bIsNum = Number.isFinite(brn);
          if (aIsNum && bIsNum) return arn - brn;
          if (aIsNum) return -1;
          if (bIsNum) return 1;
          return ar.localeCompare(br, 'th');
        });
        setInvoices(sorted);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || 'โหลดบิลไม่สำเร็จ');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  useEffect(() => {
    if (!loading && invoices.length > 0) {
      // A simple check to see if all invoices have some data.
      // A more robust solution might involve tracking loading state for each invoice.
      setAllLoaded(true);
    }
  }, [loading, invoices]);

  useEffect(() => {
    if (allLoaded && auto === '1') {
      const timer = setTimeout(() => {
        window.print();
      }, 1000); // Wait a bit for rendering
      return () => clearTimeout(timer);
    }
  }, [allLoaded, auto]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        กำลังโหลดบิลทั้งหมด...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');

        @page {
          size: A5 landscape;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: 'Sarabun', system-ui, sans-serif;
        }

        .print-area table {
          font-size: 12px;
        }

        .print-area td,
        .print-area th {
          padding: 4px;
        }

        @media print {
          .print-button {
            display: none !important;
          }

          .page-wrapper {
            width: 210mm;
            height: 148mm;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
          }

          .page-wrapper:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
      <div className="fixed top-4 left-4 z-50 print-button">
        <button
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          พิมพ์ทั้งหมด
        </button>
      </div>
      {invoices.map((invoice, index) => (
        <div key={invoice.id} className="page-wrapper">
          <InvoicePrint id={invoice.id} invoice={invoice} />
        </div>
      ))}
    </div>
  );
}


export default function PrintAllPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">กำลังเตรียมหน้าพิมพ์...</div>}>
      <PrintAllPage />
    </Suspense>
  );
}
