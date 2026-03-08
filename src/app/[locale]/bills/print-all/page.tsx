'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Invoice } from '@/services/api';

function PrintAllPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');
  const keyParam = searchParams.get('key');
  const [ids, setIds] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (keyParam) {
      const stored = localStorage.getItem(keyParam);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setIds(parsed.join(','));
          } else if (typeof parsed === 'string') {
            setIds(parsed);
          }
        } catch {
          // ignore
        }
      }
    } else if (idsParam) {
      setIds(idsParam);
    } else {
      setLoading(false);
      setError('ไม่พบข้อมูลบิลที่ต้องการพิมพ์');
    }
  }, [keyParam, idsParam]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!ids) return;
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

  const thaiMonthLabel = useMemo(() => {
    if (invoices.length === 0) return 'สรุปห้องค้างชำระ';
    const inv = invoices[0];
    const year = inv?.year ?? new Date().getFullYear();
    const month = inv?.month ?? new Date().getMonth() + 1;
    const thai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ];
    const name = thai[Math.max(0, Math.min(11, month - 1))] || '';
    return `${name} ${year}`;
  }, [invoices]);

  const totalAmount = useMemo(
    () =>
      invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount ?? 0),
        0,
      ),
    [invoices],
  );

  const maxRows = 25;
  const displayRows = useMemo(() => {
    const rows = [...invoices];
    const blanks = Math.max(0, maxRows - rows.length);
    for (let i = 0; i < blanks; i += 1) {
      rows.push(null as unknown as Invoice);
    }
    return rows;
  }, [invoices]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
        กำลังโหลดข้อมูลค้างชำระ...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');

        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: 'Sarabun', system-ui, sans-serif;
        }

        .arrears-page {
          width: 210mm;
          height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
        }

        table.arrears-table {
          border-collapse: collapse;
          width: 100%;
        }

        table.arrears-table th,
        table.arrears-table td {
          border: 1px solid #000;
          padding: 0 6px;
          font-size: 13px;
          height: 20px;
          line-height: 20px;
        }

        table.arrears-table th {
          background-color: #f5f5f5;
        }

        @media print {
          .print-button {
            display: none !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="arrears-page">
        <div className="flex justify-between items-center mb-4 print-button">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            พิมพ์
          </button>
        </div>
        <h1
          className="text-3xl font-bold text-center mb-4"
          style={{ color: '#ff0000' }}
        >
          {thaiMonthLabel}
        </h1>
        <div className="print-area">
          <table className="arrears-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>หอ</th>
                <th style={{ width: '10%' }}>ห้อง</th>
                <th style={{ width: '38%' }}>ผู้เช่า</th>
                <th style={{ width: '14%' }}>สถานะ</th>
                <th style={{ width: '14%' }}>รวม</th>
                <th style={{ width: '14%' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((inv, index) => {
                if (!inv) {
                  return (
                    <tr key={`blank-${index}`}>
                      <td /><td /><td /><td /><td /><td />
                    </tr>
                  );
                }
                return (
                  <tr key={inv.id}>
                    <td>{inv.contract?.room?.building?.name ?? ''}</td>
                    <td>{inv.contract?.room?.number ?? ''}</td>
                    <td>{inv.contract?.tenant?.name ?? ''}</td>
                    <td>ค้างชำระ</td>
                    <td>
                      {Number(inv.totalAmount ?? 0).toLocaleString('th-TH')}
                    </td>
                    <td />
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>
                    ไม่มีห้องค้างชำระ
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                  รวมยอด
                </td>
                <td style={{ fontWeight: 700 }}>
                  {totalAmount.toLocaleString('th-TH')}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export default function PrintAllPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-slate-700">กำลังเตรียมหน้าสรุปห้องค้างชำระ...</div>}>
      <PrintAllPage />
    </Suspense>
  );
}
