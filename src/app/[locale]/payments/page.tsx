'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Payment, Invoice } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PaymentActions from './PaymentActions';
import Filters from './Filters';

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#8b5a3c]">การชำระเงิน</h1>
              <p className="text-slate-500 text-sm mt-1">ประวัติการชำระเงินและตรวจสอบสลิปโอนเงิน</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-slate-500 text-center py-10">กำลังโหลด...</div>
          </div>
        </div>
      }
    >
      <PaymentsPageContent />
    </Suspense>
  );
}

function PaymentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const room = useMemo(() => searchParams.get('room') || undefined, [searchParams]);
  const status = useMemo(() => searchParams.get('status') || undefined, [searchParams]);
  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') || '10');
    const allowed = [10, 20, 50, 100];
    return allowed.includes(raw) ? raw : 10;
  }, [searchParams]);

  const [rawPayments, setRawPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const paymentsRes = await api.getPayments(room, status);
        if (cancelled) return;
        setRawPayments(paymentsRes);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [room, status]);

  const payments = useMemo(() => {
    return rawPayments
      .filter((p) => !status || p.status === status)
      .filter((p) => !room || (p.invoice?.contract?.room?.number || '').includes(room));
  }, [rawPayments, room, status]);

  const totalToday = useMemo(() => {
    return payments
      .filter((p) => new Date(p.paidAt).toDateString() === new Date().toDateString())
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [payments]);

  const pendingCount = useMemo(() => payments.filter((p) => p.status === 'PENDING').length, [payments]);
  const verifiedCount = useMemo(() => payments.filter((p) => p.status === 'VERIFIED').length, [payments]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(payments.length / pageSize));
  }, [payments.length, pageSize]);

  useEffect(() => {
    if (loading) return;
    if (payments.length === 0) return;
    if (page <= totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(totalPages));
    router.replace(`/payments?${params.toString()}`);
  }, [loading, page, payments.length, router, searchParams, totalPages]);

  const pagedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return payments.slice(start, start + pageSize);
  }, [page, pageSize, payments]);

  const currentRangeText = useMemo(() => {
    if (payments.length === 0) return '0-0 จาก 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, payments.length);
    return `${start}-${end} จาก ${payments.length}`;
  }, [page, pageSize, payments.length]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/payments?${params.toString()}`);
  };

  const setNextPageSize = (nextSize: number) => {
    const allowed = [10, 20, 50, 100];
    const size = allowed.includes(nextSize) ? nextSize : 10;
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(size));
    params.set('page', '1');
    router.push(`/payments?${params.toString()}`);
  };



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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">ยอดรับวันนี้</p>
            <p className="text-2xl font-bold text-[#f5a987] mt-1">฿{totalToday.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#f5a987]/10 flex items-center justify-center text-[#f5a987]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr className="bg-white border-b">
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  pagedPayments.map((payment) => (
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
                          ? `${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][Math.max(0, Math.min(11, payment.invoice.month - 1))]} ${payment.invoice.year}`
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
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">แสดง</div>
          <select
            value={pageSize}
            onChange={(e) => setNextPageSize(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="text-sm text-slate-600">รายการต่อหน้า</div>
          <div className="text-sm text-slate-500">{currentRangeText}</div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => goToPage(1)}
            disabled={loading || payments.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าแรก"
          >
            «
          </button>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={loading || payments.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ก่อนหน้า"
          >
            ‹
          </button>
          <div className="text-sm text-slate-700 px-2">
            หน้า {Math.min(page, totalPages)} / {totalPages}
          </div>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={loading || payments.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ถัดไป"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={loading || payments.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าสุดท้าย"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}


