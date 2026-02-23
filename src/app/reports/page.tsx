import { api, Invoice, Room, MaintenanceRequest } from '@/services/api';
import MonthYearSelector from './MonthYearSelector';

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
  return ((curr - prev) / prev) * 100;
}

function getThaiMonthShort(index: number) {
  const labels = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
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

  const currentYearInvoices = invoices.filter(
    (inv) => inv.year === year && inv.status !== 'CANCELLED',
  );
  const previousYearInvoices = invoices.filter(
    (inv) => inv.year === previousYear && inv.status !== 'CANCELLED',
  );

  const revenueYear = currentYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount),
    0,
  );
  const revenuePrevYear = previousYearInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount),
    0,
  );

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
  const profit = revenueYear - totalExpense;

  const revenueChangePercent = calculateChangePercent(
    revenueYear,
    revenuePrevYear || null,
  );
  const expensePrevYear = previousYearInvoices.reduce(
    (sum, inv) =>
      sum +
      toNumber(inv.waterAmount) +
      toNumber(inv.electricAmount) +
      toNumber(inv.otherFees),
    0,
  );
  const expenseChangePercent = calculateChangePercent(
    totalExpense,
    expensePrevYear || null,
  );

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(
    (room) => room.status === 'OCCUPIED' || room.status === 'OVERDUE',
  ).length;
  const vacantRooms = rooms.filter((room) => room.status === 'VACANT').length;
  const occupancyRate =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

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
      monthLabel: getThaiMonthShort(index),
      amount,
    };
  });

  const maxMonthlyAmount = monthlyRevenue.reduce(
    (max, item) => (item.amount > max ? item.amount : max),
    0,
  );

  const monthlyRevenueWithPercent = monthlyRevenue.map((item) => ({
    ...item,
    value: maxMonthlyAmount > 0 ? (item.amount / maxMonthlyAmount) * 100 : 0,
  }));

  const expenseParts = [
    {
      key: 'electric',
      label: 'ค่าไฟฟ้าส่วนกลาง',
      color: 'bg-blue-500',
      amount: electricExpense,
    },
    {
      key: 'water',
      label: 'ค่าน้ำประปา',
      color: 'bg-cyan-400',
      amount: waterExpense,
    },
    {
      key: 'maintenance',
      label: 'ค่าซ่อมบำรุง',
      color: 'bg-orange-400',
      amount: maintenanceExpense,
    },
    {
      key: 'other',
      label: 'อื่นๆ',
      color: 'bg-slate-300',
      amount: otherExpense,
    },
  ];

  const expenseTotalForPercent = expenseParts.reduce(
    (sum, part) => sum + part.amount,
    0,
  );

  const expensePartsWithPercent = expenseParts.map((part) => {
    const percent =
      expenseTotalForPercent > 0
        ? Math.round((part.amount / expenseTotalForPercent) * 100)
        : 0;
    return {
      ...part,
      percent,
    };
  });

  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#8b5a3c]">รายงานสรุป</h1>
          <p className="text-slate-500 text-sm mt-1">
            ภาพรวมผลประกอบการและสถิติหอพักจากข้อมูลจริง
          </p>
        </div>
        <MonthYearSelector defaultMonth={month} defaultYear={year} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">รายรับรวม (ปีนี้)</p>
          <p className="text-3xl font-bold text-green-600">
            ฿{formatCurrency(revenueYear)}
          </p>
          <div className="flex items-center gap-1 text-xs mt-2">
            {revenueChangePercent !== null ? (
              <>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={
                      revenueChangePercent >= 0
                        ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                        : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                    }
                  />
                </svg>
                <span
                  className={
                    revenueChangePercent >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }
                >
                  {`${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent.toFixed(
                    1,
                  )}% จากปีก่อน`}
                </span>
              </>
            ) : (
              <span className="text-slate-400">ยังไม่มีข้อมูลเปรียบเทียบ</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">ค่าใช้จ่ายรวม</p>
          <p className="text-3xl font-bold text-red-500">
            ฿{formatCurrency(totalExpense)}
          </p>
          <div className="flex items-center gap-1 text-xs mt-2">
            {expenseChangePercent !== null ? (
              <>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={
                      expenseChangePercent >= 0
                        ? 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                        : 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    }
                  />
                </svg>
                <span
                  className={
                    expenseChangePercent >= 0
                      ? 'text-red-500'
                      : 'text-green-500'
                  }
                >
                  {`${expenseChangePercent >= 0 ? '+' : ''}${expenseChangePercent.toFixed(
                    1,
                  )}% จากปีก่อน`}
                </span>
              </>
            ) : (
              <span className="text-slate-400">ยังไม่มีข้อมูลเปรียบเทียบ</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">กำไรสุทธิ</p>
          <p className="text-3xl font-bold text-[#f5a987]">
            ฿{formatCurrency(profit)}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>รายรับหักค่าใช้จ่ายทั้งหมดปี {year + 543}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">อัตราการเข้าพัก</p>
          <p className="text-3xl font-bold text-blue-600">
            {occupancyRate}%
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>
              ห้องว่าง {vacantRooms} ห้อง จากทั้งหมด {totalRooms} ห้อง
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-[#8b5a3c] mb-6">รายรับรายเดือน</h3>
          <div className="space-y-4">
            {monthlyRevenueWithPercent.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-8">
                  {item.monthLabel}
                </span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f5a987] rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-700 w-20 text-right">
                  ฿{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-[#8b5a3c] mb-6">สัดส่วนค่าใช้จ่าย</h3>
          <div className="space-y-6">
            {expensePartsWithPercent.map((part) => (
              <div key={part.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${part.color}`} />
                  <span className="text-sm text-slate-600">{part.label}</span>
                </div>
                <span className="text-sm font-bold">
                  ฿{formatCurrency(part.amount)}{' '}
                  {expenseTotalForPercent > 0 ? `(${part.percent}%)` : ''}
                </span>
              </div>
            ))}

            <div className="h-4 flex rounded-full overflow-hidden mt-4">
              {expensePartsWithPercent.map((part) => (
                <div
                  key={part.key}
                  className={part.color}
                  style={{
                    width:
                      expenseTotalForPercent > 0 ? `${part.percent}%` : '0%',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
