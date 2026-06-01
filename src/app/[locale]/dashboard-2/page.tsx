import { Link } from '@/navigation';
import {
  ArrowRight,
  Banknote,
  Bell,
  CreditCard,
  FileText,
  Home,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import {
  api,
  Contract,
  Invoice,
  MaintenanceRequest,
  Payment,
  Room,
  Tenant,
} from '@/services/api';

export const dynamic = 'force-dynamic';

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

type SeriesPoint = {
  label: string;
  value: number;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  amount?: number;
  tone: 'emerald' | 'rose' | 'blue' | 'violet' | 'amber';
  time: string;
  icon: 'payment' | 'invoice' | 'tenant' | 'repair';
};

function money(value: number) {
  return `฿${Math.round(value).toLocaleString('th-TH')}`;
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function dateKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(date: Date, offset: number) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + offset);
  return copy;
}

function invoiceRoomNumber(invoice: Invoice) {
  return invoice.contract?.room?.number || invoice.contract?.roomId || '-';
}

function isUnpaid(invoice: Invoice) {
  return invoice.status === 'SENT' || invoice.status === 'OVERDUE';
}

function isRoomOccupied(room: Room) {
  return room.status === 'OCCUPIED' || room.status === 'OVERDUE';
}

function roomNumberValue(number: string) {
  const numeric = Number(String(number).replace(/\D/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getMonthSeries(invoices: Invoice[], now: Date): SeriesPoint[] {
  const paidByMonth = new Map<string, number>();
  invoices.forEach((invoice) => {
    if (invoice.status !== 'PAID') return;
    const key = dateKey(invoice.year, invoice.month);
    paidByMonth.set(key, (paidByMonth.get(key) || 0) + Number(invoice.totalAmount || 0));
  });

  return Array.from({ length: 6 }).map((_, index) => {
    const d = addMonths(now, index - 5);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return {
      label: MONTHS_TH[month - 1],
      value: paidByMonth.get(dateKey(year, month)) || 0,
    };
  });
}

function getOccupancySeries(contracts: Contract[], totalRooms: number, now: Date): SeriesPoint[] {
  if (!totalRooms) return [];

  return Array.from({ length: 10 }).map((_, index) => {
    const d = addMonths(now, index - 9);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const occupied = contracts.filter((contract) => {
      const start = new Date(contract.startDate);
      const end = contract.endDate ? new Date(contract.endDate) : null;
      return start <= endOfMonth && (!end || end >= d);
    }).length;
    return {
      label: MONTHS_TH[d.getMonth()],
      value: Math.min(100, Math.round((occupied / totalRooms) * 100)),
    };
  });
}

function sparkFromValues(values: number[], width = 118, height = 46) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return { x, y };
  });
}

