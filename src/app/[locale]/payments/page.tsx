'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Payment } from '@/services/api';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard,
  Banknote
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">การชำระเงิน</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ประวัติการชำระและการตรวจสอบสลิป</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
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

  // Filter State
  const roomParam = searchParams.get('room') || '';
  const statusParam = searchParams.get('status') || '';
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  const [room, setRoom] = useState(roomParam);
  const [status, setStatus] = useState(statusParam);
  const [month, setMonth] = useState<number>(monthParam ? Number(monthParam) : new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(yearParam ? Number(yearParam) : new Date().getFullYear());
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const page = Number(searchParams.get('page') || '1');
  const pageSize = 10;

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getPayments(
        room || undefined, 
        status || undefined, 
        month || undefined, 
        year || undefined
      );
      setPayments(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [room, status, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync Filters to URL (Debounced for room)
  const updateFilters = (newRoom: string, newStatus: string, newMonth: number, newYear: number) => {
    const params = new URLSearchParams();
    if (newRoom) params.set('room', newRoom);
    if (newStatus) params.set('status', newStatus);
    if (newMonth) params.set('month', String(newMonth));
    if (newYear) params.set('year', String(newYear));
    // Reset page on filter change
    params.set('page', '1');
    router.push(`/payments?${params.toString()}`);
  };

  const handleSearch = () => {
    updateFilters(room, status, month, year);
  };

  const handleClear = () => {
    setRoom('');
    setStatus('');
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    router.push('/payments');
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    const totalToday = payments
      .filter((p) => new Date(p.paidAt).toDateString() === today)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    const verified = payments.filter((p) => p.status === 'VERIFIED').length;
    const pending = payments.filter((p) => p.status === 'PENDING').length;
    const total = payments.length;

    return { totalToday, verified, pending, total };
  }, [payments]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const pagedPayments = payments.slice((page - 1) * pageSize, page * pageSize);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(Math.max(1, Math.min(totalPages, p))));
    router.push(`/payments?${params.toString()}`);
  };

  const handleExport = () => {
    try {
      const data = payments.map(p => ({
        'วันที่': new Date(p.paidAt).toLocaleDateString('th-TH'),
        'เวลา': new Date(p.paidAt).toLocaleTimeString('th-TH'),
        'ห้อง': p.invoice?.contract?.room?.number || '-',
        'ตึก': p.invoice?.contract?.room?.building?.name || '-',
        'ผู้เช่า': p.invoice?.contract?.tenant?.name || '-',
        'จำนวนเงิน': Number(p.amount),
        'ช่องทาง': p.slipImageUrl ? 'โอนเงิน' : 'เงินสด',
        'สถานะ': p.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : p.status === 'PENDING' ? 'รอตรวจสอบ' : 'ปฏิเสธ'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payments");
      const fileName = `payments-${year}-${month}-${new Date().getTime()}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Export failed:", error);
      alert("เกิดข้อผิดพลาดในการ Export ข้อมูล");
    }
  };

  return (
    <div className="space-y-8 fade-in pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">การชำระเงิน</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">ประวัติการชำระและการตรวจสอบสลิป</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ล้างตัวกรอง
          </Button>
          <Button
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="ยอดรับวันนี้" 
          value={`฿${kpis.totalToday.toLocaleString()}`} 
          color="slate"
          icon={<Banknote className="w-5 h-5" />}
        />
        <KPICard 
          title="ตรวจสอบแล้ว" 
          value={`${kpis.verified} รายการ`} 
          color="emerald"
          icon={<CheckCircle2 className="w-5 h-5" />}
          progress={(kpis.verified / (kpis.total || 1)) * 100}
        />
        <KPICard 
          title="รอตรวจสอบ" 
          value={`${kpis.pending} รายการ`} 
          color="amber"
          icon={<Clock className="w-5 h-5" />}
          progress={(kpis.pending / (kpis.total || 1)) * 100}
        />
      </div>

      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="ค้นหาห้อง..."
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <select
              value={month}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMonth(val);
                updateFilters(room, status, val, year);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1]}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => {
                const val = Number(e.target.value);
                setYear(val);
                updateFilters(room, status, month, val);
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>
          
          <Button
            onClick={handleSearch}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            ค้นหา
          </Button>
        </div>

        {/* Quick Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          {[
            { id: '', label: 'ทั้งหมด' },
            { id: 'VERIFIED', label: 'ตรวจสอบแล้ว' },
            { id: 'PENDING', label: 'รอตรวจสอบ' },
            { id: 'REJECTED', label: 'ปฏิเสธ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatus(tab.id);
                updateFilters(room, tab.id, month, year);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                status === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูล...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">ไม่พบข้อมูลการชำระเงิน</h3>
          <p className="text-slate-500 mt-1">ลองปรับเปลี่ยนตัวกรองค้นหา</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium whitespace-nowrap">วันที่/เวลา</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">ห้อง</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">ผู้ชำระ</th>
                    <th className="px-6 py-4 font-medium text-right whitespace-nowrap">จำนวนเงิน</th>
                    <th className="px-6 py-4 font-medium text-center whitespace-nowrap">ช่องทาง</th>
                    <th className="px-6 py-4 font-medium text-center whitespace-nowrap">สถานะ</th>
                    <th className="px-6 py-4 font-medium text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {pagedPayments.map((payment, idx) => (
                    <tr 
                      key={payment.id}
                      className={`
                        transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
                        ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'}
                      `}
                    >
                      <td className="px-6 py-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{new Date(payment.paidAt).toLocaleDateString('th-TH')}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(payment.paidAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          {payment.invoice?.contract?.room?.number || '-'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {payment.invoice?.contract?.room?.building?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {payment.invoice?.contract?.tenant?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">฿{Number(payment.amount).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PaymentMethodBadge hasSlip={!!payment.slipImageUrl} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PaymentActions payment={payment} onSuccess={fetchData} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {pagedPayments.map((payment) => (
              <div key={payment.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {new Date(payment.paidAt).toLocaleDateString('th-TH')}
                      </span>
                      <PaymentMethodBadge hasSlip={!!payment.slipImageUrl} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {payment.invoice?.contract?.room?.number || '-'}
                      </h3>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        ฿{Number(payment.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                      {payment.invoice?.contract?.tenant?.name || '-'}
                    </div>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <PaymentActions payment={payment} mobile onSuccess={fetchData} />
                </div>
              </div>
            ))}
          </div>

          {/* Floating Filter Button (Mobile) */}
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="md:hidden fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 active:scale-95 transition-all z-50"
          >
            <Filter className="w-6 h-6" />
          </button>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = page;
                  if (totalPages > 5) {
                    if (page < 3) p = i + 1;
                    else if (page > totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                  } else {
                    p = i + 1;
                  }
                  
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "outline"}
                      className={page === p ? "bg-indigo-600 hover:bg-indigo-500 text-white" : ""}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Sub-components

function KPICard({ title, value, color, icon, progress }: { title: string, value: string, color: 'slate' | 'emerald' | 'amber', icon: React.ReactNode, progress?: number }) {
  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl dark:hover:bg-slate-750 group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className={`text-sm font-medium ${color === 'slate' ? 'text-slate-500 dark:text-slate-400' : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{title}</p>
            <h3 className={`text-3xl font-bold mt-1 tracking-tight ${color === 'slate' ? 'text-slate-900 dark:text-white' : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-100' : 'text-amber-600 dark:text-amber-100'}`}>{value}</h3>
          </div>
          <div className={`p-2 rounded-lg transition-colors ${color === 'slate' ? 'bg-slate-100 dark:bg-slate-700/50' : color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <div className={color === 'slate' ? 'text-slate-600 dark:text-slate-300' : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {icon}
            </div>
          </div>
        </div>
        {progress !== undefined && (
          <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5 mt-2">
            <div 
              className={`h-1.5 rounded-full transition-all duration-1000 ${color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'VERIFIED':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">ตรวจสอบแล้ว</span>;
    case 'PENDING':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">รอตรวจสอบ</span>;
    case 'REJECTED':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700">ปฏิเสธ</span>;
    default:
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{status}</span>;
  }
}

function PaymentMethodBadge({ hasSlip }: { hasSlip: boolean }) {
  if (hasSlip) {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 w-fit"><CreditCard className="w-3 h-3" /> โอนเงิน</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex items-center gap-1 w-fit"><Banknote className="w-3 h-3" /> เงินสด</span>;
}

function PaymentActions({ payment, mobile, onSuccess }: { payment: Payment, mobile?: boolean, onSuccess?: () => void }) {
  const [loading, setLoading] = useState<'verify' | 'reject' | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [paidAt, setPaidAt] = useState<string>(() => {
    // Default to payment.paidAt or now if invalid
    const d = payment.paidAt ? new Date(payment.paidAt) : new Date();
    // Format for datetime-local: YYYY-MM-DDThh:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const hasSlip = !!payment.slipImageUrl;
  const isPending = payment.status === 'PENDING';
  
  const room = payment.invoice?.contract?.room?.number || '-';
  const amount = Number(payment.amount).toLocaleString('th-TH');

  const doVerify = async () => {
    try {
      setLoading('verify');
      // Convert local time string back to ISO string if needed, or send as is if backend handles it.
      // Assuming backend expects ISO string.
      const dateObj = new Date(paidAt);
      await api.confirmSlip({ paymentId: payment.id, status: 'VERIFIED', paidAt: dateObj.toISOString() });
      setVerifyOpen(false);
      if (onSuccess) onSuccess();
    } catch (e) {
      alert((e as Error).message || 'ยืนยันการชำระเงินไม่สำเร็จ');
    } finally {
      setLoading(null);
    }
  };

  const doReject = async () => {
    try {
      setLoading('reject');
      await api.confirmSlip({ paymentId: payment.id, status: 'REJECTED' });
      setRejectOpen(false);
      if (onSuccess) onSuccess();
    } catch (e) {
      alert((e as Error).message || 'ปฏิเสธสลิปไม่สำเร็จ');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${mobile ? 'justify-end' : 'justify-center'}`}>
      {hasSlip && (
        <a
          href={payment.slipImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          title="ดูสลิป"
        >
          <FileText className="w-4 h-4" />
        </a>
      )}
      
      {isPending && hasSlip && (
        <>
          <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs">
                ยืนยัน
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>ยืนยันการชำระเงิน</DialogTitle>
                <DialogDescription>
                  ตรวจสอบข้อมูลการชำระเงินของห้อง {room}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    ยอดเงิน
                  </Label>
                  <div className="col-span-3 font-mono font-bold text-lg">
                    ฿{amount}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    วันที่ชำระ
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="date"
                      type="datetime-local"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerifyOpen(false)}>ยกเลิก</Button>
                <Button onClick={doVerify} disabled={loading === 'verify'}>
                  {loading === 'verify' ? 'กำลังบันทึก...' : 'ยืนยันถูกต้อง'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" className="h-8 text-xs bg-rose-600 hover:bg-rose-500">
                ปฏิเสธ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>ปฏิเสธสลิป</DialogTitle>
                <DialogDescription>
                  คุณต้องการปฏิเสธการชำระเงินของห้อง {room} ใช่หรือไม่?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-sm text-slate-500 dark:text-slate-400">
                เมื่อปฏิเสธแล้ว รายการนี้จะถูกเปลี่ยนสถานะเป็น "REJECTED" และผู้เช่าจะได้รับแจ้งเตือน
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>ยกเลิก</Button>
                <Button variant="destructive" onClick={doReject} disabled={loading === 'reject'}>
                  {loading === 'reject' ? 'กำลังดำเนินการ...' : 'ยืนยันการปฏิเสธ'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
