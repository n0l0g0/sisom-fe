import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { api, LineProfile } from '@/services/api';
import { KPIStat } from '@/components/dashboard/KPIStat';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { FinancialSnapshot } from '@/components/dashboard/FinancialSnapshot';
import { RoomStatusOverview } from '@/components/dashboard/RoomStatusOverview';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { RoomTypeIntelligence } from '@/components/dashboard/RoomTypeIntelligence';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams, params }: { searchParams?: Promise<{ path?: string }>, params: Promise<{locale: string}> }) {
  // Await searchParams before accessing properties
  const sp = await searchParams;
  const { locale } = await params;
  const t = await getTranslations({locale, namespace: 'Dashboard'});

  if (sp?.path && typeof sp.path === 'string') {
    const p = sp.path.startsWith('/') ? sp.path : '/';
    redirect(p);
  }
  
  let rooms = [] as Awaited<ReturnType<typeof api.getRooms>>;
  let invoices = [] as Awaited<ReturnType<typeof api.getInvoices>>;
  let recentChats = [] as Awaited<ReturnType<typeof api.getRecentChats>>;
  let lineProfiles: Record<string, LineProfile> = {};

  try {
    [rooms, invoices, recentChats] = await Promise.all([
      api.getRooms(),
      api.getInvoices(),
      api.getRecentChats(),
    ]);
    const ids = Array.from(new Set(recentChats.map(c => c.userId))).filter(s => s && s.trim().length > 0);
    if (ids.length > 0) {
      lineProfiles = await api.getLineProfiles(ids);
    }
  } catch (e) {
    console.error(e);
  }
  
  // --- KPI Calculations ---
  
  // 1. Revenue
  const monthlyRevenue = new Map<string, number>();
  invoices.forEach(inv => {
    if (inv.status === 'CANCELLED' || inv.status !== 'PAID') return;
    const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
    const amount = Number(inv.totalAmount);
    monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + amount);
  });

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentRevenue = monthlyRevenue.get(currentMonthKey) || 0;
  
  // Previous Month Revenue for Trend
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevRevenue = monthlyRevenue.get(prevMonthKey) || 0;
  const revenueTrend = prevRevenue > 0 
    ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) 
    : 0;

  // 2. Occupancy
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'OVERDUE').length;
  const vacantRooms = rooms.filter(r => r.status === 'VACANT').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // 3. Overdue
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE');
  const totalOverdueAmount = overdueInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  // 4. Financial Snapshot Stats
  const paidCount = invoices.filter(i => i.status === 'PAID').filter(i => i.year === new Date().getFullYear()).length; // Simple filter for now
  const pendingCount = invoices.filter(i => i.status === 'SENT').length;
  const overdueCount = overdueInvoices.length;
  const totalActiveInvoices = paidCount + pendingCount + overdueCount;

  // 5. Chart Data
  const revenueData = Array.from(monthlyRevenue.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([date, value]) => ({ date, value }));

  // 6. Activity Timeline Data
  const activityItems = recentChats.slice(0, 5).map(chat => ({
    id: chat.id,
    user: {
      name: lineProfiles[chat.userId]?.displayName || 'Unknown User',
      avatar: lineProfiles[chat.userId]?.pictureUrl,
      initials: (lineProfiles[chat.userId]?.displayName || 'U').substring(0, 2).toUpperCase()
    },
    action: chat.type === 'received_image' ? t('sent_image') : t('sent_message'),
    timestamp: chat.timestamp
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-900 transition-colors duration-300">
      {/* SECTION 1: HEADER */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700">
            <Calendar className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('this_month')}
          </Button>
          <Button variant="outline" className="bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700">
            <Download className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* SECTION 2: KPI STRIP */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KPIStat
          label={t('total_revenue')}
          value={`฿${currentRevenue.toLocaleString()}`}
          trend={revenueTrend}
          trendLabel={t('vs_last_month')}
          accentColor="indigo"
        />
        <KPIStat
          label={t('occupancy_rate')}
          value={`${occupancyRate}%`}
          trend={0} // TODO: Calculate occupancy trend
          trendLabel={t('stable')}
          accentColor="emerald"
        />
        <KPIStat
          label={t('overdue_amount')}
          value={`฿${totalOverdueAmount.toLocaleString()}`}
          trend={overdueCount > 0 ? 12 : -5} // Mock trend for demo
          trendLabel={t('vs_last_month')}
          accentColor="rose"
        />
        <KPIStat
          label={t('available_rooms')}
          value={vacantRooms}
          trendLabel={t('ready_to_rent')}
          accentColor="blue"
        />
      </div>

      {/* ROOM TYPE INTELLIGENCE */}
      <RoomTypeIntelligence rooms={rooms} />

      {/* SECTION 3: MAIN ANALYTICS */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title={t('revenue_overview')}
            subtitle={t('revenue_subtitle')}
            data={revenueData}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-1">
          <FinancialSnapshot
            totalInvoices={totalActiveInvoices}
            paid={paidCount}
            pending={pendingCount}
            overdue={overdueCount}
            className="h-full"
            labels={{
              title: t('financial_snapshot'),
              total: t('total_invoices'),
              paid: t('paid'),
              pending: t('pending'),
              overdue: t('overdue')
            }}
          />
        </div>
      </div>

      {/* SECTION 4 & 5: OPERATIONS & ACTIVITY */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RoomStatusOverview
          total={totalRooms}
          occupied={occupiedRooms}
          vacant={vacantRooms}
          maintenance={maintenanceRooms}
          labels={{
            title: t('room_status'),
            total: t('total_rooms'),
            occupied: t('occupied'),
            vacant: t('vacant'),
            maintenance: t('maintenance')
          }}
        />
        <ActivityTimeline 
          items={activityItems} 
          labels={{
            title: t('recent_activity'),
            empty: t('no_activity')
          }}
        />
      </div>
    </div>
  );
}
