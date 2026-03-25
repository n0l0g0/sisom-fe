'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Invoice } from '@/services/api';
import { InvoicePrint } from '../[id]/print/page';

function PrintRoomsPage() {
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
        const isBanNoi = (inv: Invoice) => {
          const roomNo = String(inv.contract?.room?.number || '');
          const buildingName = String(inv.contract?.room?.building?.name || '');
          const buildingCode = String(inv.contract?.room?.building?.code || '');
          return (
            roomNo.includes('บ้านน้อย') ||
            buildingName.includes('บ้านน้อย') ||
            buildingCode.includes('บ้านน้อย')
          );
        };
        const getBuildingOrder = (inv: Invoice) => {
          const buildingCode = String(inv.contract?.room?.building?.code || '');
          const buildingName = String(inv.contract?.room?.building?.name || '');
          const source = buildingCode || buildingName;
          const n = Number(source.match(/\d+/)?.[0] || '0');
          return Number.isFinite(n) ? n : 0;
        };
        const getBuildingName = (inv: Invoice) =>
          String(inv.contract?.room?.building?.name || inv.contract?.room?.building?.code || '');
        const getFloorOrder = (inv: Invoice) => {
          const floor = Number(inv.contract?.room?.floor ?? 0);
          return Number.isFinite(floor) ? floor : 0;
        };
        const getRoomOrder = (inv: Invoice) => {
          const roomNo = String(inv.contract?.room?.number || '').replace(/^\s*B\s*/i, '').trim();
          const n = Number(roomNo.match(/\d+/)?.[0] || '0');
          return Number.isFinite(n) ? n : 0;
        };
        const sorted = filtered.sort((a, b) => {
          const aBuilding = getBuildingOrder(a);
          const bBuilding = getBuildingOrder(b);
          if (aBuilding !== bBuilding) return aBuilding - bBuilding;

          const aBuildingName = getBuildingName(a);
          const bBuildingName = getBuildingName(b);
          if (aBuildingName !== bBuildingName) {
            return aBuildingName.localeCompare(bBuildingName, 'th');
          }

          // Within same building, keep "บ้านน้อย" at the end.
          const aBanNoi = isBanNoi(a);
          const bBanNoi = isBanNoi(b);
          if (aBanNoi !== bBanNoi) return aBanNoi ? 1 : -1;

          const af = getFloorOrder(a);
          const bf = getFloorOrder(b);
          if (af !== bf) return af - bf;

          const ar = getRoomOrder(a);
          const br = getRoomOrder(b);
          if (ar !== br) return ar - br;

          const aRaw = String(a.contract?.room?.number || '');
          const bRaw = String(b.contract?.room?.number || '');
          return aRaw.localeCompare(bRaw, 'th');
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

  const emptyText = useMemo(() => 'ไม่มีบิลสำหรับพิมพ์', []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
        กำลังเตรียมข้อมูลสำหรับพิมพ์...
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
    <div className="min-h-screen bg-white text-black">
      <style jsx global>{`
        @page {
          size: A5 landscape;
          margin: 0;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
        .room-print-sheet {
          page-break-after: always;
          break-after: page;
          width: 210mm;
          height: 148mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .room-print-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        @media print {
          .print-button {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed top-4 left-4 z-50 print-button">
        <button
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="button"
        >
          พิมพ์
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center text-slate-700">
          {emptyText}
        </div>
      ) : (
        invoices.map((invoice) => (
          <div key={invoice.id} className="room-print-sheet">
            <InvoicePrint id={invoice.id} invoice={invoice} />
          </div>
        ))
      )}
    </div>
  );
}

export default function PrintRoomsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-slate-700">กำลังเตรียมหน้าพิมพ์...</div>}>
      <PrintRoomsPage />
    </Suspense>
  );
}