function polyline(points: Array<{ x: number; y: number }>) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function trend(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function statusForRoom(room: Room, currentInvoice?: Invoice) {
  if (room.status === 'MAINTENANCE') return 'maintenance';
  if (currentInvoice?.status === 'OVERDUE' || room.status === 'OVERDUE') return 'overdue';
  if (currentInvoice?.status === 'SENT') return 'pending';
  if (room.status === 'VACANT') return 'vacant';
  return 'occupied';
}

function roomClass(status: string) {
  const classes: Record<string, string> = {
    occupied: 'bg-emerald-100 text-emerald-700 shadow-emerald-100/80',
    vacant: 'bg-slate-100 text-slate-500 shadow-slate-100/80',
    pending: 'bg-amber-100 text-amber-700 shadow-amber-100/80',
    overdue: 'bg-rose-500 text-white shadow-rose-200/80',
    maintenance: 'bg-blue-100 text-blue-700 shadow-blue-100/80',
  };
  return classes[status] || classes.vacant;
}

function Donut({
  value,
  segments,
  center,
  sub,
}: {
  value?: string;
  segments: Array<{ value: number; color: string }>;
  center: string;
  sub: string;
}) {
  const total = Math.max(segments.reduce((sum, item) => sum + item.value, 0), 1);
  let offset = 25;

  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#eef2f7" strokeWidth="6" />
        {segments.map((segment, index) => {
          const dash = (segment.value / total) * 100;
          const strokeDasharray = `${dash} ${100 - dash}`;
          const strokeDashoffset = offset;
          offset -= dash;
          return (
            <circle
              key={`${segment.color}-${index}`}
              cx="21"
              cy="21"
              r="15.9"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="6"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-bold text-slate-950">{value || center}</div>
        <div className="text-[11px] leading-tight text-slate-500">{value ? center : sub}</div>
        {value && <div className="text-[11px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const points = sparkFromValues(values);
  return (
    <svg viewBox="0 0 118 46" className="h-12 w-full" preserveAspectRatio="none">
      <polyline points={polyline(points)} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="2" fill={color} stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function BigLineChart({ data }: { data: SeriesPoint[] }) {
  const width = 720;
  const height = 260;
  const padding = 34;
  const max = Math.max(...data.map((item) => item.value), 100);
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (item.value / max) * (height - padding * 2);
    return { x, y };
  });
  const line = polyline(points);
  const area = `${line} ${width - padding},${height - padding} ${padding},${height - padding}`;

  return (
    <div className="relative h-[270px] w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboard2Revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6157ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6157ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = height - padding - tick * (height - padding * 2);
          return <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e8edf5" strokeWidth="1" />;
        })}
        <polygon points={area} fill="url(#dashboard2Revenue)" />
        <polyline points={line} fill="none" stroke="#6157ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="6" fill="#6157ff" stroke="white" strokeWidth="4" />
        ))}
      </svg>
      <div className="absolute bottom-1 left-10 right-10 flex justify-between text-xs font-medium text-slate-400">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export default async function Dashboard2Page() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const previous = addMonths(now, -1);
  const previousMonth = previous.getMonth() + 1;
  const previousYear = previous.getFullYear();

  let rooms: Room[] = [];
  let invoices: Invoice[] = [];
  let contracts: Contract[] = [];
  let tenants: Tenant[] = [];
  let payments: Payment[] = [];
  let maintenance: MaintenanceRequest[] = [];
  let activityLogs: Awaited<ReturnType<typeof api.getActivityLogs>> = [];

  try {
    [rooms, invoices, contracts, tenants, payments, maintenance, activityLogs] = await Promise.all([
      api.getRooms(),
      api.getInvoices(),
      api.getContracts(),
      api.getTenants({ includeHistory: true }),
      api.getPayments().catch(() => []),
      api.getMaintenanceRequests().catch(() => []),
      api.getActivityLogs(50).catch(() => []),
    ]);
  } catch (error) {
    console.error(error);
  }

  const monthInvoices = invoices.filter((invoice) => invoice.month === currentMonth && invoice.year === currentYear);
  const prevMonthInvoices = invoices.filter((invoice) => invoice.month === previousMonth && invoice.year === previousYear);
  const monthRevenue = monthInvoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const prevRevenue = prevMonthInvoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const revenueTrend = trend(monthRevenue, prevRevenue);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(isRoomOccupied).length;
  const vacantRooms = rooms.filter((room) => room.status === 'VACANT').length;
  const maintenanceRooms = rooms.filter((room) => room.status === 'MAINTENANCE').length;
  const occupancyRate = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const unpaidInvoices = invoices.filter(isUnpaid);
  const monthUnpaid = monthInvoices.filter(isUnpaid);
  const overdueAmount = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const prevOverdue = prevMonthInvoices.filter(isUnpaid).reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
  const overdueTrend = trend(overdueAmount, prevOverdue);

  const revenueSeries = getMonthSeries(invoices, now);
  const occupancySeries = getOccupancySeries(contracts, totalRooms, now);
  const overdueSeries = Array.from({ length: 10 }).map((_, index) => {
    const d = addMonths(now, index - 9);
    const value = invoices
      .filter((invoice) => invoice.year === d.getFullYear() && invoice.month === d.getMonth() + 1 && isUnpaid(invoice))
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    return value;
  });

  const currentInvoiceByRoom = new Map<string, Invoice>();
  monthInvoices.forEach((invoice) => {
    if (invoice.contract?.roomId) currentInvoiceByRoom.set(invoice.contract.roomId, invoice);
    if (invoice.contract?.room?.id) currentInvoiceByRoom.set(invoice.contract.room.id, invoice);
  });

  const groupedFloors = Array.from(
    rooms.reduce((map, room) => {
      const floorRooms = map.get(room.floor) || [];
      floorRooms.push(room);
      map.set(room.floor, floorRooms);
      return map;
    }, new Map<number, Room[]>())
  )
    .sort((a, b) => b[0] - a[0])
    .slice(0, 4)
    .map(([floor, floorRooms]) => ({
      floor,
      rooms: floorRooms.sort((a, b) => roomNumberValue(a.number) - roomNumberValue(b.number)).slice(0, 8),
    }));

  const dueBuckets = unpaidInvoices.reduce(
    (acc, invoice) => {
      const days = Math.max(0, Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86400000));
      const amount = Number(invoice.totalAmount || 0);
      if (days > 30) acc.over30 += amount;
      else if (days > 15) acc.over15 += amount;
      else acc.over7 += amount;
      return acc;
    },
    { over30: 0, over15: 0, over7: 0 }
  );

  const latestActivities: ActivityItem[] = [
    ...payments.slice(0, 6).map((payment) => ({
      id: `payment-${payment.id}`,
      title: `รับชำระค่าเช่า ห้อง ${payment.invoice ? invoiceRoomNumber(payment.invoice) : '-'}`,
      detail: payment.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ',
      amount: Number(payment.amount || 0),
      tone: 'emerald' as const,
      time: payment.paidAt,
      icon: 'payment' as const,
    })),
    ...unpaidInvoices.slice(0, 6).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      title: `ค้างชำระ ห้อง ${invoiceRoomNumber(invoice)}`,
      detail: `กำหนดชำระ ${new Date(invoice.dueDate).toLocaleDateString('th-TH')}`,
      amount: Number(invoice.totalAmount || 0),
      tone: 'rose' as const,
      time: invoice.dueDate,
      icon: 'invoice' as const,
    })),
    ...contracts.slice(0, 6).map((contract) => ({
      id: `contract-${contract.id}`,
      title: `ผู้เช่าใหม่ ห้อง ${contract.room?.number || '-'}`,
      detail: contract.tenant?.name || 'บันทึกสัญญาเช่า',
      tone: 'violet' as const,
      time: (contract as Contract & { createdAt?: string }).createdAt || contract.startDate,
      icon: 'tenant' as const,
    })),
    ...maintenance.slice(0, 6).map((item) => ({
      id: `maintenance-${item.id}`,
      title: `แจ้งซ่อม ห้อง ${item.room?.number || '-'}`,
      detail: item.title,
      tone: 'blue' as const,
      time: item.createdAt,
      icon: 'repair' as const,
    })),
  ]
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4);

  const paidCount = monthInvoices.filter((invoice) => invoice.status === 'PAID').length;
  const sentCount = monthInvoices.filter((invoice) => invoice.status === 'SENT').length;
  const overdueCount = unpaidInvoices.length;
  const profit = monthRevenue - overdueAmount;
  const activeTenants = tenants.filter((tenant) => tenant.status === 'ACTIVE').length;
  const incomeByRoom = totalRooms ? Math.round(monthRevenue / totalRooms) : 0;

  const cards = [
    {
      title: 'รายได้รวมเดือนนี้',
      value: money(monthRevenue),
      trend: revenueTrend,
      detail: 'จากเดือนที่แล้ว',
      color: '#6157ff',
      bg: 'bg-violet-100 text-violet-600',
      icon: Banknote,
      spark: revenueSeries.map((item) => item.value),
    },
    {
      title: 'อัตราการเข้าพัก',
      value: percent(occupancyRate),
      trend: 0,
      detail: 'จากข้อมูลสัญญาเช่า',
      color: '#10b981',
      bg: 'bg-emerald-100 text-emerald-600',
      icon: CreditCard,
      spark: occupancySeries.map((item) => item.value),
    },
    {
      title: 'ยอดค้างชำระ',
      value: money(overdueAmount),
      trend: overdueTrend,
      detail: 'จากบิลที่ยังไม่ชำระ',
      color: '#f43f5e',
      bg: 'bg-rose-100 text-rose-600',
      icon: WalletCards,
      spark: overdueSeries,
    },
    {
      title: 'ห้องว่าง',
      value: vacantRooms.toLocaleString('th-TH'),
      trend: undefined,
      detail: `จากทั้งหมด ${totalRooms.toLocaleString('th-TH')} ห้อง`,
      color: '#3b82f6',
      bg: 'bg-blue-100 text-blue-600',
      icon: Home,
      spark: [],
    },
  ];

  const insightCards = [
    {
      title: `รายได้เดือนนี้${revenueTrend >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(revenueTrend)}%`,
      detail: `ยอดเดือนนี้ ${money(monthRevenue)} เทียบกับเดือนก่อน ${money(prevRevenue)}`,
      tone: 'from-emerald-50 to-teal-50 text-emerald-700',
    },
    {
      title: `ห้องว่าง ${vacantRooms} ห้อง`,
      detail: `คิดเป็น ${percent(totalRooms ? (vacantRooms / totalRooms) * 100 : 0)} ของห้องทั้งหมด`,
      tone: 'from-amber-50 to-orange-50 text-amber-700',
    },
    {
      title: `มีผู้เช่าค้างชำระ ${overdueCount} บิล`,
      detail: `คิดเป็นเงิน ${money(overdueAmount)}`,
      tone: 'from-rose-50 to-pink-50 text-rose-700',
    },
  ];

  const summarySpark = revenueSeries.map((item) => item.value);

  return (
    <div className="-mx-6 -mt-20 min-h-screen bg-[#f7f9fd] px-5 pb-8 pt-6 text-slate-900 md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-slate-950">
              <span>สวัสดีครับ, คุณผู้ดูแล</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">ภาพรวมธุรกิจหอพักของคุณ วันนี้เป็นอย่างไรบ้าง</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-11 w-72 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-sm md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">ค้นหา...</span>
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm" type="button" aria-label="theme">
              <Settings className="h-4 w-4" />
            </button>
            <button className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm" type="button" aria-label="notifications">
              <Bell className="h-4 w-4" />
              {activityLogs.length > 0 && (
                <span className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {Math.min(activityLogs.length, 99)}
                </span>
              )}
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-start gap-4">
                  <div className={`grid h-11 w-11 place-items-center rounded-full ${card.bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-500">{card.title}</p>
                    <p className="mt-5 text-3xl font-bold tracking-normal text-slate-950">{card.value}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  {card.trend !== undefined ? (
                    <span className={`rounded-full px-2 py-1 font-bold ${card.trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {card.trend >= 0 ? '↑' : '↓'} {Math.abs(card.trend)}%
                    </span>
                  ) : null}
                  <span className="font-medium text-slate-400">{card.detail}</span>
                </div>
                <div className="mt-6">
                  {card.spark.length ? (
                    <MiniSparkline values={card.spark} color={card.color} />
                  ) : (
                    <div className="h-12 rounded-full bg-slate-100 p-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${totalRooms ? Math.round((vacantRooms / totalRooms) * 100) : 0}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">รายได้รวม</h2>
                <p className="mt-3 text-3xl font-bold text-slate-950">{money(monthRevenue)}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">↑ {Math.abs(revenueTrend)}% จาก 6 เดือนที่แล้ว</p>
              </div>
              <div className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">6 เดือน</div>
            </div>
            <BigLineChart data={revenueSeries} />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                AI Insight <Sparkles className="h-4 w-4 text-violet-500" />
              </h2>
              <Link href="/reports" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                ดูทั้งหมด
              </Link>
            </div>
            <div className="space-y-4">
              {insightCards.map((item) => (
                <div key={item.title} className={`rounded-2xl bg-gradient-to-br ${item.tone} p-5`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">ผังห้องพัก</h2>
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />มีผู้เช่า</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" />ว่าง</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-500" />ซ่อม</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-500" />ค้างชำระ</span>
                  <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />รอชำระ</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">อาคารทั้งหมด</div>
            </div>

            <div className="space-y-4">
              {groupedFloors.map((row) => (
                <div key={row.floor} className="grid grid-cols-[48px_1fr] items-center gap-4">
                  <div className="text-sm font-bold text-slate-600">ชั้น {row.floor}</div>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {row.rooms.map((room) => {
                      const status = statusForRoom(room, currentInvoiceByRoom.get(room.id));
                      return (
                        <Link
                          key={room.id}
                          href={`/floor-plan?roomId=${room.id}`}
                          className={`grid h-12 place-items-center rounded-xl text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5 ${roomClass(status)}`}
                        >
                          {room.number}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-slate-400">คลิกที่ห้องเพื่อดูรายละเอียด</p>
          </div>

          <div className="space-y-5 xl:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-bold text-slate-950">Quick Action</h2>
              <div className="mt-5 space-y-3">
                {[
                  { href: '/contracts', icon: Plus, title: 'เพิ่มผู้เช่าใหม่', detail: 'เพิ่มข้อมูลผู้เช่า' },
                  { href: '/bills', icon: FileText, title: 'ออกบิลค่าเช่า', detail: 'สร้างบิลค่าเช่า' },
                  { href: '/payments', icon: CreditCard, title: 'รับชำระเงิน', detail: 'บันทึกการรับชำระ' },
                  { href: '/maintenance', icon: Wrench, title: 'แจ้งซ่อม/งานบริการ', detail: 'สร้างใบแจ้งซ่อม' },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.title} href={action.href} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-violet-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-bold text-slate-800">{action.title}</span>
                        <span className="text-sm font-medium text-slate-400">{action.detail}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="mb-5 text-lg font-bold text-slate-950">อัตราการเข้าพัก</h2>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut
                value={percent(occupancyRate)}
                center={`ทั้งหมด ${totalRooms.toLocaleString('th-TH')}`}
                sub="ห้อง"
                segments={[
                  { value: occupiedRooms, color: '#10b981' },
                  { value: vacantRooms, color: '#3b82f6' },
                  { value: maintenanceRooms, color: '#cbd5e1' },
                ]}
              />
              <div className="flex-1 space-y-3 text-sm font-semibold">
                <div className="flex justify-between"><span className="text-emerald-600">มีผู้เช่า</span><span>{occupiedRooms} ห้อง</span></div>
                <div className="flex justify-between"><span className="text-blue-600">ว่าง</span><span>{vacantRooms} ห้อง</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ซ่อมบำรุง</span><span>{maintenanceRooms} ห้อง</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="mb-5 text-lg font-bold text-slate-950">ค้างชำระแยกตามช่วงเวลา</h2>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Donut
                center={money(overdueAmount)}
                sub="รวมค้างชำระ"
                segments={[
                  { value: dueBuckets.over30, color: '#f43f5e' },
                  { value: dueBuckets.over15, color: '#f59e0b' },
                  { value: dueBuckets.over7, color: '#facc15' },
                ]}
              />
              <div className="flex-1 space-y-3 text-sm font-semibold">
                <div className="flex justify-between"><span className="text-rose-600">เกิน 30 วัน</span><span>{money(dueBuckets.over30)}</span></div>
                <div className="flex justify-between"><span className="text-amber-600">เกิน 15-30 วัน</span><span>{money(dueBuckets.over15)}</span></div>
                <div className="flex justify-between"><span className="text-yellow-600">เกิน 7-15 วัน</span><span>{money(dueBuckets.over7)}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 p-6 text-white shadow-[0_16px_45px_rgba(79,70,229,0.2)]">
            <p className="text-lg font-bold">ใช้งาน 13Rent บนมือถือ</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-violet-100">จัดการหอพักของคุณได้ทุกที่ทุกเวลา</p>
            <Link href="/meter" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700">
              ดาวน์โหลดแอป <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">กิจกรรมล่าสุด</h2>
              <Link href="/activity-logs" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">ดูทั้งหมด</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {latestActivities.map((item) => {
                const Icon = item.icon === 'payment' ? CreditCard : item.icon === 'invoice' ? FileText : item.icon === 'tenant' ? Users : Wrench;
                const toneClass = {
                  emerald: 'bg-emerald-50 text-emerald-600',
                  rose: 'bg-rose-50 text-rose-600',
                  blue: 'bg-blue-50 text-blue-600',
                  violet: 'bg-violet-50 text-violet-600',
                  amber: 'bg-amber-50 text-amber-600',
                }[item.tone];
                return (
                  <div key={item.id} className="flex items-center gap-4 py-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${toneClass}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">{item.title}</p>
                      <p className="truncate text-sm font-medium text-slate-400">{item.detail}</p>
                    </div>
                    {item.amount !== undefined && <div className={`font-bold ${item.tone === 'rose' ? 'text-rose-500' : 'text-emerald-600'}`}>{money(item.amount)}</div>}
                    <div className="hidden text-sm font-medium text-slate-400 sm:block">
                      {new Date(item.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              {!latestActivities.length && <div className="py-10 text-center text-sm font-medium text-slate-400">ยังไม่มีกิจกรรมล่าสุด</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-lg font-bold text-slate-950">สรุปภาพรวม</h2>
            <p className="mt-1 text-sm font-medium text-slate-400">เดือน{new Date(currentYear, currentMonth - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</p>
            <div className="mt-6 space-y-4 text-sm font-semibold">
              <div className="flex justify-between"><span className="text-slate-500">รายได้รวม</span><span>{money(monthRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ค้างชำระ</span><span>{money(overdueAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">กำไรสุทธิ</span><span>{money(profit)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">อัตราเข้าพัก</span><span>{percent(occupancyRate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ผู้เช่าปัจจุบัน</span><span>{activeTenants.toLocaleString('th-TH')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">รายได้เฉลี่ย/ห้อง</span><span>{money(incomeByRoom)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">บิลเดือนนี้</span><span>{paidCount} จ่ายแล้ว / {sentCount} รอ</span></div>
            </div>
            <div className="mt-6">
              <MiniSparkline values={summarySpark} color="#7c3aed" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
