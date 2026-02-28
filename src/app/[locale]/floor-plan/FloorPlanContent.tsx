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
       case 'OCCUPIED': return 'bg-blue-50 text-blue-700 border-blue-200';
       case 'VACANT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
       case 'MAINTENANCE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
       case 'OVERDUE': return 'bg-red-50 text-red-700 border-red-200';
       default: return 'bg-gray-100';
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
      const text = q.trim().toLowerCase();
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
    }, [filteredRooms, q, uiBuilding, uiFloor, uiStatus, uiPrice]);
  
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
      <div className="space-y-8 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#8b5a3c]">รายการห้องทั้งหมด</h1>
          <CreateRoomDialog>
            <button className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition flex items-center gap-2 bg-[#f5a987]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              เพิ่มห้อง
            </button>
          </CreateRoomDialog>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาห้อง หรือชื่อผู้เช่า"
                  className="w-full pl-4 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white cursor-pointer"
              value={uiBuilding}
              onChange={(e) => setUiBuilding(e.target.value)}
            >
              <option value="">ทุกตึก</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
              ))}
            </select>
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white cursor-pointer"
              value={uiFloor}
              onChange={(e) => setUiFloor(e.target.value)}
            >
              <option value="">ทุกชั้น</option>
              {Array.from(new Set(rooms.map(r => Number.isFinite(r.floor) ? r.floor : 0))).sort((a,b)=>a-b).map(f => (
                <option key={f} value={String(f)}>ชั้น {f}</option>
              ))}
            </select>
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white cursor-pointer"
              value={uiStatus}
              onChange={(e) => setUiStatus(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="VACANT">🟢 ว่าง</option>
              <option value="OCCUPIED">🔵 มีผู้เช่า</option>
              <option value="OVERDUE">🔴 ค้างชำระ</option>
              <option value="MAINTENANCE">🟡 แจ้งซ่อม</option>
            </select>
            <select
              className="px-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-white cursor-pointer"
              value={uiPrice}
              onChange={(e) => setUiPrice(e.target.value)}
            >
              <option value="">ทุกราคา</option>
              <option value="0-3000">฿0 - ฿3,000</option>
              <option value="3000-5000">฿3,000 - ฿5,000</option>
              <option value="5000-8000">฿5,000 - ฿8,000</option>
              <option value="8000+">฿8,000 ขึ้นไป</option>
            </select>
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
     <div className="space-y-8 fade-in">
       <RoomsDebugLogger rooms={filteredRooms} />
       <div className="flex items-center justify-between mb-6">
           <div>
             <h1 className="text-2xl font-bold text-[#8b5a3c]">ผังหอพัก</h1>
             <div className="text-sm text-slate-500 mt-1">
               ตึก: {currentBuilding ? `${currentBuilding.name}${currentBuilding.code ? ` (${currentBuilding.code})` : ''}` : selectedBuilding}
             </div>
           </div>
           <Link
             href="/floor-plan"
             className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
           >
             เลือกตึกอื่น
           </Link>
       </div>
 
       <div className="flex items-center justify-between mb-6">
         <div className="flex gap-4">
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div>
           <span className="text-sm text-slate-600">ว่าง</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
           <span className="text-sm text-slate-600">มีผู้เช่า</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
             <span className="text-sm text-slate-600">แจ้งซ่อม</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
           <span className="text-sm text-slate-600">ค้างชำระ</span>
         </div>
         </div>
         <div className="flex items-center gap-2">
           <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-sm" onClick={expandAllFloors}>ขยายทั้งหมด</button>
           <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-sm" onClick={collapseAllFloors}>ยุบทั้งหมด</button>
         </div>
       </div>
       
       {floors.map(floor => (
         <Card key={floor} className="shadow-sm border-none bg-white">
           <CardHeader className="pb-2 border-b border-slate-100 cursor-pointer" onClick={() => toggleFloor(floor)}>
             <CardTitle className="text-lg text-slate-700 flex justify-between items-center">
               <span>ชั้น {floor}</span>
               <svg className={`w-5 h-5 text-slate-400 transition-transform ${openFloors.has(floor) ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </CardTitle>
           </CardHeader>
           {openFloors.has(floor) && (
             <CardContent className="pt-6">
               <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
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
                         p-4 rounded-xl border text-center cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 min-w-[100px]
                         ${getStatusColor(room.status)}
                       `}
                     >
                       <div className="text-xl font-bold mb-1">{room.number}</div>
                       <div className="text-xs opacity-80">
                         {getDisplayStatus(room.status)}
                       </div>
                       {room.contracts?.[0]?.tenant && (
                         <div className="mt-2 text-xs truncate font-medium">
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
