'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api, Invoice, Room, DormExtra } from '@/services/api';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import BillSlipButton from './BillSlipButton';
import SendAllBar from './SendAllBar';
import PrintAllBar from './PrintAllBar';
import AutoSendSettingsDialog from './AutoSendSettingsDialog';
import { Button } from '@/components/ui/button';

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

  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
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
    const onScheduleUpdated = () => {
      fetchedIdsRef.current.clear();
      setScheduleRefreshKey((v) => v + 1);
    };
    const onInvoiceUpdated = () => refetch();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('ROOM_PAYMENT_SCHEDULE_UPDATED', onScheduleUpdated as any);
    window.addEventListener('INVOICE_UPDATED', onInvoiceUpdated as any);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('ROOM_PAYMENT_SCHEDULE_UPDATED', onScheduleUpdated as any);
      window.removeEventListener('INVOICE_UPDATED', onInvoiceUpdated as any);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL'|'DRAFT'|'SENT'|'PAID'|'OVERDUE'|'CANCELLED'>('ALL');
  const [schedules, setSchedules] = useState<Record<string, { monthlyDay?: number; oneTimeDate?: string }>>({});
  const [dormExtra, setDormExtra] = useState<DormExtra | null>(null);
  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .replace(/[\s\-_/]+/g, '')
      .trim();
  const buildBillSearchText = (bill: Invoice) => {
    const buildingName = bill.contract?.room?.building?.name || '';
    const buildingCode = bill.contract?.room?.building?.code || '';
    const floor = bill.contract?.room?.floor ?? '';
    const roomNumber = bill.contract?.room?.number || '';
    const tenantName = bill.contract?.tenant?.name || '';
    const tenantNickname = bill.contract?.tenant?.nickname || '';
    const tenantPhone = bill.contract?.tenant?.phone || '';
    const monthText = new Date(bill.year, bill.month - 1).toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
    const statusText =
      bill.status === 'PAID'
        ? 'ชำระแล้ว'
        : bill.status === 'OVERDUE'
        ? 'ค้างชำระ'
        : bill.status === 'DRAFT'
        ? 'ร่าง'
        : bill.status === 'CANCELLED'
        ? 'ยกเลิกแล้ว'
        : 'รอชำระ';
    const monthlySchedule =
      schedules[bill.contract?.room?.id || '']?.monthlyDay !== undefined
        ? `${schedules[bill.contract?.room?.id || '']?.monthlyDay}`
        : '';
    const oneTimeSchedule = schedules[bill.contract?.room?.id || '']?.oneTimeDate || '';
    const parts = [
      buildingName,
      buildingCode,
      floor,
      `ชั้น${floor}`,
      roomNumber,
      `ห้อง${roomNumber}`,
      tenantName,
      tenantNickname,
      tenantPhone,
      bill.id,
      bill.status,
      statusText,
      monthText,
      `${bill.month}/${bill.year}`,
      `${bill.month}`,
      `${bill.year}`,
      `${bill.totalAmount}`,
      monthlySchedule,
      oneTimeSchedule,
    ];
    return normalizeSearch(parts.join(' '));
  };

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
      const tokens = searchTerm
        .trim()
        .split(/\s+/)
        .map((t) => normalizeSearch(t))
        .filter(Boolean);
      result = result.filter((inv) => {
        const text = buildBillSearchText(inv);
        return tokens.every((t) => text.includes(t));
      });
    }
    return result;
  }, [monthFilteredInvoices, searchTerm, statusFilter, schedules]);

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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const extra = await api.getDormExtra().catch(() => ({}) as DormExtra);
        if (cancelled) return;
        setDormExtra(extra);
      } catch {}
    };
    run();
  }, []);

  const roomIdsKey = useMemo(() => {
    const ids = invoices
      .map((inv) => inv.contract?.room?.id)
      .filter((id): id is string => typeof id === 'string');
    const uniqueSorted = Array.from(new Set(ids)).sort();
    return uniqueSorted.join(',');
  }, [invoices]);
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef<boolean>(false);
  useEffect(() => {
    let cancelled = false;
    const ids = roomIdsKey ? roomIdsKey.split(',').filter(Boolean) : [];
    const need = ids.filter((id) => !fetchedIdsRef.current.has(id));
    if (need.length === 0) return;
    const fetchPerRoomSchedules = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const pairs = await Promise.all(
          need.map(async (id) => {
            const s = await api.getRoomPaymentSchedule(id).catch(() => null);
            return [id, s] as const;
          }),
        );
        if (cancelled) return;
        setSchedules((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const [id, s] of pairs) {
            fetchedIdsRef.current.add(id);
            if (s && (typeof s.monthlyDay === 'number' || typeof s.oneTimeDate === 'string')) {
              const existing = next[id];
              const incoming = { monthlyDay: s.monthlyDay, oneTimeDate: s.oneTimeDate };
              const same =
                existing &&
                existing.monthlyDay === incoming.monthlyDay &&
                existing.oneTimeDate === incoming.oneTimeDate;
              if (!same) {
                next[id] = incoming;
                changed = true;
              }
            }
          }
          return changed ? next : prev;
        });
      } finally {
        fetchingRef.current = false;
      }
    };
    fetchPerRoomSchedules();
    return () => {
      cancelled = true;
    };
  }, [roomIdsKey, scheduleRefreshKey]);

  const formatScheduleDate = (bill: Invoice) => {
    const roomId = bill.contract?.room?.id;
    if (!roomId) return '-';
    const s = schedules[roomId];
    if (!s || (s.monthlyDay === undefined && !s.oneTimeDate)) {
      return '-';
    }
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
          <button
            type="button"
            onClick={async () => {
              try {
                const today = new Date();
                const thaiDate = today.toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
                // Collect ALL overdue invoices across months
                const overdueAll = invoices.filter((i) => i.status === 'OVERDUE');
                if (overdueAll.length === 0) {
                  alert('ไม่มีห้องค้างชำระ');
                  return;
                }
                // Group by building -> room -> months
                const groups: Record<
                  string,
                  Record<
                    string,
                    Array<{ year: number; month: number; label: string; amount: number }>
                  >
                > = {};
                const roomSet = new Set<string>();
                let total = 0;
                for (const inv of overdueAll) {
                  const bLabelRaw =
                    inv.contract?.room?.building?.name ||
                    inv.contract?.room?.building?.code ||
                    '-';
                  const bNum = (bLabelRaw.match(/\d+/)?.[0] as string) || '';
                  const key = bNum ? `ตึก ${bNum}` : `ตึก ${bLabelRaw}`;
                  const floor =
                    typeof inv.contract?.room?.floor === 'number'
                      ? inv.contract!.room!.floor
                      : '-';
                  const room = inv.contract?.room?.number || '-';
                  const roomKey = `${floor}/${room}`;
                  // Outstanding = total - sum(verified payments)
                  const payments = Array.isArray(inv.payments)
                    ? inv.payments
                    : [];
                  const verifiedPaid = payments
                    .filter((p: any) => p.status === 'VERIFIED')
                    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                  const outstanding = Math.max(
                    0,
                    Number(inv.totalAmount) - verifiedPaid,
                  );
                  if (outstanding <= 0) continue;
                  total += outstanding;
                  if (!groups[key]) groups[key] = {};
                  if (!groups[key][roomKey]) groups[key][roomKey] = [];
                  roomSet.add(roomKey);
                  const label = new Date(inv.year, inv.month - 1).toLocaleDateString(
                    'th-TH',
                    { month: 'long' },
                  );
                  groups[key][roomKey].push({
                    year: inv.year,
                    month: inv.month,
                    label,
                    amount: outstanding,
                  });
                }
                // Build text
                const lines: string[] = [];
                lines.push(`อัพเดทห้องค้างชำระ (${thaiDate})`);
                const sortedKeys = Object.keys(groups).sort((a, b) => {
                  const an = a.match(/\d+/)?.[0];
                  const bn = b.match(/\d+/)?.[0];
                  if (an && bn) return Number(an) - Number(bn);
                  return a.localeCompare(b, undefined, { numeric: true });
                });
                for (const k of sortedKeys) {
                  const n = k.match(/\d+/)?.[0];
                  lines.push(n ? `หอ ${n}` : k);
                  const roomKeys = Object.keys(groups[k]).sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true }),
                  );
                  for (const rk of roomKeys) {
                    lines.push(`  ${rk}`);
                    const months = groups[k][rk]
                      .slice()
                      .sort((a, b) =>
                        a.year === b.year ? a.month - b.month : a.year - b.year,
                      );
                    for (const m of months) {
                      lines.push(
                        `    เดือน${m.label} ${m.amount.toLocaleString()} บาท`,
                      );
                    }
                  }
                  lines.push('');
                }
                const countRooms = roomSet.size;
                lines.push(`จำนวน ${countRooms} ห้อง`);
                lines.push(`รวมทั้งสิ้น ${total.toLocaleString()} บาท ครับ`);
                const text = lines.join('\n').trim();
                await navigator.clipboard.writeText(text);
                alert('คัดลอกข้อความสรุปห้องค้างชำระเรียบร้อย');
              } catch (e) {
                alert((e as Error).message || 'คัดลอกข้อความไม่สำเร็จ');
              }
            }}
            className="px-3 py-2 rounded-md text-xs font-medium bg-[#8b5a3c] text-white hover:bg-[#7a4f36]"
            title="คัดลอกสรุปห้องค้างชำระ"
          >
            คัดลอกห้องค้างชำระ
          </button>
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
                              <span className="text-xs text-slate-400">ยกเลิกแล้ว</span>
                            ) : bill.status === 'PAID' ? (
                              <BillSlipButton invoice={bill} />
                            ) : (
                              // สำหรับบิลที่ยังไม่ชำระ ให้ใช้ปุ่มเดิมในการจัดการ (แก้ไข/ส่ง)
                              // หากไฟล์ SendInvoiceButton ถูกลบ ให้คืนค่าว่างชั่วคราว
                              <span className="text-xs text-slate-400">—</span>
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
