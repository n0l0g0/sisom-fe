'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, Invoice, MeterReading } from '@/services/api';

const QR_URL =
  'https://line-sisom.washqueue.com/api/media/L_gainfriends_2dbarcodes_BW.png';

function formatMonthYearThai(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDateThai(d: Date) {
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function InvoicePrint({
  invoice: initialInvoice,
  id,
  pageBreak = false,
}: {
  invoice?: Invoice;
  id: string;
  pageBreak?: boolean;
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [currentMR, setCurrentMR] = useState<MeterReading | null>(null);
  const [prevMR, setPrevMR] = useState<MeterReading | null>(null);
  const [dormConfig, setDormConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialInvoice);
  const searchParams = useSearchParams();
  const printButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api.getDormConfig().then(setDormConfig).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (invoice) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getInvoice(id);
        if (cancelled) return;
        setInvoice(data);
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
  }, [id, invoice]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!invoice) return;
      try {
        if (invoice.contract?.room?.id) {
          const roomId = invoice.contract.room.id;
          const list = await api.getMeterReadings(roomId, invoice.month, invoice.year);
          if (!cancelled) {
            setCurrentMR(list[0] || null);
          }
          let pm = invoice.month - 1;
          let py = invoice.year;
          if (pm <= 0) {
            pm = 12;
            py = invoice.year - 1;
          }
          const prevList = await api.getMeterReadings(roomId, pm, py);
          if (!cancelled) {
            setPrevMR(prevList[0] || null);
          }
        }
      } catch (e) {
        // silent
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  useEffect(() => {
    if (!loading && !error) {
      const auto = searchParams.get('auto');
      if (auto === '1') {
        // This is handled by the print-all page now
      }
    }
  }, [loading, error, searchParams]);

  const usage = useMemo(() => {
    const waterUnits =
      currentMR && prevMR
        ? Math.max(
            0,
            Number(currentMR.waterReading) - Number(prevMR.waterReading),
          )
        : 0;
    const electricUnits =
      currentMR && prevMR
        ? Math.max(
            0,
            Number(currentMR.electricReading) - Number(prevMR.electricReading),
          )
        : 0;
    return { waterUnits, electricUnits };
  }, [currentMR, prevMR]);

  const total =
    invoice &&
    Number(invoice.rentAmount) +
      Number(invoice.waterAmount) +
      Number(invoice.electricAmount) +
      Number(invoice.otherFees || 0) -
      Number(invoice.discount || 0);

  if (loading) {
    return (
      <div className="w-[210mm] min-h-[148mm] flex items-center justify-center bg-slate-100 text-slate-600">
        กำลังโหลดบิล {id}...
      </div>
    );
  }

  if (!invoice || error) {
    return (
      <div className="w-[210mm] min-h-[148mm] flex items-center justify-center bg-red-100 text-red-600">
        {error || `ไม่พบบิล ${id}` }
      </div>
    );
  }

  const monthLabel = formatMonthYearThai(invoice.year, invoice.month);
  const todayLabel = formatDateThai(new Date());
  const tenantName = invoice.contract?.tenant?.name || '';
  const roomNumber = invoice.contract?.room?.number || '';
  const sanitizedRoomNumber = roomNumber.replace(/^\s*B\s*/i, '').trim();

  const getDateMinusOneMonth = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() - 1);
    if (d.getDate() < day) {
      d.setDate(0);
    }
    return d;
  };
  const now = new Date();
  const currentWaterDateValue = new Date(
    now.getFullYear(),
    now.getMonth(),
    22,
  );
  const prevWaterDateValue = getDateMinusOneMonth(currentWaterDateValue);
  const currentWaterDate = formatDateThai(currentWaterDateValue);
  const prevWaterDate = formatDateThai(prevWaterDateValue);
  const prevElectricDate = prevWaterDate;
  const currentElectricDate = currentWaterDate;

  const buildingLabel =
    invoice.contract?.room?.building?.name ||
    invoice.contract?.room?.building?.code ||
    '';
  const buildingNumber =
    invoice.contract?.room?.building?.code ||
    (invoice.contract?.room?.building?.name || '').match(/\d+/)?.[0] ||
    '';
  const bankAccountText = (dormConfig?.bankAccount || '').trim();
  const bankAccountParts = bankAccountText ? bankAccountText.split('เลขที่บัญชี') : [];

  return (
    <div
      className="print-area bg-white text-black border border-black box-border flex flex-col"
      style={{
        width: '210mm',
        height: '148mm',
        padding: '10mm',
        boxSizing: 'border-box',
      }}
    >
      <div className="top-right text-right text-xs">ไม่ใช่ใบเสร็จรับเงิน</div>

      <div className="text-center mt-2">
        <div className="text-[26px] font-semibold">ใบแจ้งค่าเช่าห้อง</div>
        <div className="text-[15px] mt-1">ประจำเดือน {monthLabel}</div>
      </div>

      <div className="flex justify-between text-[12px] mt-3">
        <div>
          <div>{buildingLabel}/{sanitizedRoomNumber || '-'}</div>
          <div>ชื่อ-นามสกุล: {tenantName || '-'}</div>
        </div>
        <div className="text-right">
          <div>วันที่: {todayLabel}</div>
        </div>
      </div>

      <div className="flex-grow mt-3">
        <table className="w-full text-[12px] border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="border border-black p-1">รายการ</th>
              <th className="border border-black p-1">วัน/เดือน/ปี</th>
              <th className="border border-black p-1">จดครั้งก่อน</th>
              <th className="border border-black p-1">วัน/เดือน/ปี</th>
              <th className="border border-black p-1">จดครั้งหลัง</th>
              <th className="border border-black p-1">หน่วยที่ใช้</th>
              <th className="border border-black p-1">หน่วยละ</th>
              <th className="border border-black p-1 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1">ค่าเช่า</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-right">
                {Number(invoice.rentAmount).toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">ค่าน้ำประปา</td>
              <td className="border border-black p-1 text-center">{prevWaterDate}</td>
              <td className="border border-black p-1 text-center">{prevMR?.waterReading ?? '-'}</td>
              <td className="border border-black p-1 text-center">{currentWaterDate}</td>
              <td className="border border-black p-1 text-center">{currentMR?.waterReading ?? '-'}</td>
              <td className="border border-black p-1 text-center">{usage.waterUnits.toFixed(0)}</td>
              <td className="border border-black p-1 text-center">{dormConfig?.waterUnitPrice ?? '-'}</td>
              <td className="border border-black p-1 text-right">
                {Number(invoice.waterAmount).toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1">ค่าไฟฟ้า</td>
              <td className="border border-black p-1 text-center">{prevElectricDate}</td>
              <td className="border border-black p-1 text-center">{prevMR?.electricReading ?? '-'}</td>
              <td className="border border-black p-1 text-center">{currentElectricDate}</td>
              <td className="border border-black p-1 text-center">{currentMR?.electricReading ?? '-'}</td>
              <td className="border border-black p-1 text-center">{usage.electricUnits.toFixed(0)}</td>
              <td className="border border-black p-1 text-center">{dormConfig?.electricUnitPrice ?? '-'}</td>
              <td className="border border-black p-1 text-right">
                {Number(invoice.electricAmount).toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            {invoice.otherFees > 0 && (
              <tr>
                <td className="border border-black p-1">ค่าบริการอื่นๆ</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-right">
                  {Number(invoice.otherFees).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            )}
            {invoice.discount > 0 && (
              <tr>
                <td className="border border-black p-1">ส่วนลด</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-right text-red-600">
                  -
                  {Number(invoice.discount).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="border border-black p-1 text-right" colSpan={7}>
                รวมเป็นเงินทั้งสิ้น
              </td>
              <td className="border border-black p-1 text-right">
                {(total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="footer-section mt-auto pt-3 text-xs flex justify-between items-start gap-4">
        <div className="w-1/2 pr-4">
          <div className="font-semibold">หมายเหตุ:</div>
          <ul className="list-disc list-inside pl-2">
            <li>กรุณาชำระภายในวันที่ 5 ของทุกเดือน</li>
            {bankAccountText && (
              <li className="leading-snug">
                ชำระโดยการโอนเงินที่ <br />
                <span className="break-words">
                  {bankAccountParts.length > 1 ? (
                    <>
                      {bankAccountParts[0].trim()}
                      <br />
                      เลขที่บัญชี {bankAccountParts.slice(1).join('เลขที่บัญชี').trim()}
                    </>
                  ) : (
                    bankAccountText
                  )}
                </span>
              </li>
            )}
          </ul>
        </div>
        <div className="w-1/2 flex justify-end items-center gap-4">
          <div className="text-center">
            <div className="font-semibold">ติดต่อสอบถาม</div>
            <div>โทร. 092 426 9477</div>
            <div>Line ID: @sisomoffice</div>
            <div>เนื่องด้วยหอพักได้เปลี่ยนระบบใหม่ใช้ Line ในการบริหารจัดการ และจะยกเลิกระบบเดิมของ Application Horganice</div>
          </div>
          <div className="w-24 h-24 bg-white p-1 border">
            <img
              src={QR_URL}
              alt="Line QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  if (!params.id) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black text-base">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
        @page {
          size: A5 landscape;
          margin: 10mm;
        }
        body {
          margin: 0;
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
            display: none;
          }
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .footer-section {
            page-break-inside: avoid;
          }
          ul,
          li {
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="fixed top-4 left-4 z-50 print-button">
        <button
          onClick={() => window.print()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          พิมพ์
        </button>
      </div>
      <InvoicePrint id={params.id} />
    </div>
  );
}
