'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, DormConfig, Invoice, Room } from '@/services/api';

type RoomReportRow = {
  id: string;
  roomLabel: string;
  waterNew: string;
  waterOld: string;
  waterUnits: number;
  waterAmount: number;
  electricNew: string;
  electricOld: string;
  electricUnits: number;
  electricAmount: number;
  rentAmount: number;
  totalAmount: number;
  note: string;
};

function formatDateThai(d: Date) {
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMonthYearThai(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

function getDateMinusOneMonth(date: Date) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() - 1);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function DormSummaryReportInner() {
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const month = Number(searchParams.get('month')) || today.getMonth() + 1;
  const year = Number(searchParams.get('year')) || today.getFullYear();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<DormConfig | null>(null);
  const [rows, setRows] = useState<
    Array<{ buildingLabel: string; items: RoomReportRow[] }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [roomsRes, invoicesRes, configRes] = await Promise.all([
          api.getRooms(),
          api.getInvoices(),
          api.getDormConfig(),
        ]);
        if (cancelled) return;
        setRooms(roomsRes);
        setInvoices(invoicesRes);
        setConfig(configRes);
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
    let cancelled = false;
    const run = async () => {
      if (!rooms.length) {
        setRows([]);
        return;
      }
      const targetInvoices = invoices.filter(
        (inv) => inv.month === month && inv.year === year,
      );
      const invoiceByRoom = new Map<string, Invoice>();
      targetInvoices.forEach((inv) => {
        const roomId = inv.contract?.room?.id;
        if (roomId && !invoiceByRoom.has(roomId)) {
          invoiceByRoom.set(roomId, inv);
        }
      });

      const prevMonth = month - 1 <= 0 ? 12 : month - 1;
      const prevYear = month - 1 <= 0 ? year - 1 : year;

      const roomReports = await Promise.all(
        rooms.map(async (room) => {
          const [currentList, prevList] = await Promise.all([
            api.getMeterReadings(room.id, month, year).catch(() => []),
            api.getMeterReadings(room.id, prevMonth, prevYear).catch(() => []),
          ]);
          const currentMR = currentList[0] || null;
          const prevMR = prevList[0] || null;
          const invoice = invoiceByRoom.get(room.id);

          const currentDateValue = currentMR?.createdAt
            ? new Date(currentMR.createdAt)
            : new Date(year, month - 1, 22);
          const prevDateValue = getDateMinusOneMonth(currentDateValue);
          const waterUnits =
            currentMR && prevMR
              ? Math.max(
                  0,
                  Number(currentMR.waterReading) -
                    Number(prevMR.waterReading),
                )
              : 0;
          const electricUnits =
            currentMR && prevMR
              ? Math.max(
                  0,
                  Number(currentMR.electricReading) -
                    Number(prevMR.electricReading),
                )
              : 0;

          const waterUnitPrice = Number(config?.waterUnitPrice || 0);
          const electricUnitPrice = Number(config?.electricUnitPrice || 0);

          const waterAmount =
            invoice?.waterAmount !== undefined && invoice?.waterAmount !== null
              ? Number(invoice.waterAmount)
              : waterUnits * waterUnitPrice;
          const electricAmount =
            invoice?.electricAmount !== undefined &&
            invoice?.electricAmount !== null
              ? Number(invoice.electricAmount)
              : electricUnits * electricUnitPrice;
          const rentAmount =
            invoice?.rentAmount !== undefined && invoice?.rentAmount !== null
              ? Number(invoice.rentAmount)
              : Number(room.pricePerMonth || 0);
          const totalAmount =
            invoice?.totalAmount !== undefined && invoice?.totalAmount !== null
              ? Number(invoice.totalAmount)
              : rentAmount + waterAmount + electricAmount;

          const roomLabel =
            room.number ||
            invoice?.contract?.room?.number ||
            room.id.slice(0, 4);
          const note = room.status === 'VACANT' ? 'ห้องว่าง' : '';

          return {
            id: room.id,
            buildingLabel:
              room.building?.name || room.building?.code || 'ไม่ระบุหอ',
            row: {
              id: room.id,
              roomLabel,
              waterNew: currentMR ? String(currentMR.waterReading) : '-',
              waterOld: prevMR ? String(prevMR.waterReading) : '-',
              waterUnits,
              waterAmount,
              electricNew: currentMR ? String(currentMR.electricReading) : '-',
              electricOld: prevMR ? String(prevMR.electricReading) : '-',
              electricUnits,
              electricAmount,
              rentAmount,
              totalAmount,
              note,
            } as RoomReportRow,
          };
        }),
      );
      if (cancelled) return;

      const sorted = roomReports.sort((a, b) => {
        if (a.buildingLabel !== b.buildingLabel) {
          return a.buildingLabel.localeCompare(b.buildingLabel);
        }
        return a.row.roomLabel.localeCompare(b.row.roomLabel, undefined, {
          numeric: true,
        });
      });

      const grouped = sorted.reduce(
        (acc, curr) => {
          const last = acc[acc.length - 1];
          if (!last || last.buildingLabel !== curr.buildingLabel) {
            acc.push({ buildingLabel: curr.buildingLabel, items: [curr.row] });
          } else {
            last.items.push(curr.row);
          }
          return acc;
        },
        [] as Array<{ buildingLabel: string; items: RoomReportRow[] }>,
      );

      setRows(grouped);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [rooms, invoices, config, month, year]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
        กำลังโหลดรายงาน...
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

  const reportMonth = month === 12 ? 1 : month + 1;
  const reportYear = month === 12 ? year + 1 : year;
  const monthLabel = formatMonthYearThai(reportYear, reportMonth);

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

        .dorm-page {
          width: 210mm;
          height: 297mm;
          padding: 15mm;
          box-sizing: border-box;
        }

        .dorm-page table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .dorm-page th,
        .dorm-page td {
          padding: 4px;
          font-size: 13px;
        }

        .dorm-page th.note-col,
        .dorm-page td.note-col {
          width: 16%;
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
      <div className="fixed top-4 left-4 z-50 print-button">
        <button
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          พิมพ์ A4
        </button>
      </div>
      {rows
        ?.filter((group) => group?.items?.length > 0)
        ?.map((group, index, arr) => {
          const totals = group.items.reduce(
            (acc, row) => ({
              waterUnits: acc.waterUnits + row.waterUnits,
              waterAmount: acc.waterAmount + row.waterAmount,
              electricUnits: acc.electricUnits + row.electricUnits,
              electricAmount: acc.electricAmount + row.electricAmount,
              rentAmount: acc.rentAmount + row.rentAmount,
              totalAmount: acc.totalAmount + row.totalAmount,
            }),
            {
              waterUnits: 0,
              waterAmount: 0,
              electricUnits: 0,
              electricAmount: 0,
              rentAmount: 0,
              totalAmount: 0,
            },
          );
          const isAllVacant = group.items.every(
            (row) => row.note && row.note.trim() === 'ห้องว่าง',
          );
          if (isAllVacant && totals.totalAmount === 0) {
            return null;
          }
          const isLast = index === arr.length - 1;
          return (
            <div
              key={group.buildingLabel || index}
              className="dorm-page flex flex-col"
              style={{
                breakAfter: isLast ? 'auto' : 'page',
                pageBreakAfter: isLast ? 'auto' : 'always',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-semibold">{group.buildingLabel}</div>
                <div className="text-2xl font-bold text-red-600">
                  {monthLabel}
                </div>
                <div className="w-24" />
              </div>
              <table className="border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={2}
                    >
                      ห้อง
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center"
                      colSpan={4}
                    >
                      น้ำ
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center"
                      colSpan={4}
                    >
                      ไฟ
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center"
                      rowSpan={2}
                    >
                      ค่าเช่า
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center note-col"
                      rowSpan={2}
                    >
                      รวม
                    </th>
                    <th
                      className="border border-black px-2 py-1 text-center note-col"
                      rowSpan={2}
                    >
                      หมายเหตุ
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1 text-center">
                      ใหม่
                    </th>
                    <th className="border border-black px-2 py-1 text-center">
                      เก่า
                    </th>
                    <th className="border border-black px-2 py-1 text-center">
                      หน่วย
                    </th>
                    <th className="border border-black px-2 py-1 text-center text-red-600">
                      ค่าน้ำ
                    </th>
                    <th className="border border-black px-2 py-1 text-center">
                      ใหม่
                    </th>
                    <th className="border border-black px-2 py-1 text-center">
                      เก่า
                    </th>
                    <th className="border border-black px-2 py-1 text-center">
                      หน่วย
                    </th>
                    <th className="border border-black px-2 py-1 text-center text-red-600">
                      ค่าไฟ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center font-semibold">
                        {row.roomLabel}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.waterNew}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.waterOld}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.waterUnits.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center text-red-600">
                        {row.waterAmount.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.electricNew}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.electricOld}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.electricUnits.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center text-red-600">
                        {row.electricAmount.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">
                        {row.rentAmount.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center font-semibold note-col">
                        {row.totalAmount.toLocaleString('th-TH')}
                      </td>
                      <td className="border border-black px-2 py-1 text-center note-col">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="border border-black px-2 py-1 text-center font-semibold">
                      รวมยอด
                    </td>
                    <td className="border border-black px-2 py-1" colSpan={2} />
                    <td className="border border-black px-2 py-1 text-center text-red-600 font-semibold">
                      {totals.waterUnits.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1 text-center text-red-600 font-semibold">
                      {totals.waterAmount.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1" colSpan={2} />
                    <td className="border border-black px-2 py-1 text-center text-red-600 font-semibold">
                      {totals.electricUnits.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1 text-center text-red-600 font-semibold">
                      {totals.electricAmount.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-semibold">
                      {totals.rentAmount.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1 text-center font-semibold note-col">
                      {totals.totalAmount.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black px-2 py-1" />
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
    </div>
  );
}

export default function DormSummaryReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-700">
          กำลังโหลดรายงาน...
        </div>
      }
    >
      <DormSummaryReportInner />
    </Suspense>
  );
}
