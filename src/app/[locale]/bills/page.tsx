'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Copy, Filter, Printer } from 'lucide-react';
import { api, Invoice, Room, DormExtra } from '@/services/api';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import SendInvoiceButton from './SendInvoiceButton';
import AutoSendSettingsDialog from './AutoSendSettingsDialog';
import BillsHeaderActions from './BillsHeaderActions';
import PrintAllBar from './PrintAllBar';

export default function BillsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">บิลค่าเช่า</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">จัดการบิลและสถานะการชำระเงิน</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
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

  // Fetch Data
  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for updates
  useEffect(() => {
    const onFocus = () => fetchData();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    const onInvoiceUpdated = () => fetchData();
    
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('INVOICE_UPDATED', onInvoiceUpdated as any);
    
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('INVOICE_UPDATED', onInvoiceUpdated as any);
    };
  }, []);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL'|'DRAFT'|'SENT'|'PAID'|'OVERDUE'|'CANCELLED'>('ALL');
  const [schedules, setSchedules] = useState<Record<string, { monthlyDay?: number; oneTimeDate?: string }>>({});

  // Month Keys
  const monthKeys = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) {
      set.add(`${inv.year}-${String(inv.month).padStart(2, '0')}`);
    }
    const sorted = Array.from(set).sort().reverse();
    return sorted;
  }, [invoices]);

  const thaiMonths = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
  ];

  // Initialize selected month
  useEffect(() => {
    if (!selectedMonthKey && monthKeys.length > 0) {
      setSelectedMonthKey(monthKeys[0]);
    }
  }, [monthKeys, selectedMonthKey]);

  // Filtering
  const normalizeSearch = (value: string) => value.toLowerCase().replace(/[\s\-_/]+/g, '').trim();
  
  const filteredInvoices = useMemo(() => {
    let result = invoices;
    
    // Month Filter
    if (selectedMonthKey) {
      const [yearStr, monthStr] = selectedMonthKey.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      result = result.filter((inv) => inv.year === year && inv.month === month);
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Search Filter
    if (searchTerm.trim()) {
      const tokens = searchTerm.trim().split(/\s+/).map((t) => normalizeSearch(t)).filter(Boolean);
      result = result.filter((inv) => {
        const parts = [
          inv.contract?.room?.number || '',
          inv.contract?.room?.building?.name || '',
          inv.contract?.tenant?.name || '',
          inv.contract?.tenant?.nickname || '',
          inv.contract?.tenant?.phone || '',
          String(inv.totalAmount),
          inv.status
        ];
        const text = normalizeSearch(parts.join(' '));
        return tokens.every((t) => text.includes(t));
      });
    }
    
    // Sort by Room Number
    return result.sort((a, b) => {
      const roomA = a.contract?.room?.number || '';
      const roomB = b.contract?.room?.number || '';
      return roomA.localeCompare(roomB, undefined, { numeric: true });
    });
  }, [invoices, selectedMonthKey, statusFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    const paid = filteredInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    const unpaid = filteredInvoices.filter(i => ['SENT', 'OVERDUE', 'DRAFT'].includes(i.status)).reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    const overdue = filteredInvoices.filter(i => i.status === 'OVERDUE').reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    
    const paidPct = total > 0 ? (paid / total) * 100 : 0;
    const unpaidPct = total > 0 ? (unpaid / total) * 100 : 0;
    
    return { total, paid, unpaid, overdue, paidPct, unpaidPct };
  }, [filteredInvoices]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const pagedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(Math.max(1, Math.min(totalPages, p))));
    router.push(`/bills?${params.toString()}`);
  };

  // Schedules (Keep existing logic)
  const roomIdsKey = useMemo(() => {
    const ids = invoices.map((inv) => inv.contract?.room?.id).filter((id): id is string => !!id);
    return Array.from(new Set(ids)).sort().join(',');
  }, [invoices]);
  
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!roomIdsKey) return;
    const ids = roomIdsKey.split(',');
    const need = ids.filter(id => !fetchedIdsRef.current.has(id));
    if (need.length === 0) return;
    
    const fetchSchedules = async () => {
      try {
        const pairs = await Promise.all(
          need.map(async (id) => {
            const s = await api.getRoomPaymentSchedule(id).catch(() => null);
            return [id, s] as const;
          })
        );
        setSchedules(prev => {
          const next = { ...prev };
          let changed = false;
          for (const [id, s] of pairs) {
            fetchedIdsRef.current.add(id);
            if (s && (s.monthlyDay !== undefined || s.oneTimeDate)) {
              next[id] = { monthlyDay: s.monthlyDay, oneTimeDate: s.oneTimeDate };
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {}
    };
    fetchSchedules();
  }, [roomIdsKey]);

  const formatScheduleDate = (bill: Invoice) => {
    const roomId = bill.contract?.room?.id;
    if (!roomId) return '-';
    const s = schedules[roomId];
    if (!s) return '-';
    if (typeof s.monthlyDay === 'number') {
      return `ทุกวันที่ ${s.monthlyDay}`;
    }
    if (s.oneTimeDate) {
      const d = new Date(s.oneTimeDate);
      if (d.getFullYear() === bill.year && d.getMonth() === bill.month - 1) {
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      }
    }
    return '-';
  };

  const copyOverdue = async () => {
    try {
      const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE' && i.year === Number(selectedMonthKey?.split('-')[0]) && i.month === Number(selectedMonthKey?.split('-')[1]));
      if (overdueInvoices.length === 0) {
        alert('ไม่มีรายการค้างชำระในเดือนที่เลือก');
        return;
      }
      
      let text = `สรุปห้องค้างชำระ (${new Date().toLocaleDateString('th-TH')})\n\n`;
      let total = 0;
      
      const byBuilding: Record<string, Invoice[]> = {};
      overdueInvoices.forEach(inv => {
        const b = inv.contract?.room?.building?.name || 'อื่นๆ';
        if (!byBuilding[b]) byBuilding[b] = [];
        byBuilding[b].push(inv);
      });
      
      Object.keys(byBuilding).sort().forEach(b => {
        text += `ตึก ${b}\n`;
        byBuilding[b].sort((a,b) => (a.contract?.room?.number || '').localeCompare(b.contract?.room?.number || '', undefined, {numeric:true})).forEach(inv => {
          const amt = Number(inv.totalAmount);
          text += `  ห้อง ${inv.contract?.room?.number} : ${amt.toLocaleString()} บาท\n`;
          total += amt;
        });
        text += '\n';
      });
      
      text += `รวมทั้งสิ้น ${total.toLocaleString()} บาท`;
      await navigator.clipboard.writeText(text);
      alert('คัดลอกสรุปห้องค้างชำระแล้ว');
    } catch {
      alert('คัดลอกไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">บิลค่าเช่า</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">จัดการใบแจ้งหนี้และตรวจสอบสถานะการชำระเงิน</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BillsHeaderActions selectedMonthKey={selectedMonthKey} invoices={invoices} />
          
          <CreateInvoiceDialog 
            rooms={rooms} 
            onCreated={fetchData}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl dark:hover:bg-slate-750 transition-all group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">ยอดรวมทั้งหมด</p>
                <h3 className="text-3xl font-bold mt-1 tracking-tight">฿{kpis.total.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5">
              <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{filteredInvoices.length} รายการ</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl dark:hover:bg-slate-750 transition-all group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">ชำระแล้ว</p>
                <h3 className="text-3xl font-bold mt-1 tracking-tight text-emerald-600 dark:text-emerald-100">฿{kpis.paid.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 border-emerald-500/50"></div>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${kpis.paidPct}%` }}></div>
            </div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-3">{kpis.paidPct.toFixed(1)}% ของทั้งหมด</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl dark:hover:bg-slate-750 transition-all group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">ค้างชำระ / รอชำระ</p>
                <h3 className="text-3xl font-bold mt-1 tracking-tight text-rose-600 dark:text-rose-100">฿{kpis.unpaid.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 border-rose-500/50 border-dashed"></div>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5">
              <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${kpis.unpaidPct}%` }}></div>
            </div>
            <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-3">เกินกำหนด: ฿{kpis.overdue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาห้อง, ชื่อผู้เช่า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-700 dark:text-white text-sm font-medium px-3 py-2 rounded-lg focus:outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="DRAFT">📝 ร่าง</option>
              <option value="SENT">⏳ รอชำระ</option>
              <option value="PAID">✅ ชำระแล้ว</option>
              <option value="OVERDUE">⚠️ ค้างชำระ</option>
              <option value="CANCELLED">❌ ยกเลิก</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-600">
            <select
              value={selectedMonthKey || ''}
              onChange={(e) => setSelectedMonthKey(e.target.value || null)}
              className="bg-transparent text-slate-700 dark:text-white text-sm font-medium px-3 py-2 rounded-lg focus:outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[140px]"
            >
              {monthKeys.map((key) => {
                const [y, m] = key.split('-');
                const label = `${thaiMonths[Number(m) - 1]} ${Number(y) + 543}`;
                return <option key={key} value={key}>{label}</option>;
              })}
            </select>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button
            onClick={copyOverdue}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-rose-500 dark:text-rose-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
            title="คัดลอกรายชื่อห้องค้างชำระ"
          >
            <Copy className="w-5 h-5" />
          </button>
          
          <AutoSendSettingsDialog />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">ไม่พบรายการบิล</h3>
          <p className="text-slate-500 mt-1">ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">ห้อง</th>
                    <th className="px-6 py-4 font-medium">ผู้เช่า</th>
                    <th className="px-6 py-4 font-medium">ประจำเดือน</th>
                    <th className="px-6 py-4 font-medium">วันนัดจ่าย</th>
                    <th className="px-6 py-4 font-medium text-right">ยอดรวม</th>
                    <th className="px-6 py-4 font-medium text-center">สถานะ</th>
                    <th className="px-6 py-4 font-medium text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {pagedInvoices.map((bill, idx) => (
                    <tr 
                      key={bill.id} 
                      className={`
                        transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80
                        ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'}
                      `}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-lg">{bill.contract?.room?.number}</div>
                        <div className="text-xs text-slate-500">
                          {bill.contract?.room?.building?.name || '-'} 
                          {bill.contract?.room?.floor ? ` ชั้น ${bill.contract.room.floor}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{bill.contract?.tenant?.name}</div>
                        {bill.contract?.tenant?.nickname && (
                          <div className="text-xs text-slate-500">({bill.contract.tenant.nickname})</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {new Date(bill.year, bill.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {formatScheduleDate(bill)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-200">฿{Number(bill.totalAmount).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {bill.status === 'CANCELLED' ? (
                            <span className="text-xs text-slate-500 italic">ยกเลิกแล้ว</span>
                          ) : (
                            <>
                              <button
                                onClick={() => window.open(`/bills/${bill.id}/print`, '_blank')}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="พิมพ์ใบแจ้งหนี้"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <SendInvoiceButton invoice={bill} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {pagedInvoices.map((bill) => (
              <div key={bill.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-md relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(bill.status)}`}></div>
                
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{bill.contract?.room?.number}</h3>
                      <span className="text-xs text-slate-500">{bill.contract?.room?.building?.name}</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{bill.contract?.tenant?.name}</div>
                  </div>
                  <StatusBadge status={bill.status} />
                </div>

                <div className="flex justify-between items-end pl-2">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">ยอดรวม</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-200 font-mono">฿{Number(bill.totalAmount).toLocaleString()}</div>
                  </div>
                  {bill.status !== 'CANCELLED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`/bills/${bill.id}/print`, '_blank')}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="พิมพ์ใบแจ้งหนี้"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <SendInvoiceButton 
                        invoice={bill} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                      />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-500 pl-2">
                  <span>{new Date(bill.year, bill.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
                  <span>นัดจ่าย: {formatScheduleDate(bill)}</span>
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PAID':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50">ชำระแล้ว</span>;
    case 'OVERDUE':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/50">ค้างชำระ</span>;
    case 'SENT':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50">รอชำระ</span>;
    case 'DRAFT':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">ร่าง</span>;
    case 'CANCELLED':
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 line-through">ยกเลิก</span>;
    default:
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">{status}</span>;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PAID': return 'bg-emerald-500';
    case 'OVERDUE': return 'bg-rose-500';
    case 'SENT': return 'bg-amber-500';
    case 'DRAFT': return 'bg-slate-500';
    default: return 'bg-slate-700';
  }
}
