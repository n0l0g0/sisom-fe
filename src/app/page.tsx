import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api, DormExtra, LineProfile } from '@/services/api';
import DashboardRoomsList from './DashboardRoomsList';
import type { Room, DormConfig } from '@/services/api';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams?: { path?: string } }) {
  if (searchParams?.path && typeof searchParams.path === 'string') {
    const p = searchParams.path.startsWith('/') ? searchParams.path : '/';
    redirect(p);
  }
  let rooms = [] as Awaited<ReturnType<typeof api.getRooms>>;
  let invoices = [] as Awaited<ReturnType<typeof api.getInvoices>>;
  let buildings = [] as Awaited<ReturnType<typeof api.getBuildings>>;
  let dormConfig = null as DormConfig | null;
  let dormExtra = {} as DormExtra;
  let recentChats = [] as Awaited<ReturnType<typeof api.getRecentChats>>;
  let lineUsage = null as Awaited<ReturnType<typeof api.getLineUsage>> | null;
  let lineProfiles: Record<string, LineProfile> = {};
  try {
    [rooms, invoices, buildings, dormConfig, dormExtra, recentChats, lineUsage] = await Promise.all([
      api.getRooms(),
      api.getInvoices(),
      api.getBuildings(),
      api.getDormConfig(),
      api.getDormExtra(),
      api.getRecentChats(),
      api.getLineUsage(),
    ]);
    const ids = Array.from(new Set(recentChats.map(c => c.userId))).filter(s => s && s.trim().length > 0);
    lineProfiles = ids.length ? await api.getLineProfiles(ids) : {};
  } catch {
    rooms = [];
    invoices = [];
    buildings = [];
    dormConfig = null;
    dormExtra = {};
    recentChats = [];
    lineUsage = null;
    lineProfiles = {};
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
  
  const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');
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
      <header className="mb-2">
        <div className="flex items-center gap-4">
          {dormExtra?.logoUrl ? (
            <img src={dormExtra.logoUrl} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-orange-200 shadow-lg" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏢</span>
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold text-orange-900">Dashboard หอพัก</h2>
            <p className="text-orange-700">{dormConfig?.dormName || 'หอพัก'}</p>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-hover bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🏠</span>
            <span className="text-xs text-orange-700 bg-orange-200 px-2 py-1 rounded-full">ทั้งหมด</span>
          </div>
          <p className="text-4xl font-bold text-orange-900 mb-1">{rooms.length}</p>
          <p className="text-orange-700 text-sm">ห้องทั้งหมด</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">✅</span>
            <span className="text-xs text-green-700 bg-green-200 px-2 py-1 rounded-full">ว่าง</span>
          </div>
          <p className="text-4xl font-bold text-green-600 mb-1">{availableRooms}</p>
          <p className="text-green-700 text-sm">ห้องว่าง</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">👤</span>
            <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded-full">มีผู้เช่า</span>
          </div>
          <p className="text-4xl font-bold text-blue-600 mb-1">{occupiedRooms}</p>
          <p className="text-blue-700 text-sm">มีผู้พักอาศัย</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">⚠️</span>
            <span className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded-full">ค้างชำระ</span>
          </div>
          <p className="text-4xl font-bold text-red-600 mb-1">{unpaidBillsCount}</p>
          <p className="text-red-700 text-sm">฿{totalUnpaidAmount.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card-hover bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💬</span>
            <span className="text-xs text-indigo-700 bg-indigo-200 px-2 py-1 rounded-full">แชทล่าสุด</span>
          </div>
          <div className="space-y-2">
            {recentChats.length === 0 ? (
              <p className="text-indigo-700 text-sm">ยังไม่มีรายการแชท</p>
            ) : (
              recentChats.map((c) => {
                const isRecv = c.type === 'received_text' || c.type === 'received_image';
                const icon = isRecv ? '📩' : '📤';
                const label = isRecv ? 'รับ' : 'ส่ง';
                const content =
                  c.type === 'received_image'
                    ? 'รูปภาพ'
                    : c.text
                      ? c.text
                      : c.altText
                        ? c.altText
                        : 'ข้อความ';
                const when = new Date(c.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 bg-white/70 rounded-xl border border-indigo-200">
                    <div className="text-xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-indigo-900">{label}</span>
                        <span className="text-xs text-indigo-700">{when}</span>
                      </div>
                      <p className="text-indigo-800 text-sm mt-1 break-words">{content}</p>
                      <p className="text-indigo-600 text-xs mt-1">
                        LINE: {lineProfiles[c.userId]?.displayName || c.userId}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="card-hover bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📈</span>
            <span className="text-xs text-purple-700 bg-purple-200 px-2 py-1 rounded-full">การใช้งาน LINE</span>
          </div>
          {lineUsage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-900">เดือน {lineUsage.month}</span>
                <span className="text-sm text-purple-900">{lineUsage.percent}%</span>
              </div>
              <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${lineUsage.percent}%` }}
                />
              </div>
              <div className="text-purple-900 text-sm">
                ส่งแล้ว {lineUsage.sent.toLocaleString()} / {lineUsage.limit.toLocaleString()} เหลือ {lineUsage.remaining.toLocaleString()}
              </div>
              <div className="text-purple-800 text-xs">
                รายละเอียด: ข้อความ {lineUsage.breakdown.pushText?.toLocaleString?.() ?? lineUsage.breakdown.pushText} | Flex {lineUsage.breakdown.pushFlex?.toLocaleString?.() ?? lineUsage.breakdown.pushFlex}
              </div>
              <div className="mt-2 text-xs text-purple-700">
                โควตาอ้างอิงจาก LINE Official หากมี
              </div>
            </div>
          ) : (
            <p className="text-purple-700 text-sm">ไม่สามารถโหลดข้อมูลการใช้งาน LINE ได้</p>
          )}
        </div>
      </div>
      
      <div className="mb-2">
        <h3 className="text-xl font-semibold text-orange-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">💰</span> ห้องว่างตามราคา
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {priceGroups.map(ps => {
          const percent = ps.total > 0 ? Math.round((ps.vacant / ps.total) * 100) : 0;
          return (
            <div key={ps.price} className="card-hover bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-orange-900">฿{ps.price.toLocaleString()}</span>
                <span className="text-xs text-orange-700 bg-orange-200 px-2 py-1 rounded-full">/เดือน</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-600">{ps.vacant}</p>
                  <p className="text-orange-700 text-sm">ห้องว่าง</p>
                </div>
                <div className="text-right">
                  <p className="text-lg text-orange-700">จาก {ps.total} ห้อง</p>
                  <div className="w-24 h-2 bg-orange-200 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
