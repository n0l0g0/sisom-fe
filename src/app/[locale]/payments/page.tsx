'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Payment } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  MoreHorizontal,
  CreditCard,
  Banknote
} from 'lucide-react';

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
  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [room, status, month, year]);

  // Sync Filters to URL (Debounced for room)
  const updateFilters = (newRoom: string, newStatus: string, newMonth: number, newYear: number) => {
    const params = new URLSearchParams();
    if (newRoom) params.set('room', newRoom);
    if (newStatus) params.set('status', newStatus);
    if (newMonth) params.set('month', String(newMonth));
    if (newYear) params.set('year', String(newYear));
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
    // Implement export logic or reuse existing button logic if available
    alert('Export functionality coming soon'); 
  };

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">การชำระเงิน</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">ประวัติการชำระและการตรวจสอบสลิป</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            ล้างตัวกรอง
          </button>
          <button
            onClick={() => alert('Exporting...')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
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

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาห้อง..."
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
          <select
            value={month}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMonth(val);
              updateFilters(room, status, val, year);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              updateFilters(room, val, month, year);
            }}
            className="col-span-2 md:col-span-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุกสถานะ</option>
            <option value="PENDING">รอยืนยัน</option>
            <option value="VERIFIED">ตรวจสอบแล้ว</option>
            <option value="REJECTED">ปฏิเสธ</option>
          </select>
        </div>
        
        <button
          onClick={handleSearch}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          ค้นหา
        </button>
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
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">วันที่/เวลา</th>
                    <th className="px-6 py-4 font-medium">ห้อง</th>
                    <th className="px-6 py-4 font-medium">ผู้ชำระ</th>
                    <th className="px-6 py-4 font-medium text-right">จำนวนเงิน</th>
                    <th className="px-6 py-4 font-medium text-center">ช่องทาง</th>
                    <th className="px-6 py-4 font-medium text-center">สถานะ</th>
                    <th className="px-6 py-4 font-medium text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {pagedPayments.map((payment, idx) => (
                    <tr 
                      key={payment.id}
                      className={`
                        transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80
                        ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'}
                      `}
                    >
                      <td className="px-6 py-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{new Date(payment.paidAt).toLocaleDateString('th-TH')}</div>
                        <div className="text-xs text-slate-500">{new Date(payment.paidAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          {payment.invoice?.contract?.room?.number || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
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
              <div key={payment.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-md relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(payment.status)}`}></div>
                
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {payment.invoice?.contract?.room?.number || '-'}
                      </h3>
                      <span className="text-xs text-slate-500">{new Date(payment.paidAt).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      {payment.invoice?.contract?.tenant?.name || '-'}
                    </div>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>

                <div className="flex justify-between items-end pl-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PaymentMethodBadge hasSlip={!!payment.slipImageUrl} />
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">฿{Number(payment.amount).toLocaleString()}</div>
                  </div>
                  <PaymentActions payment={payment} mobile onSuccess={fetchData} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 px-4">
                หน้า <span className="text-slate-900 dark:text-white">{page}</span> จาก {totalPages}
              </div>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Sub-components

function KPICard({ title, value, color, icon, progress }: { title: string, value: string, color: 'slate' | 'emerald' | 'amber', icon: React.ReactNode, progress?: number }) {
  const colors = {
    slate: 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  };
  
  const [textClass, iconBg, iconColor] = colors[color].split(' '); // simplified mapping

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

function getStatusColor(status: string) {
  switch (status) {
    case 'VERIFIED': return 'bg-emerald-500';
    case 'PENDING': return 'bg-amber-500';
    case 'REJECTED': return 'bg-rose-500';
    default: return 'bg-slate-500';
  }
}

function PaymentActions({ payment, mobile, onSuccess }: { payment: Payment, mobile?: boolean, onSuccess?: () => void }) {
  const [loading, setLoading] = useState<'verify' | 'reject' | null>(null);
  const [showVerifyDate, setShowVerifyDate] = useState(false);
  const [paidAt, setPaidAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const canVerify = payment.status === 'PENDING'; // Allow verify even without slip for cash? Previous logic required slip. Let's stick to previous: canVerify = payment.status === 'PENDING' && !!payment.slipImageUrl;
  // Actually, previous logic was: const canVerify = payment.status === 'PENDING' && !!payment.slipImageUrl;
  // But maybe cash payments also need verification? The previous code enforced slip for verification. I will stick to it to not change logic.
  const hasSlip = !!payment.slipImageUrl;
  const isPending = payment.status === 'PENDING';

  const doVerify = async () => {
    try {
      const room = payment.invoice?.contract?.room?.number || '-';
      const amt = Number(payment.amount).toLocaleString('th-TH');
      const ok = window.confirm(`ยืนยันตัดยอดชำระเงินห้อง ${room} จำนวน ฿${amt} ?`);
      if (!ok) return;
      setLoading('verify');
      await api.confirmSlip({ paymentId: payment.id, status: 'VERIFIED', paidAt });
      if (onSuccess) onSuccess(); else window.location.reload();
    } catch (e) {
      alert((e as Error).message || 'ยืนยันการชำระเงินไม่สำเร็จ');
    } finally {
      setLoading(null);
    }
  };

  const doReject = async () => {
    try {
      const room = payment.invoice?.contract?.room?.number || '-';
      const ok = window.confirm(`ยืนยันปฏิเสธสลิปห้อง ${room} ?`);
      if (!ok) return;
      setLoading('reject');
      await api.confirmSlip({ paymentId: payment.id, status: 'REJECTED' });
      if (onSuccess) onSuccess(); else window.location.reload();
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
          <div className="relative">
             {/* Date picker for verify - minimal approach */}
             <input
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-0 h-0 opacity-0 absolute"
                id={`date-${payment.id}`}
             />
             <label 
               htmlFor={`date-${payment.id}`} 
               className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer block"
               title="เปลี่ยนวันที่รับชำระ"
             >
               <Clock className="w-4 h-4" />
             </label>
          </div>
          
          <button
            onClick={doVerify}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/20 transition-all"
          >
            {loading === 'verify' ? '...' : 'ยืนยัน'}
          </button>
          
          <button
            onClick={doReject}
            disabled={!!loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-900/20 transition-all"
          >
            {loading === 'reject' ? '...' : 'ปฏิเสธ'}
          </button>
        </>
      )}
    </div>
  );
}
