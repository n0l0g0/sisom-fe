'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';

const A4_PORTRAIT_HEIGHT_MM = 297 - 16;
const MM_TO_PX = 96 / 25.4;

/** แสดงห้องแบบ เลขตึก/เลขห้อง โดยตัดคำว่า "ตึก" ออกจากชื่อตึก */
function formatOutstandingRoomLabel(buildingName: string, roomNumber: string): string {
  const room = (roomNumber || '').trim();
  let b = (buildingName || '').trim().replace(/^ตึก(?:\s+)?/u, '').trim();
  if (!b && !room) return '-';
  if (!b) return room || '-';
  if (!room) return b;
  return `${b}/${room}`;
}

function PrintOutstandingContent() {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const month = monthParam ? Number(monthParam) : new Date().getMonth() + 1;
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  const contentRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<{
    monthLabel: string;
    rows: Array<{
      roomNumber: string;
      buildingName: string;
      tenantName: string;
      status: string;
      totalDue: number;
      dueDateNote: string | null;
    }>;
    totalSum: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getOutstandingReport(month, year);
        if (cancelled) return;
        setReport(data);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || 'โหลดรายงานไม่สำเร็จ');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  useEffect(() => {
    if (!report || !contentRef.current) return;
    const maxHeightPx = A4_PORTRAIT_HEIGHT_MM * MM_TO_PX;
    const run = () => {
      const el = contentRef.current;
      if (!el) return;
      const h = el.scrollHeight;
      if (h > maxHeightPx && h > 0) {
        setFitScale(maxHeightPx / h);
      } else {
        setFitScale(1);
      }
    };
    const t = setTimeout(run, 100);
    return () => clearTimeout(t);
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        กำลังโหลดรายงานค้างชำระ...
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

  if (!report) {
    return null;
  }

  const roomCell = (r: { buildingName: string; roomNumber: string }) =>
    formatOutstandingRoomLabel(r.buildingName, r.roomNumber);
  const noteCell = (r: { dueDateNote: string | null }) =>
    r.dueDateNote != null && r.dueDateNote !== '' ? r.dueDateNote : '';

  return (
    <div className="bg-white text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');

        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: 'Sarabun', system-ui, sans-serif;
        }

        .print-outstanding-page h1 {
          color: #c00;
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }

        .print-outstanding-page table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          border: 1px solid #000;
          font-size: 14px;
        }

        .print-outstanding-page .col-room {
          width: 11%;
        }

        .print-outstanding-page .col-tenant {
          width: 26%;
        }

        .print-outstanding-page .col-status {
          width: 12%;
        }

        .print-outstanding-page .col-total {
          width: 13%;
        }

        .print-outstanding-page .col-note {
          width: 38%;
        }

        .print-outstanding-page th,
        .print-outstanding-page td {
          border: 1px solid #000;
          padding: 6px 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
        }

        .print-outstanding-page th {
          background: #f5f5f5;
          font-weight: 600;
          font-size: 14px;
        }

        .print-outstanding-page .col-room,
        .print-outstanding-page .col-tenant,
        .print-outstanding-page .col-note {
          text-align: left;
        }

        .print-outstanding-page .col-status {
          text-align: center;
        }

        .print-outstanding-page .col-total {
          text-align: right;
        }

        .print-outstanding-page .total-row {
          font-weight: bold;
          font-size: 15px;
        }

        .print-outstanding-page .total-row td {
          border-top: 2px solid #000;
        }

        .fit-a4 {
          transform-origin: top left;
        }

        @media print {
          .print-button {
            display: none !important;
          }

          body {
            padding: 0;
            height: auto;
          }

          .fit-a4 {
            transform-origin: top left;
            box-sizing: border-box;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-outstanding-page h1 {
            font-size: 18pt;
            margin-bottom: 8px;
          }

          .print-outstanding-page table {
            font-size: 11pt;
          }

          .print-outstanding-page th,
          .print-outstanding-page td {
            padding: 5px 7px;
          }

          .print-outstanding-page .total-row {
            font-size: 12pt;
          }
        }
      `}</style>
      <div className="fixed top-4 left-4 z-50 print-button">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          พิมพ์
        </button>
      </div>
      <div
        className="fit-a4 print-outstanding-page w-full max-w-none mx-auto box-border px-3 py-4 md:px-6 md:py-6 print:px-0 print:py-0"
        ref={contentRef}
        style={{
          transform: `scale(${fitScale})`,
          width: fitScale > 0 && fitScale < 1 ? `${100 / fitScale}%` : undefined,
        }}
      >
        <h1>{report.monthLabel}</h1>
        <table>
          <thead>
            <tr>
              <th className="col-room">ห้อง</th>
              <th className="col-tenant">ผู้เช่า</th>
              <th className="col-status">สถานะ</th>
              <th className="col-total">รวม</th>
              <th className="col-note">หมายเหตุ (วันที่นัดชำระ)</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 12 }}>
                  ไม่พบรายการค้างชำระ
                </td>
              </tr>
            ) : (
              report.rows.map((r, i) => (
                <tr key={i}>
                  <td className="col-room">{roomCell(r)}</td>
                  <td className="col-tenant">{r.tenantName}</td>
                  <td className="col-status">{r.status}</td>
                  <td className="col-total">
                    {Number(r.totalDue).toLocaleString('th-TH')}
                  </td>
                  <td className="col-note">{noteCell(r)}</td>
                </tr>
              ))
            )}
            {report.rows.length > 0 && (
              <tr className="total-row">
                <td colSpan={3}>รวมยอด</td>
                <td className="col-total">
                  {report.totalSum.toLocaleString('th-TH')}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PrintOutstandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          กำลังเตรียมหน้ารายงาน...
        </div>
      }
    >
      <PrintOutstandingContent />
    </Suspense>
  );
}
