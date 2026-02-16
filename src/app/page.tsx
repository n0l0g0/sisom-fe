import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/services/api';
import DashboardRoomsList from './DashboardRoomsList';
import type { Room } from '@/services/api';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams?: { path?: string } }) {
  if (searchParams?.path && typeof searchParams.path === 'string') {
    const p = searchParams.path.startsWith('/') ? searchParams.path : '/';
    redirect(p);
  }
  let rooms = [] as Awaited<ReturnType<typeof api.getRooms>>;
  let invoices = [] as Awaited<ReturnType<typeof api.getInvoices>>;
  let buildings = [] as Awaited<ReturnType<typeof api.getBuildings>>;
  try {
    [rooms, invoices, buildings] = await Promise.all([
      api.getRooms(),
      api.getInvoices(),
      api.getBuildings(),
    ]);
  } catch {
    rooms = [];
    invoices = [];
    buildings = [];
  }
  
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const availableRooms = rooms.filter(r => r.status === 'VACANT').length;
  const derivePrice = (r: Room) => {
    const active = r.contracts?.[0];
    return (active?.currentRent ?? r.pricePerMonth) ?? null;
  };
  const priceGroups = [2100, 2500, 3000].map((p) => {
    const matches = rooms.filter(r => {
      const v = derivePrice(r);
      if (v === null) return false;
      if (p === 2100) return v >= 2100 && v < 2300;
      if (p === 2500) return v >= 2400 && v < 2600;
      if (p === 3000) return v >= 3000 && v < 3200;
      return v === p;
    });
    const total = matches.length;
    const vacant = matches.filter(r => r.status === 'VACANT').length;
    return { price: p, total, vacant };
  });
  
  const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'DRAFT');
  const unpaidBillsCount = unpaidInvoices.length;
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

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

  for (const room of rooms) {
    const bid: string = room.buildingId || 'none';
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
        .map(([floor, rs]) => {
          const sortedRooms = [...rs].sort((ra, rb) => {
            const aIsBannoi = String(ra.number || '').includes('บ้านน้อย');
            const bIsBannoi = String(rb.number || '').includes('บ้านน้อย');
            if (aIsBannoi !== bIsBannoi) return aIsBannoi ? 1 : -1;
            const na = parseInt(String(ra.number || '').replace(/\D/g, ''), 10);
            const nb = parseInt(String(rb.number || '').replace(/\D/g, ''), 10);
            if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
            return String(ra.number || '').localeCompare(String(rb.number || ''));
          });
          return { floor, rooms: sortedRooms };
        });
      return { ...g, floors };
    });

  return (
    <div className="fade-in space-y-8">
      <h2 className="text-2xl font-bold mb-6 text-[#8b5a3c]">แดชบอร์ด</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">ห้องทั้งหมด</p>
              <p className="text-3xl font-bold mt-1 text-[#f5a987]">{rooms.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#f5a987]/20">
              <svg className="w-6 h-6 text-[#f5a987]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">ห้องว่าง</p>
              <p className="text-3xl font-bold mt-1 text-emerald-500">{availableRooms}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">มีผู้เช่า</p>
              <p className="text-3xl font-bold mt-1 text-blue-500">{occupiedRooms}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">ค้างชำระ</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{unpaidBillsCount}</p>
              <p className="text-xs text-slate-400 mt-1">฿{totalUnpaidAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {priceGroups.map(pg => (
          <div
            key={pg.price}
            className="bg-white rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform duration-200 border border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pg.vacant > 0 ? 'bg-emerald-50' : 'bg-red-50'} border ${pg.vacant > 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                <svg className={`w-6 h-6 ${pg.vacant > 0 ? 'text-emerald-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={pg.vacant > 0 ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-slate-500 text-sm">ห้องราคา {pg.price.toLocaleString()} บาท</p>
                <p className={`text-xl md:text-2xl font-bold mt-1 ${pg.vacant > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ว่าง {pg.vacant} ห้อง จากทั้งหมด {pg.total}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-semibold mb-4 text-[#8b5a3c]">ดำเนินการด่วน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/floor-plan" className="p-4 border-2 border-dashed border-[#f8b89a]/40 hover:border-[#f5a987] hover:bg-[#f5a987]/10 transition rounded-xl group text-center block">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-[#f5a987]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <p className="text-sm text-slate-600">เพิ่มห้องพัก</p>
          </Link>
          <Link href="/meter" className="p-4 border-2 border-dashed border-[#f8b89a]/40 hover:border-[#f5a987] hover:bg-[#f5a987]/10 transition rounded-xl group text-center block">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-[#f5a987]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <p className="text-sm text-slate-600">จดมิเตอร์</p>
          </Link>
          <Link href="/bills" className="p-4 border-2 border-dashed border-[#f8b89a]/40 hover:border-[#f5a987] hover:bg-[#f5a987]/10 transition rounded-xl group text-center block">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-[#f5a987]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
            </svg>
            <p className="text-sm text-slate-600">สร้างบิล</p>
          </Link>
          <Link href="/payments" className="p-4 border-2 border-dashed border-[#f8b89a]/40 hover:border-[#f5a987] hover:bg-[#f5a987]/10 transition rounded-xl group text-center block">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-[#f5a987]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <p className="text-sm text-slate-600">รับชำระเงิน</p>
          </Link>
        </div>
      </div>
      <DashboardRoomsList
        totalRooms={rooms.length}
        groups={sortedGroups.map((g) => ({
          key: g.buildingId || 'none',
          buildingId: g.buildingId,
          buildingName: g.buildingName,
          buildingCode: g.buildingCode,
          totalRooms: g.totalRooms,
          floors: g.floors.map((f) => ({
            floor: f.floor,
        rooms: f.rooms,
          })),
        }))}
      />
    </div>
  )
}
