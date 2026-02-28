'use client';

import { useState, useEffect, useRef } from 'react';
import { api, Payment, MaintenanceRequest } from '@/services/api';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      // Fetch pending payments
      // api.getPayments supports status filter
      const pList = await api.getPayments(undefined, 'PENDING').catch(() => []);
      
      // Fetch maintenance requests and filter pending
      // api.getMaintenanceRequests returns all, so we filter
      const mList = await api.getMaintenanceRequests().catch(() => []);
      const pendingM = mList.filter(m => m.status === 'PENDING');

      setPayments(pList);
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

  const total = payments.length + maintenance.length;

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
        <div className="absolute right-0 mt-3 w-80 bg-popover rounded-xl shadow-xl border border-border z-50 overflow-hidden ring-1 ring-black/5">
          <div className="p-3 border-b border-border bg-muted/50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {total > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                {total} New
              </span>
            )}
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-sm">No new notifications</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {payments.length > 0 && (
                  <Link 
                    href="/payments?status=PENDING" 
                    className="block px-4 py-3 hover:bg-muted/50 transition-colors group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-sm font-medium text-foreground group-hover:text-amber-600 transition-colors">Pending Payments</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{payments.length} items to verify</div>
                      </div>
                    </div>
                  </Link>
                )}
                {maintenance.length > 0 && (
                  <Link 
                    href="/maintenance" 
                    className="block px-4 py-3 hover:bg-muted/50 transition-colors group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 rounded-full bg-rose-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-sm font-medium text-foreground group-hover:text-rose-600 transition-colors">New Maintenance Requests</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{maintenance.length} pending requests</div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
