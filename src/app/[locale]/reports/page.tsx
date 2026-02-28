import { api, Invoice, Room, MaintenanceRequest } from '@/services/api';
import ReportsHeaderControls from './ReportsHeaderControls';
import { KPIStat } from '@/components/dashboard/KPIStat';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity, Users } from 'lucide-react';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const fallback = Number(value ?? 0);
  return Number.isFinite(fallback) ? fallback : 0;
}

function formatCurrency(amount: number) {
  return toNumber(amount).toLocaleString('th-TH');
}

function calculateChangePercent(current: number, previous: number | null) {
  const curr = toNumber(current);
  const prev = previous === null ? null : toNumber(previous);
  if (prev === null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function getThaiMonthShort(index: number) {
  const labels = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return labels[index] ?? '';
}

export default async function ReportsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const previousYear = year - 1;

  let invoices: Invoice[] = [];
  let rooms: Room[] = [];
  let maintenanceRequests: MaintenanceRequest[] = [];

  try {
    const [invRes, roomRes, maintenanceRes] = await Promise.all([
      api.getInvoices(),
      api.getRooms(),
      api.getMaintenanceRequests(),
    ]);
    invoices = invRes;
    rooms = roomRes;
    maintenanceRequests = maintenanceRes;
  } catch {
    invoices = [];
    rooms = [];
    maintenanceRequests = [];
  }

  // --- Data Processing ---

  const currentYearInvoices = invoices.filter(
    (inv) => inv.year === year && inv.status !== 'CANCELLED',
  );
  const previousYearInvoices = invoices.filter(
    (inv) => inv.year === previousYear && inv.status !== 'CANCELLED',
  );

  // Revenue
  const revenueYear = currentYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount),
    0,
  );
  const revenuePrevYear = previousYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount),
    0,
  );
  const revenueChangePercent = calculateChangePercent(revenueYear, revenuePrevYear);

  // Expenses
  const waterExpense = currentYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.waterAmount),
    0,
  );
  const electricExpense = currentYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.electricAmount),
    0,
  );
  const otherExpense = currentYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.otherFees),
    0,
  );
  const maintenanceExpense = maintenanceRequests
    .filter(
      (req) =>
        req.cost &&
        toNumber(req.cost) > 0 &&
        new Date(req.createdAt).getFullYear() === year &&
        req.status !== 'CANCELLED',
    )
    .reduce((sum, req) => sum + toNumber(req.cost), 0);

  const totalExpense = waterExpense + electricExpense + maintenanceExpense + otherExpense;
  const expensePrevYear = previousYearInvoices.reduce(
    (sum, inv) =>
      sum +
      toNumber(inv.waterAmount) +
      toNumber(inv.electricAmount) +
      toNumber(inv.otherFees),
    0,
  );
  // Note: Previous year maintenance not calculated here, approximation
  const expenseChangePercent = calculateChangePercent(totalExpense, expensePrevYear);

  // Profit
  const profit = revenueYear - totalExpense;
  const profitPrevYear = revenuePrevYear - expensePrevYear;
  const profitChangePercent = calculateChangePercent(profit, profitPrevYear);

  // Occupancy
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(
    (room) => room.status === 'OCCUPIED' || room.status === 'OVERDUE',
  ).length;
  const occupancyRate =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Monthly Revenue for Chart
  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const targetMonth = index + 1;
    const monthInvoices = currentYearInvoices.filter(
      (inv) => inv.month === targetMonth,
    );
    const amount = monthInvoices.reduce(
      (sum, inv) => sum + toNumber(inv.totalAmount),
      0,
    );
    return {
      date: getThaiMonthShort(index),
      value: amount,
    };
  });

  // Expense Breakdown
  const expenseParts = [
    {
      key: 'electric',
      label: 'ค่าไฟฟ้า',
      color: 'bg-rose-500',
      amount: electricExpense,
    },
    {
      key: 'water',
      label: 'ค่าน้ำประปา',
      color: 'bg-blue-500',
      amount: waterExpense,
    },
    {
      key: 'maintenance',
      label: 'ค่าซ่อมบำรุง',
      color: 'bg-amber-500',
      amount: maintenanceExpense,
    },
    {
      key: 'other',
      label: 'อื่นๆ',
      color: 'bg-slate-500',
      amount: otherExpense,
    },
  ].sort((a, b) => b.amount - a.amount);

  const expenseTotalForPercent = expenseParts.reduce((sum, part) => sum + part.amount, 0);
  const expensePartsWithPercent = expenseParts.map((part) => ({
    ...part,
    percent: expenseTotalForPercent > 0 ? Math.round((part.amount / expenseTotalForPercent) * 100) : 0,
  }));

  // --- Insights Calculation ---
  
  // Map contractId to Room
  const contractRoomMap = new Map<string, Room>();
  rooms.forEach(r => {
    r.contracts?.forEach(c => contractRoomMap.set(c.id, r));
  });

  // 1. Highest Revenue Room
  const roomRevenueMap = new Map<string, number>();
  currentYearInvoices.forEach(inv => {
    const room = contractRoomMap.get(inv.contractId);
    if (room) {
      const current = roomRevenueMap.get(room.number) || 0;
      roomRevenueMap.set(room.number, current + toNumber(inv.totalAmount));
    }
  });
  let highestRevenueRoom = { number: '-', amount: 0 };
  roomRevenueMap.forEach((amount, number) => {
    if (amount > highestRevenueRoom.amount) highestRevenueRoom = { number, amount };
  });

  // 2. Highest Overdue Room
  const roomOverdueMap = new Map<string, number>();
  invoices.filter(inv => inv.status === 'OVERDUE').forEach(inv => {
    const room = contractRoomMap.get(inv.contractId);
    if (room) {
      const current = roomOverdueMap.get(room.number) || 0;
      roomOverdueMap.set(room.number, current + toNumber(inv.totalAmount));
    }
  });
  let highestOverdueRoom = { number: '-', amount: 0 };
  roomOverdueMap.forEach((amount, number) => {
    if (amount > highestOverdueRoom.amount) highestOverdueRoom = { number, amount };
  });

  // 3. Highest Expense Category
  const highestExpense = expenseParts[0]; // Already sorted

  return (
    <div className="dark space-y-8 fade-in min-h-screen bg-[#0f172a] p-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">รายงานสรุป</h1>
          <p className="text-slate-400 text-sm mt-1">
            ภาพรวมรายได้และค่าใช้จ่ายของหอพัก
          </p>
        </div>
        <ReportsHeaderControls defaultMonth={month} defaultYear={year} />
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPIStat
          label="รายรับรวม"
          value={`฿${formatCurrency(revenueYear)}`}
          trend={revenueChangePercent ?? 0}
          trendLabel="เทียบปีก่อน"
          accentColor="emerald"
          className="bg-slate-800 border-slate-700 hover:bg-slate-750 dark:bg-slate-800 dark:border-slate-700"
        />
        <KPIStat
          label="ค่าใช้จ่ายรวม"
          value={`฿${formatCurrency(totalExpense)}`}
          trend={expenseChangePercent ?? 0}
          trendLabel="เทียบปีก่อน"
          accentColor="rose"
          className="bg-slate-800 border-slate-700 hover:bg-slate-750 dark:bg-slate-800 dark:border-slate-700"
        />
        <KPIStat
          label="กำไรสุทธิ"
          value={`฿${formatCurrency(profit)}`}
          trend={profitChangePercent ?? 0}
          trendLabel="เทียบปีก่อน"
          accentColor="indigo"
          className="bg-slate-800 border-slate-700 hover:bg-slate-750 dark:bg-slate-800 dark:border-slate-700"
        />
        <KPIStat
          label="อัตราการเข้าพัก"
          value={`${occupancyRate}%`}
          trend={0} // Placeholder
          trendLabel="คงที่"
          accentColor="cyan"
          className="bg-slate-800 border-slate-700 hover:bg-slate-750 dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left: Revenue Chart */}
        <div className="lg:col-span-8">
          <ChartCard
            title="รายรับรายเดือน"
            subtitle={`ข้อมูลปี ${year + 543}`}
            data={monthlyRevenue}
            className="h-full bg-slate-800 border-slate-700 dark:bg-slate-800 dark:border-slate-700"
          />
        </div>

        {/* Right: Expense Breakdown */}
        <div className="lg:col-span-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 h-full shadow-sm">
            <h3 className="text-base font-semibold text-white mb-6">สัดส่วนค่าใช้จ่าย</h3>
            
            <div className="space-y-6">
              {expensePartsWithPercent.map((part) => (
                <div key={part.key}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-300">{part.label}</span>
                    <span className="text-sm font-bold text-white">฿{formatCurrency(part.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${part.color}`} 
                      style={{ width: `${part.percent}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 text-right">{part.percent}%</div>
                </div>
              ))}
            </div>
            
            {expensePartsWithPercent.length === 0 && (
              <div className="text-center text-slate-500 py-8">ไม่มีข้อมูลค่าใช้จ่าย</div>
            )}
          </div>
        </div>
      </div>

      {/* INSIGHTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">ห้องที่สร้างรายได้สูงสุด</p>
            <p className="text-xl font-bold text-white">ห้อง {highestRevenueRoom.number}</p>
            <p className="text-xs text-emerald-400 mt-1">฿{formatCurrency(highestRevenueRoom.amount)}</p>
          </div>
          <div className="p-3 bg-slate-700 rounded-lg">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">ห้องที่ค้างชำระมากที่สุด</p>
            <p className="text-xl font-bold text-white">ห้อง {highestOverdueRoom.number}</p>
            <p className="text-xs text-rose-400 mt-1">฿{formatCurrency(highestOverdueRoom.amount)}</p>
          </div>
          <div className="p-3 bg-slate-700 rounded-lg">
            <Wallet className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">ค่าใช้จ่ายสูงสุดเดือนนี้</p>
            <p className="text-xl font-bold text-white">{highestExpense?.label || '-'}</p>
            <p className="text-xs text-amber-400 mt-1">฿{formatCurrency(highestExpense?.amount || 0)}</p>
          </div>
          <div className="p-3 bg-slate-700 rounded-lg">
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
