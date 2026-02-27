'use client';

import { api, Payment } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentActions from './PaymentActions';
import Filters from './Filters';

export default function PaymentsClient() {
  const sp = useSearchParams();
  const room = sp.get('room') || '';
  const status = sp.get('status') || '';
  return <PaymentsClientInner key={`${room}|${status}`} room={room} status={status} />;
}

function PaymentsClientInner({ room, status }: { room: string; status: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getPayments(room || undefined, status || undefined)
      .then((p) => {
        if (cancelled) return;
        setPayments(p);
      })
      .catch(() => {
        if (cancelled) return;
        setPayments([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [room, status]);

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => !status || p.status === status)
      .filter((p) => !room || (p.invoice?.contract?.room?.number || '').includes(room));
  }, [payments, room, status]);

  const totalToday = useMemo(() => {
    const today = new Date().toDateString();
    return filteredPayments
      .filter((p) => new Date(p.paidAt).toDateString() === today)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [filteredPayments]);

  const pendingCount = useMemo(
    () => filteredPayments.filter((p) => p.status === 'PENDING').length,
    [filteredPayments],
  );
  const verifiedCount = useMemo(
    () => filteredPayments.filter((p) => p.status === 'VERIFIED').length,
    [filteredPayments],
  );

  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#8b5a3c]">การชำระเงิน</h1>
          <p className="text-slate-500 text-sm mt-1">ประวัติการชำระเงินและตรวจสอบสลิปโอนเงิน</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg border border-[#f5a987] text-[#f5a987] hover:bg-[#f5a987]/10 transition">
            Export Excel
          </button>
        </div>
      </div>

      <Filters defaultRoom={room} defaultStatus={status} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">ยอดรับวันนี้</p>
            <p className="text-2xl font-bold text-[#f5a987] mt-1">฿{totalToday.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f5a987]/10 flex items-center justify-center text-[#f5a987]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">ตรวจสอบแล้ว</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{verifiedCount} รายการ</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">รอตรวจสอบ</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount} รายการ</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">วันที่/เวลา</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ตึก</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ห้อง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ผู้ชำระ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">จำนวนเงิน</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">เดือนที่ชำระ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">ช่องทาง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">หลักฐาน</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="bg-white border-b">
                    <td className="px-6 py-6 text-slate-500" colSpan={9}>
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr className="bg-white border-b">
                    <td className="px-6 py-6 text-slate-500" colSpan={9}>
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">
                        <div>{new Date(payment.paidAt).toLocaleDateString('th-TH')}</div>
                        <div className="text-xs text-slate-400">{new Date(payment.paidAt).toLocaleTimeString('th-TH')}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {payment.invoice?.contract?.room?.building?.name || payment.invoice?.contract?.room?.building?.code || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#8b5a3c]">{payment.invoice?.contract?.room?.number}</td>
                      <td className="px-6 py-4 text-slate-600">{payment.invoice?.contract?.tenant?.name}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">฿{Number(payment.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {payment.invoice
                          ? `${['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][Math.max(0, Math.min(11, payment.invoice.month - 1))]} ${payment.invoice.year}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            payment.slipImageUrl ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {payment.slipImageUrl ? 'โอนเงิน' : 'เงินสด'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={payment.status === 'VERIFIED' ? 'secondary' : 'outline'}
                          className={
                            payment.status === 'VERIFIED'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none'
                              : payment.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {payment.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : payment.status === 'PENDING' ? 'รอยืนยัน' : 'ปฏิเสธ'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {payment.slipImageUrl && (
                          <a
                            href={payment.slipImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f5a987] hover:text-[#e09b7d] text-sm flex items-center justify-center gap-1 mx-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            ดูสลิป
                          </a>
                        )}
                        <PaymentActions payment={payment} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
