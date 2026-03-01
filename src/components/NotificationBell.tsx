'use client';

import { useState, useEffect, useRef } from 'react';
import { api, Payment, MaintenanceRequest, Room } from '@/services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Wrench, Wallet, CheckCircle2, XCircle } from 'lucide-react';

export function NotificationBell() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [recentHistory, setRecentHistory] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      // Fetch rooms map if empty
      let currentRooms = { ...rooms };
      if (Object.keys(currentRooms).length === 0) {
        const rList = await api.getRooms().catch(() => []);
        const map: Record<string, Room> = {};
        rList.forEach((r) => { map[r.id] = r; });
        setRooms(map);
        currentRooms = map;
      }

      // Fetch pending payments
      const pList = await api.getPayments(undefined, 'PENDING').catch(() => []);
      
      // Fetch recent history (Verified/Rejected for current month)
      // Note: This is an approximation of "recent" since API doesn't support limit/offset properly yet
      const now = new Date();
      const hList = await api.getPayments(undefined, undefined, now.getMonth() + 1, now.getFullYear()).catch(() => []);
      const history = hList
        .filter(p => p.status === 'VERIFIED' || p.status === 'REJECTED')
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
        .slice(0, 5); // Take top 5 recent

      // Fetch maintenance requests and filter pending
      const mList = await api.getMaintenanceRequests().catch(() => []);
      const pendingM = mList.filter((m) => m.status === 'PENDING');

      setPayments(pList);
      setRecentHistory(history);
      setMaintenance(pendingM);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMaintenanceClick = async (m: MaintenanceRequest) => {
    try {
      setIsOpen(false);
      // Optimistic update to remove from list immediately (simulating "read")
      setMaintenance((prev) => prev.filter((item) => item.id !== m.id));
      
      // Update status to IN_PROGRESS so it doesn't show up as PENDING anymore
      await api.updateMaintenanceRequest(m.id, { status: 'IN_PROGRESS' });
      
      router.push('/maintenance');
    } catch (e) {
      console.error('Failed to update maintenance request', e);
      // Re-fetch to sync state if failed
      fetchNotifications();
    }
  };

  const handlePaymentClick = (p: Payment) => {
    setIsOpen(false);
    // For pending payments, go to pending status.
    // For verified/rejected, go to that status.
    if (p.status === 'PENDING') {
      router.push('/payments?status=PENDING');
    } else {
      router.push(`/payments?status=${p.status}`);
    }
  };

  const total = payments.length + maintenance.length;
  const hasHistory = recentHistory.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-muted bg-card shadow-sm border border-border relative text-muted-foreground transition-all hover:text-foreground active:scale-95"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background shadow-sm animate-pulse">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-popover rounded-xl shadow-xl border border-border z-50 overflow-hidden ring-1 ring-black/5">
          <div className="p-3 border-b border-border bg-muted/50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {total > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                {total} New
              </span>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {total === 0 && !hasHistory ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-sm">No new notifications</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Maintenance Section */}
                {maintenance.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Maintenance Requests
                    </div>
                    {maintenance.map((m) => {
                      const room = rooms[m.roomId];
                      const dateStr = new Date(m.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                      return (
                        <div 
                          key={m.id}
                          onClick={() => handleMaintenanceClick(m)}
                          className="block px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform flex-shrink-0">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground group-hover:text-rose-600 transition-colors truncate">
                                {m.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex justify-between items-center">
                                <span>{room ? `ห้อง ${room.number}` : 'ไม่ระบุห้อง'}</span>
                                <span className="text-[10px] opacity-70">{dateStr}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Pending Payments Section */}
                {payments.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border">
                      Pending Payments
                    </div>
                    {payments.map((p) => {
                      const dateStr = new Date(p.paidAt).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                      const roomNumber = p.invoice?.contract?.room?.number || p.invoice?.contract?.room?.id;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handlePaymentClick(p)}
                          className="block px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground group-hover:text-amber-600 transition-colors">
                                แจ้งโอนเงิน ฿{p.amount.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex justify-between items-center">
                                <span>{roomNumber ? `ห้อง ${roomNumber}` : 'รอยืนยัน'}</span>
                                <span className="text-[10px] opacity-70">{dateStr}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Recent History Section */}
                {recentHistory.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border">
                      Recent Activity
                    </div>
                    {recentHistory.map((p) => {
                      const dateStr = new Date(p.paidAt).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      });
                      const roomNumber = p.invoice?.contract?.room?.number || p.invoice?.contract?.room?.id;
                      const isVerified = p.status === 'VERIFIED';
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handlePaymentClick(p)}
                          className="block px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group opacity-75 hover:opacity-100"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${isVerified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'} group-hover:scale-105 transition-transform flex-shrink-0`}>
                              {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${isVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'} group-hover:text-foreground transition-colors`}>
                                {isVerified ? 'อนุมัติการโอนเงิน' : 'ปฏิเสธการโอนเงิน'} ฿{p.amount.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex justify-between items-center">
                                <span>{roomNumber ? `ห้อง ${roomNumber}` : '-'}</span>
                                <span className="text-[10px] opacity-70">{dateStr}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
