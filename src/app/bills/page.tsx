'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api, Invoice, Room } from '@/services/api';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import SendInvoiceButton from './SendInvoiceButton';
import SendAllBar from './SendAllBar';
import PrintAllBar from './PrintAllBar';
import AutoSendSettingsDialog from './AutoSendSettingsDialog';

export default function BillsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#8b5a3c]">บิลค่าเช่า</h1>
              <p className="text-slate-500 text-sm mt-1">จัดการใบแจ้งหนี้และสถานะการชำระเงิน</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-slate-500 text-center py-10">กำลังโหลด...</div>
          </div>
        </div>
      }
    >
      <BillsPageContent />
    </Suspense>
  );
}

function BillsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') || '10');
    const allowed = [10, 20, 50, 100];
    return allowed.includes(raw) ? raw : 10;
  }, [searchParams]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [invoicesRes, roomsRes] = await Promise.all([
          api.getInvoices(),
          api.getRooms(),
        ]);
        if (cancelled) return;
        setInvoices(invoicesRes);
        setRooms(roomsRes);
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: any;
    const refetch = async () => {
      if (cancelled) return;
      try {
        const [invoicesRes, roomsRes] = await Promise.all([
          api.getInvoices(),
          api.getRooms(),
        ]);
        if (cancelled) return;
        setInvoices(invoicesRes);
        setRooms(roomsRes);
      } catch {}
    };
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    timer = setInterval(refetch, 8000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer) clearInterval(timer);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL'|'DRAFT'|'SENT'|'PAID'|'OVERDUE'|'CANCELLED'>('ALL');

  const monthFilteredInvoices = useMemo(() => {
    let result = invoices;
    if (selectedMonthKey) {
      const [yearStr, monthStr] = selectedMonthKey.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      result = result.filter((inv) => inv.year === year && inv.month === month);
    }
    return result;
  }, [invoices, selectedMonthKey]);

  const filteredInvoices = useMemo(() => {
    let result = monthFilteredInvoices;
    if (statusFilter !== 'ALL') {
      result = result.filter((inv) => inv.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.contract?.room?.number?.toLowerCase().includes(lower) ||
          inv.contract?.tenant?.name?.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [monthFilteredInvoices, searchTerm, statusFilter]);

  const arrearsInvoices = useMemo(
    () => monthFilteredInvoices.filter((i) => i.status === 'OVERDUE'),
    [monthFilteredInvoices],
  );

  const totalPending = useMemo(
    () =>
      filteredInvoices
        .filter((i) => i.status === 'SENT')
        .reduce((acc, curr) => acc + Number(curr.totalAmount), 0),
    [filteredInvoices],
  );
  const totalPaid = useMemo(
    () =>
      filteredInvoices
        .filter((i) => i.status === 'PAID')
        .reduce((acc, curr) => acc + Number(curr.totalAmount), 0),
    [filteredInvoices],
  );
  const totalOverdue = useMemo(
    () =>
      filteredInvoices
        .filter((i) => i.status === 'OVERDUE')
        .reduce((acc, curr) => acc + Number(curr.totalAmount), 0),
    [filteredInvoices],
  );

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  }, [filteredInvoices.length, pageSize]);

  useEffect(() => {
    if (loading) return;
    if (page > totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(totalPages));
      router.replace(`/bills?${params.toString()}`);
    }
  }, [loading, page, filteredInvoices.length, router, searchParams, totalPages]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [page, pageSize, filteredInvoices]);

  const [schedules, setSchedules] = useState<Record<string, { monthlyDay?: number; oneTimeDate?: string }>>({});
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await api.getRoomPaymentSchedules();
        if (cancelled) return;
        setSchedules(data);
      } catch {}
    };
    run();
  }, []);

  const formatScheduleDate = (bill: Invoice) => {
    const roomId = bill.contract?.room?.id;
    if (!roomId) return '-';
    const s = schedules[roomId];
    if (!s) return '-';
    if (typeof s.monthlyDay === 'number') {
      const day = Math.max(1, Math.min(28, Number(s.monthlyDay)));
      const d = new Date(bill.year, bill.month - 1, day);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (s.oneTimeDate) {
      const d = new Date(s.oneTimeDate);
      if (d.getFullYear() === bill.year && d.getMonth() === bill.month - 1) {
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    return '-';
  };

  const currentRangeText = useMemo(() => {
    if (filteredInvoices.length === 0) return '0-0 จาก 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, filteredInvoices.length);
    return `${start}-${end} จาก ${filteredInvoices.length}`;
  }, [page, pageSize, filteredInvoices.length]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/bills?${params.toString()}`);
  };

  const setNextPageSize = (nextSize: number) => {
    const allowed = [10, 20, 50, 100];
    const size = allowed.includes(nextSize) ? nextSize : 10;
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(size));
    params.set('page', '1');
    router.push(`/bills?${params.toString()}`);
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#8b5a3c]">บิลค่าเช่า</h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการใบแจ้งหนี้และสถานะการชำระเงิน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาห้อง หรือ ผู้เช่า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedMonthKey(null);
              setStatusFilter('ALL');
              goToPage(1);
            }}
            className="px-3 py-1.5 rounded-full text-xs border transition-colors bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ล้างค่า filter
          </button>
          <SendAllBar invoices={invoices} onMonthChange={setSelectedMonthKey} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
            title="กรองตามสถานะบิล"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="DRAFT">ร่าง</option>
            <option value="SENT">รอชำระ</option>
            <option value="PAID">ชำระแล้ว</option>
            <option value="OVERDUE">ค้างชำระ</option>
            <option value="CANCELLED">ยกเลิกแล้ว</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (!selectedMonthKey) {
                alert('กรุณาเลือกเดือนก่อนจากเมนูจัดการบิล');
                return;
              }
              if (!arrearsInvoices.length) {
                alert('ไม่มีห้องค้างชำระในเดือนที่เลือก');
                return;
              }
              const ids = arrearsInvoices.map((i) => i.id).join(',');
              const params = new URLSearchParams();
              params.set('ids', ids);
              params.set('month', selectedMonthKey);
              window.open(`/bills/arrears-summary?${params.toString()}`, '_blank');
            }}
            className="px-3 py-2 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
          >
            สรุปห้องค้างชำระ ({arrearsInvoices.length})
          </button>
          <PrintAllBar invoices={filteredInvoices} />
          {/* Settings button for auto-send */}
          <AutoSendSettingsDialog />
          <CreateInvoiceDialog
            rooms={rooms}
            onCreated={async () => {
              try {
                setLoading(true);
                setError(null);
                const [invoicesRes, roomsRes] = await Promise.all([
                  api.getInvoices(),
                  api.getRooms(),
                ]);
                setInvoices(invoicesRes);
                setRooms(roomsRes);
              } catch (e) {
                setError((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ');
              } finally {
                setLoading(false);
              }
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">ยอดรอชำระทั้งหมด</p>
          <p className="text-2xl font-bold text-[#f5a987] mt-1">฿{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">ยอดชำระแล้ว</p>
          <p className="text-2xl font-bold text-green-600 mt-1">฿{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">ค้างชำระเกินกำหนด</p>
          <p className="text-2xl font-bold text-red-500 mt-1">฿{totalOverdue.toLocaleString()}</p>
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ตึก</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ชั้น</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ห้อง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ผู้เช่า</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ประจำเดือน</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">วันนัดจ่าย</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ยอดรวม</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="bg-white border-b">
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr className="bg-white border-b">
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  pagedInvoices.map((bill) => {
                    const buildingLabel =
                      bill.contract?.room?.building?.name ||
                      bill.contract?.room?.building?.code ||
                      '-'
                    const floorLabel =
                      typeof bill.contract?.room?.floor === 'number'
                        ? bill.contract.room.floor
                        : '-'
                    return (
                      <tr
                        key={bill.id}
                        className="bg-white border-b hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-600">{buildingLabel}</td>
                        <td className="px-6 py-4 text-slate-600">{floorLabel}</td>
                        <td className="px-6 py-4 font-bold text-[#8b5a3c]">
                          {bill.contract?.room?.number}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {bill.contract?.tenant?.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(bill.year, bill.month - 1).toLocaleDateString(
                            'th-TH',
                            { month: 'long', year: 'numeric' },
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatScheduleDate(bill)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-700">
                          ฿{Number(bill.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              bill.status === 'PAID'
                                ? 'secondary'
                                : bill.status === 'OVERDUE'
                                ? 'destructive'
                                : 'outline'
                            }
                            className={
                              bill.status === 'PAID'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none'
                                : bill.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 border-none'
                                : bill.status === 'CANCELLED'
                                ? 'bg-slate-200 text-slate-600 border-none'
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none'
                            }
                          >
                            {bill.status === 'PAID'
                              ? 'ชำระแล้ว'
                              : bill.status === 'OVERDUE'
                              ? 'ค้างชำระ'
                              : bill.status === 'DRAFT'
                              ? 'ร่าง'
                              : bill.status === 'CANCELLED'
                              ? 'ยกเลิกแล้ว'
                              : 'รอชำระ'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {bill.status === 'CANCELLED' ? (
                              <span className="text-xs text-slate-400">
                                ยกเลิกแล้ว
                              </span>
                            ) : (
                              <>
                                <SendInvoiceButton invoice={bill} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
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
            disabled={loading || invoices.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าแรก"
          >
            «
          </button>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={loading || invoices.length === 0 || page === 1}
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
            disabled={loading || invoices.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ถัดไป"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={loading || invoices.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าสุดท้าย"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}
