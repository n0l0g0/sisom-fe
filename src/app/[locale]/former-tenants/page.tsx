'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Tenant } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Search, User, Home, Phone, Calendar, Clock } from 'lucide-react';

export default function FormerTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        // Fetch all tenants including history to get past contracts
        const allTenants = await api.getTenants({ includeHistory: true });
        
        // Filter: Status is MOVED_OUT AND no outstanding debt (SENT/OVERDUE)
        const formerTenants = allTenants.filter(t => {
          if (t.status !== 'MOVED_OUT') return false;
          
          // Check for any unpaid invoices in any contract
          const hasDebt = t.contracts?.some(contract => 
            contract.invoices?.some((inv: any) => 
              inv.status === 'SENT' || inv.status === 'OVERDUE'
            )
          );
          
          return !hasDebt;
        });
        
        setTenants(formerTenants);
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      const lastContract = tenant.contracts?.[0];
      const roomNumber = lastContract?.room?.number || '';
      const searchLower = searchQuery.toLowerCase();
      
      return (
        tenant.name.toLowerCase().includes(searchLower) ||
        (tenant.nickname && tenant.nickname.toLowerCase().includes(searchLower)) ||
        roomNumber.toLowerCase().includes(searchLower)
      );
    });
  }, [tenants, searchQuery]);

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ผู้เช่าเก่า</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ประวัติผู้เช่าที่ย้ายออก</p>
        </div>
        <div className="w-full md:w-auto">
           <div className="relative">
             <input 
               type="text" 
               placeholder="ค้นหาชื่อ หรือ ห้อง..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full md:w-64 pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
             />
             <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">วันที่ย้ายออก</th>
                <th className="px-6 py-4 font-semibold">ห้อง</th>
                <th className="px-6 py-4 font-semibold">ชื่อ-สกุล</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      กำลังโหลดข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-8 h-8 opacity-50" />
                      ไม่พบข้อมูลผู้เช่าเก่า
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const lastContract = tenant.contracts?.[0];
                  const moveOutDate = lastContract?.endDate || tenant.updatedAt;
                  
                  return (
                    <tr key={tenant.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(moveOutDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          {lastContract?.room?.number || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        <div className="font-medium">{tenant.name}</div>
                        {tenant.nickname && <div className="text-xs text-slate-500 dark:text-slate-400">({tenant.nickname})</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">
                        {tenant.phone}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                          ย้ายออกแล้ว
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
           <div className="text-center py-10 text-slate-500 dark:text-slate-400">กำลังโหลด...</div>
        ) : filteredTenants.length === 0 ? (
           <div className="text-center py-10 text-slate-500 dark:text-slate-400">ไม่พบข้อมูล</div>
        ) : (
          filteredTenants.map((tenant) => {
            const lastContract = tenant.contracts?.[0];
            const moveOutDate = lastContract?.endDate || tenant.updatedAt;

            return (
              <div key={tenant.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {lastContract?.room?.number || '-'}
                      </span>
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0">
                        ย้ายออกแล้ว
                      </Badge>
                    </div>
                    <div className="text-slate-900 dark:text-white font-medium">
                      {tenant.name}
                    </div>
                    {tenant.nickname && <div className="text-xs text-slate-500 dark:text-slate-400">({tenant.nickname})</div>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(moveOutDate)}
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {tenant.phone}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
