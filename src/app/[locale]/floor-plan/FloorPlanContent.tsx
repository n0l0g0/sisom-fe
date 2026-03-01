'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardRoomsList from '@/components/DashboardRoomsList';
import RoomDetailDialog from './RoomDetailDialog';
import CreateRoomDialog from './CreateRoomDialog';
import RoomsDebugLogger from './RoomsDebugLogger';
import { api } from '@/services/api';
import type { Room, Building, Invoice, DormExtra } from '@/services/api';
import { useDebounce } from '@/lib/hooks';
import { Search, ChevronDown, Filter, LayoutGrid } from 'lucide-react';

export default function FloorPlanContent({ rooms, buildings }: { rooms: Room[]; buildings: Building[] }) {
  const searchParams = useSearchParams();
  const selectedBuilding = searchParams.get('building') || undefined;
  const statusParam = (searchParams.get('status') || '').toUpperCase();
  const allowedStatus = ['VACANT', 'OCCUPIED', 'OVERDUE', 'MAINTENANCE'] as const;
  type StatusFilter = (typeof allowedStatus)[number] | 'all';
  const statusFilter: StatusFilter = (allowedStatus as readonly string[]).includes(statusParam)
    ? (statusParam as StatusFilter)
    : 'all';
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [uiBuilding, setUiBuilding] = useState<string>(selectedBuilding || '');
  const [uiFloor, setUiFloor] = useState<string>('');
  const [uiStatus, setUiStatus] = useState<string>(statusFilter === 'all' ? '' : statusFilter);
  const [uiPrice, setUiPrice] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [extra, setExtra] = useState<DormExtra | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inv, ex] = await Promise.all([api.getInvoices(), api.getDormExtra()]);
        if (!cancelled) {
          setInvoices(inv);
          setExtra(ex);
        }
      } catch {
        if (!cancelled) {
          setInvoices([]);
          setExtra(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyDueDay = Number.isFinite(extra?.monthlyDueDay as number) ? (extra?.monthlyDueDay as number) : undefined;

  const flaggedRoomIds = useMemo(() => {
    const now = new Date();
    const isSentOrOverdue = (inv: Invoice) => inv.status === 'SENT' || inv.status === 'OVERDUE';
    const overdueByDay = (inv: Invoice) => {
      if (inv.status === 'OVERDUE') return true;
      if (inv.status !== 'SENT') return false;
      const d = inv.dueDate ? new Date(inv.dueDate) : (() => {
        const m = Math.max(1, Math.min(12, inv.month));
        const y = inv.year;
        const day = monthlyDueDay ?? 5;
        const date = new Date(y, m - 1, Math.max(1, Math.min(31, day)));
        return date;
      })();
      return now > d;
    };
    const setIds = new Set<string>();
    const contractToRoom = new Map<string, string>();
    for (const r of rooms) {
      const cs = Array.isArray(r.contracts) ? r.contracts : [];
      for (const c of cs) {
        contractToRoom.set(c.id, r.id);
      }
    }
    for (const inv of invoices) {
      if (!isSentOrOverdue(inv)) continue;
      const rid = inv.contract?.roomId || contractToRoom.get(inv.contractId);
      if (!rid) continue;
      if (inv.status === 'SENT') {
        setIds.add(rid);
      } else if (overdueByDay(inv)) {
        setIds.add(rid);
      }
    }
    return setIds;
  }, [invoices, monthlyDueDay, rooms]);

  const mergedRooms = useMemo(() => {
    if (!flaggedRoomIds.size) return rooms;
    return rooms.map((r) => {
      if (flaggedRoomIds.has(r.id)) {
        return { ...r, status: 'OVERDUE' as const };
      }
      return r;
    });
  }, [rooms, flaggedRoomIds]);

  const filteredRooms = useMemo(() => {
    const byBuilding = selectedBuilding
      ? mergedRooms.filter((r: Room & { buildingId?: string }) => (r as Room & { buildingId?: string }).buildingId === selectedBuilding)
      : mergedRooms;
    return statusFilter === 'all' ? byBuilding : byBuilding.filter((r) => r.status === statusFilter);
  }, [mergedRooms, selectedBuilding, statusFilter]);
  const currentBuilding = useMemo(
    () => (selectedBuilding ? buildings.find((b) => b.id === selectedBuilding) : undefined),
    [buildings, selectedBuilding],
  );

  const roomsByFloor = useMemo(() => {
    return filteredRooms.reduce((acc: Record<number, Room[]>, room: Room) => {
      const floor = room.floor;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(room);
      return acc;
    }, {});
  }, [filteredRooms]);

  const floors = useMemo(() => Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b), [roomsByFloor]);

  const [openFloors, setOpenFloors] = useState<Set<number>>(() => new Set(floors));

  const toggleFloor = (floor: number) => {
    setOpenFloors(prev => {
      const next = new Set(prev);
      if (next.has(floor)) {
        next.delete(floor);
      } else {
        next.add(floor);
      }
      return next;
    });
  };

  const expandAllFloors = () => setOpenFloors(new Set(floors));
  const collapseAllFloors = () => setOpenFloors(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'VACANT': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'MAINTENANCE': return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'OVERDUE': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'OCCUPIED': return 'มีผู้เช่า';
      case 'VACANT': return 'ว่าง';
      case 'MAINTENANCE': return 'แจ้งซ่อม';
      case 'OVERDUE': return 'ค้างชำระ';
      default: return status;
    }
  };

  const sortRooms = (a: Room, b: Room) => {
    const numA = parseInt(String(a.number).replace(/[^0-9]/g, ''), 10);
    const numB = parseInt(String(b.number).replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(numA)) return 1;
    if (Number.isNaN(numB)) return -1;
    return numA - numB;
  };

  const uiFilteredRooms = useMemo(() => {
    const text = debouncedQ.trim().toLowerCase();
    const priceRange = uiPrice;
    const priceMatch = (room: Room) => {
      const v = (room.contracts?.[0]?.currentRent ?? room.pricePerMonth) ?? 0;
      if (!priceRange) return true;
      if (priceRange === '0-3000') return v >= 0 && v < 3000;
      if (priceRange === '3000-5000') return v >= 3000 && v < 5000;
      if (priceRange === '5000-8000') return v >= 5000 && v < 8000;
      if (priceRange === '8000+') return v >= 8000;
      return true;
    };
    const rooms = filteredRooms.filter((room) => {
      const rb = room as Room & { buildingId?: string };
      if (uiBuilding && rb.buildingId !== uiBuilding) return false;
      if (uiFloor && String(room.floor) !== uiFloor) return false;
      if (uiStatus) {
        const match =
          uiStatus === 'OCCUPIED'
            ? room.status !== 'VACANT'
            : room.status === uiStatus;
        if (!match) return false;
      }
      if (!priceMatch(room)) return false;
      if (text) {
        const t = [
          String(room.number || ''),
          String(room.contracts?.[0]?.tenant?.name || ''),
          String(room.contracts?.[0]?.tenant?.nickname || ''),
        ].join(' ').toLowerCase();
        if (!t.includes(text)) return false;
      }
      return true;
    });
    return rooms.sort(sortRooms);
  }, [filteredRooms, debouncedQ, uiBuilding, uiFloor, uiStatus, uiPrice]);

  if (!selectedBuilding) {
    const buildingLookup = new Map(buildings.map((b) => [b.id, b]));
    const groupsMap = new Map<
      string,
      {
        buildingId?: string;
        buildingName: string;
        buildingCode?: string;
        floors: Map<number, Room[]>;
        totalRooms: number;
      }
    >();
    for (const room of uiFilteredRooms) {
      const rb = room as Room & { buildingId?: string };
      const bid: string = rb.buildingId || 'none';
      const b = bid !== 'none' ? buildingLookup.get(bid) : undefined;
      const name = b?.name || 'ไม่ระบุตึก';
      const code = b?.code || undefined;
      const floor: number = Number.isFinite(room.floor) ? room.floor : 0;
      const existing = groupsMap.get(bid);
      if (!existing) {
        groupsMap.set(bid, {
          buildingId: bid !== 'none' ? bid : undefined,
          buildingName: name,
          buildingCode: code,
          floors: new Map([[floor, [room]]]),
          totalRooms: 1,
        });
        continue;
      }
      existing.totalRooms += 1;
      const list = existing.floors.get(floor);
      if (list) list.push(room);
      else existing.floors.set(floor, [room]);
    }

    const sortedGroups = Array.from(groupsMap.entries())
      .sort(([aKey, a], [bKey, b]) => {
        if (aKey === 'none' && bKey !== 'none') return 1;
        if (bKey === 'none' && aKey !== 'none') return -1;
        const aNum = parseInt((a.buildingCode || '').replace(/\D/g, ''), 10);
        const bNum = parseInt((b.buildingCode || '').replace(/\D/g, ''), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
        if (a.buildingCode && b.buildingCode && a.buildingCode !== b.buildingCode) return a.buildingCode.localeCompare(b.buildingCode);
        return a.buildingName.localeCompare(b.buildingName);
      })
      .map(([, g]) => {
        const floors = Array.from(g.floors.entries())
          .sort(([a], [b]) => a - b)
          .map(([floor, rs]) => ({ floor, rooms: rs }));
        return { ...g, floors };
      });

    return (
      <div className="space-y-8 fade-in pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">รายการห้องทั้งหมด</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">จัดการข้อมูลห้องพักและสถานะ</p>
          </div>
          <CreateRoomDialog>
            <button className="px-4 py-2 rounded-xl text-white font-medium hover:bg-indigo-700 transition flex items-center gap-2 bg-indigo-600 shadow-lg shadow-indigo-500/20 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              เพิ่มห้อง
            </button>
          </CreateRoomDialog>
        </div>

        {/* Search & Filter Section - Redesigned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาห้อง หรือชื่อผู้เช่า..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Building Filter */}
            <div className="lg:col-span-2 relative">
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-sm"
                value={uiBuilding}
                onChange={(e) => setUiBuilding(e.target.value)}
              >
                <option value="">ทุกตึก</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Floor Filter */}
            <div className="lg:col-span-2 relative">
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-sm"
                value={uiFloor}
                onChange={(e) => setUiFloor(e.target.value)}
              >
                <option value="">ทุกชั้น</option>
                {Array.from(new Set(rooms.map(r => Number.isFinite(r.floor) ? r.floor : 0))).sort((a,b)=>a-b).map(f => (
                  <option key={f} value={String(f)}>ชั้น {f}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2 relative">
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-sm"
                value={uiStatus}
                onChange={(e) => setUiStatus(e.target.value)}
              >
                <option value="">ทุกสถานะ</option>
                <option value="VACANT">ว่าง</option>
                <option value="OCCUPIED">มีผู้เช่า</option>
                <option value="OVERDUE">ค้างชำระ</option>
                <option value="MAINTENANCE">แจ้งซ่อม</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Price Filter */}
            <div className="lg:col-span-2 relative">
              <select
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-sm"
                value={uiPrice}
                onChange={(e) => setUiPrice(e.target.value)}
              >
                <option value="">ทุกราคา</option>
                <option value="0-3000">฿0 - ฿3,000</option>
                <option value="3000-5000">฿3,000 - ฿5,000</option>
                <option value="5000-8000">฿5,000 - ฿8,000</option>
                <option value="8000+">฿8,000 ขึ้นไป</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <DashboardRoomsList
          totalRooms={uiFilteredRooms.length}
          groups={sortedGroups.map(g => ({ ...g, key: g.buildingId || 'none' }))}
          defaultOpen
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      <RoomsDebugLogger rooms={filteredRooms} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ผังหอพัก</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            ตึก: {currentBuilding ? `${currentBuilding.name}${currentBuilding.code ? ` (${currentBuilding.code})` : ''}` : selectedBuilding}
          </div>
        </div>
        <Link
          href="/floor-plan"
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium"
        >
          เลือกตึกอื่น
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">ว่าง</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">มีผู้เช่า</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">แจ้งซ่อม</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">ค้างชำระ</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-xs font-medium" onClick={expandAllFloors}>ขยายทั้งหมด</button>
          <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-xs font-medium" onClick={collapseAllFloors}>ยุบทั้งหมด</button>
        </div>
      </div>
      
      {floors.map(floor => (
        <Card key={floor} className="shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => toggleFloor(floor)}>
            <CardTitle className="text-lg text-slate-800 dark:text-slate-200 flex justify-between items-center">
              <span className="font-semibold">ชั้น {floor}</span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openFloors.has(floor) ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
          {openFloors.has(floor) && (
            <CardContent className="pt-6 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {roomsByFloor[floor]
                  .sort((a, b) => {
                    const aIsBannoi = a.number.includes('บ้านน้อย');
                    const bIsBannoi = b.number.includes('บ้านน้อย');
                    if (aIsBannoi !== bIsBannoi) {
                      return aIsBannoi ? 1 : -1;
                    }
                    const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
                    return numA - numB;
                  })
                  .map((room: Room) => (
                  <RoomDetailDialog key={room.id} room={room}>
                    <div 
                      className={`
                        p-4 rounded-xl border text-center cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 relative group
                        ${getStatusColor(room.status)}
                      `}
                    >
                      <div className="text-xl font-bold mb-1 tracking-tight">{room.number}</div>
                      <div className="text-[10px] uppercase font-semibold opacity-70 tracking-wider">
                        {getDisplayStatus(room.status)}
                      </div>
                      {room.contracts?.[0]?.tenant && (
                        <div className="mt-2 pt-2 border-t border-current/10 text-xs truncate font-medium opacity-90">
                          {room.contracts[0].tenant.nickname || room.contracts[0].tenant.name}
                        </div>
                      )}
                    </div>
                  </RoomDetailDialog>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
