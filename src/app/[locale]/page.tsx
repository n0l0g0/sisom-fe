import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api, DormExtra, LineProfile } from '@/services/api';
import type { Room, DormConfig } from '@/services/api';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { DollarSign, Users, AlertCircle, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams?: { path?: string } }) {
  if (searchParams?.path && typeof searchParams.path === 'string') {
    const p = searchParams.path.startsWith('/') ? searchParams.path : '/';
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
  
  // KPI Calculations
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status !== 'VACANT').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  
  const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
  
  // Vacancy by price tiers
  const priceTiers = [2100, 2500, 3000] as const;
  const priceStats = priceTiers.map((p) => {
    const roomsAtPrice = rooms.filter(r => Number(r.pricePerMonth || 0) === p);
    const vacant = roomsAtPrice.filter(r => r.status === 'VACANT').length;
    return { price: p, vacant, total: roomsAtPrice.length };
  });
  
  // Revenue Chart Data (Last 6 months)
  const monthlyRevenue = new Map<string, number>();
  invoices.forEach(inv => {
    if (inv.status === 'CANCELLED') return;
    // Use paid revenue or billed revenue? Let's use Billed for now as it reflects potential.
    // Or strictly PAID. Let's use PAID for "Revenue".
    if (inv.status !== 'PAID') return;
    
    const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
    const amount = Number(inv.totalAmount);
    monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + amount);
  });
  
  const revenueData = Array.from(monthlyRevenue.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([date, value]) => ({ date, value }));

  // Current Month Revenue
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

  // Recent Activity Mapping
  const activityItems = recentChats.slice(0, 5).map(chat => ({
    id: chat.id,
    user: {
      name: lineProfiles[chat.userId]?.displayName || 'Unknown User',
      avatar: lineProfiles[chat.userId]?.pictureUrl,
      initials: (lineProfiles[chat.userId]?.displayName || 'U').substring(0, 2).toUpperCase()
    },
    action: 'sent a message',
    timestamp: chat.timestamp
  }));

  // Recent Invoices Sorting
  const sortedInvoices = [...invoices].sort((a, b) => 
    (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
  );

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your property performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue (This Month)"
          value={`฿${currentRevenue.toLocaleString()}`}
          trend={{ value: revenueTrend }}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          description={`${occupiedRooms} occupied / ${totalRooms} total`}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="Overdue Payments"
          value={`฿${totalUnpaidAmount.toLocaleString()}`}
          description={`${unpaidInvoices.length} invoices overdue`}
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <KPICard
          title="Available Rooms"
          value={totalRooms - occupiedRooms}
          description="Ready for new tenants"
          icon={<Home className="h-4 w-4" />}
        />
        {priceStats.map(s => (
          <KPICard
            key={s.price}
            title={`฿${s.price.toLocaleString()}`}
            value={`${s.vacant} / ${s.total}`}
            description="vacant / total"
            icon={<Home className="h-4 w-4" />}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RevenueChart data={revenueData} />
        </div>
        <div className="col-span-3">
          <RecentInvoices invoices={sortedInvoices} />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-3">
          <RecentActivity items={activityItems} />
        </div>
        {/* Placeholder for Occupancy Chart or other widget */}
      </div>
    </div>
  );
}
