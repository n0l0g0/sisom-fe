'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Invoice, MeterReading } from '@/services/api';

type MeterPair = {
  current: MeterReading | null;
  previous: MeterReading | null;
};

function PrintAllPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');
  const keyParam = searchParams.get('key');
  const [ids, setIds] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meterByInvoiceId, setMeterByInvoiceId] = useState<Record<string, MeterPair>>({});
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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (invoices.length === 0) {
        setMeterByInvoiceId({});
        return;
      }
      try {
        const entries = await Promise.all(
          invoices.map(async (inv) => {
            const roomId = inv.contract?.room?.id;
            if (!roomId) return [inv.id, { current: null, previous: null }] as const;
            let pm = inv.month - 1;
            let py = inv.year;
            if (pm <= 0) {
              pm = 12;
              py -= 1;
            }
            const [currList, prevList] = await Promise.all([
              api.getMeterReadings(roomId, inv.month, inv.year),
              api.getMeterReadings(roomId, pm, py),
            ]);
            return [
              inv.id,
              {
                current: currList[0] || null,
                previous: prevList[0] || null,
              },
            ] as const;
          }),
        );
        if (cancelled) return;
        setMeterByInvoiceId(Object.fromEntries(entries));
      } catch {
        if (cancelled) return;
        setMeterByInvoiceId({});
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [invoices]);

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

  const groupedByBuilding = useMemo(() => {
    const groups = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      const buildingName =
        inv.contract?.room?.building?.name ||
        inv.contract?.room?.building?.code ||
        'ไม่ระบุตึก';
      if (!groups.has(buildingName)) groups.set(buildingName, []);
      groups.get(buildingName)!.push(inv);
    }
    return Array.from(groups.entries()).map(([buildingName, rows]) => ({
      buildingName,
      rows,
      subtotal: rows.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0),
      subtotalRent: rows.reduce((sum, inv) => sum + Number(inv.rentAmount ?? 0), 0),
      subtotalWater: rows.reduce((sum, inv) => sum + Number(inv.waterAmount ?? 0), 0),
      subtotalElectric: rows.reduce((sum, inv) => sum + Number(inv.electricAmount ?? 0), 0),
      subtotalWaterUnits: rows.reduce((sum, inv) => {
        const p = meterByInvoiceId[inv.id];
        const v =
          p?.current && p?.previous
            ? Math.max(0, Number(p.current.waterReading) - Number(p.previous.waterReading))
            : 0;
        return sum + v;
      }, 0),
      subtotalElectricUnits: rows.reduce((sum, inv) => {
        const p = meterByInvoiceId[inv.id];
        const v =
          p?.current && p?.previous
            ? Math.max(0, Number(p.current.electricReading) - Number(p.previous.electricReading))
            : 0;
        return sum + v;
      }, 0),
    }));
  }, [invoices, meterByInvoiceId]);

  const totals = useMemo(() => {
    return {
      rent: invoices.reduce((sum, inv) => sum + Number(inv.rentAmount ?? 0), 0),
      water: invoices.reduce((sum, inv) => sum + Number(inv.waterAmount ?? 0), 0),
      electric: invoices.reduce((sum, inv) => sum + Number(inv.electricAmount ?? 0), 0),
      total: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0),
    };
  }, [invoices]);

  const pages = useMemo(() => {
    if (groupedByBuilding.length === 0) return [];
    return groupedByBuilding;
  }, [groupedByBuilding]);

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
          padding: 12mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .arrears-page.page-break {
          page-break-after: always;
          break-after: page;
        }
        .arrears-page.page-break:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        table.arrears-table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }

        table.arrears-table th,
        table.arrears-table td {
          border: 1px solid #000;
          padding: 1px 3px;
          font-size: 15px;
          height: 24px;
          line-height: 1.1;
          vertical-align: middle;
        }

        table.arrears-table th {
          background-color: #f5f5f5;
        }
        .building-row td {
          background: #f0f4ff;
          font-weight: 700;
        }
        .number-cell {
          text-align: right;
          white-space: nowrap;
        }
        .left-cell {
          text-align: left;
        }
        .center-cell {
          text-align: center;
        }
        .print-area {
          flex: 1;
        }
        .red {
          color: #ff0000;
          font-weight: 700;
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
      <div className="flex justify-between items-center mb-4 print-button p-4">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          พิมพ์
        </button>
      </div>
      {pages.map((group, pageIndex) => (
        <div key={`page-${pageIndex}`} className="arrears-page page-break">
          <div className="mb-1 text-right" style={{ fontSize: '17px' }}>หน้า {pageIndex + 1}/{pages.length}</div>
          <h1 className="font-bold text-center mb-2" style={{ color: '#ff0000', fontSize: '35px' }}>
            {thaiMonthLabel}
          </h1>
          <p className="text-center font-bold mb-4" style={{ fontSize: '21px' }}>ตึก/หอ: {group.buildingName}</p>
          <div className="print-area">
            <table className="arrears-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '7%' }}>ห้อง</th>
                  <th colSpan={4}>น้ำ</th>
                  <th colSpan={4}>ไฟ</th>
                  <th rowSpan={2} style={{ width: '8%' }}>ค่าเช่า</th>
                  <th rowSpan={2} style={{ width: '9%' }}>รวม</th>
                  <th rowSpan={2} style={{ width: '16%' }}>หมายเหตุ</th>
                </tr>
                <tr>
                  <th style={{ width: '7%' }}>ใหม่</th>
                  <th style={{ width: '7%' }}>เก่า</th>
                  <th style={{ width: '6%' }}>หน่วย</th>
                  <th style={{ width: '7%' }}>ค่าน้ำ</th>
                  <th style={{ width: '7%' }}>ใหม่</th>
                  <th style={{ width: '7%' }}>เก่า</th>
                  <th style={{ width: '6%' }}>หน่วย</th>
                  <th style={{ width: '7%' }}>ค่าไฟ</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((inv) => {
                  const meter = meterByInvoiceId[inv.id];
                  const waterNew = meter?.current?.waterReading ?? null;
                  const waterOld = meter?.previous?.waterReading ?? null;
                  const electricNew = meter?.current?.electricReading ?? null;
                  const electricOld = meter?.previous?.electricReading ?? null;
                  const waterUnits =
                    waterNew != null && waterOld != null
                      ? Math.max(0, Number(waterNew) - Number(waterOld))
                      : 0;
                  const electricUnits =
                    electricNew != null && electricOld != null
                      ? Math.max(0, Number(electricNew) - Number(electricOld))
                      : 0;
                  const itemText = (inv.items || [])
                    .filter((it) => Number(it.amount || 0) > 0)
                    .map((it) => it.description?.trim())
                    .filter(Boolean)
                    .join(', ');
                  const noteParts = [
                    inv.note?.trim(),
                    inv.discountNote?.trim() ? `ส่วนลด: ${inv.discountNote.trim()}` : '',
                    itemText ? `เพิ่มเติม: ${itemText}` : '',
                  ].filter(Boolean);
                  const reportNote = noteParts.join(' | ');
                  return (
                    <tr key={inv.id}>
                      <td className="center-cell">{inv.contract?.room?.number ?? ''}</td>
                      <td className="number-cell">{waterNew != null ? Number(waterNew).toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{waterOld != null ? Number(waterOld).toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{waterUnits > 0 ? waterUnits.toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{Number(inv.waterAmount ?? 0).toLocaleString('th-TH')}</td>
                      <td className="number-cell">{electricNew != null ? Number(electricNew).toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{electricOld != null ? Number(electricOld).toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{electricUnits > 0 ? electricUnits.toLocaleString('th-TH') : '-'}</td>
                      <td className="number-cell">{Number(inv.electricAmount ?? 0).toLocaleString('th-TH')}</td>
                      <td className="number-cell">{Number(inv.rentAmount ?? 0).toLocaleString('th-TH')}</td>
                      <td className="number-cell">{Number(inv.totalAmount ?? 0).toLocaleString('th-TH')}</td>
                      <td className="left-cell">{reportNote}</td>
                    </tr>
                  );
                })}
                {group.rows.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center' }}>
                      ไม่มีห้องค้างชำระ
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    รวมตึก {group.buildingName}
                  </td>
                  <td />
                  <td />
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotalWaterUnits.toLocaleString('th-TH')}
                  </td>
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotalWater.toLocaleString('th-TH')}
                  </td>
                  <td />
                  <td />
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotalElectricUnits.toLocaleString('th-TH')}
                  </td>
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotalElectric.toLocaleString('th-TH')}
                  </td>
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotalRent.toLocaleString('th-TH')}
                  </td>
                  <td className="number-cell" style={{ fontWeight: 700 }}>
                    {group.subtotal.toLocaleString('th-TH')}
                  </td>
                  <td />
                </tr>
                {pageIndex === pages.length - 1 && (
                  <tr>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      รวมทั้งหมด
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="number-cell" style={{ fontWeight: 700 }}>
                      {totals.water.toLocaleString('th-TH')}
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="number-cell" style={{ fontWeight: 700 }}>
                      {totals.electric.toLocaleString('th-TH')}
                    </td>
                    <td className="number-cell" style={{ fontWeight: 700 }}>
                      {totals.rent.toLocaleString('th-TH')}
                    </td>
                    <td className="number-cell" style={{ fontWeight: 700 }}>
                      {totals.total.toLocaleString('th-TH')}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {pages.length === 0 && (
        <div className="arrears-page">
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#ff0000' }}>
            {thaiMonthLabel}
          </h1>
          <p className="text-center text-sm mb-4">ไม่มีห้องค้างชำระ</p>
        </div>
      )}
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
