'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, Tenant } from '@/services/api';
import { useRouter } from 'next/navigation';

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
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#8b5a3c]">ผู้เช่าเก่า</h1>
           <p className="text-slate-500 text-sm mt-1">ประวัติผู้เช่าที่ย้ายออก</p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
             <input 
               type="text" 
               placeholder="ค้นหาชื่อ หรือ ห้อง..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f5a987]"
             />
             <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
             </svg>
           </div>
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">วันที่ย้ายออก</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ห้อง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ชื่อ-สกุล</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">เบอร์โทร</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      ไม่พบข้อมูลผู้เช่าเก่า
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    // Get info from last contract (contracts are ordered by startDate desc in API)
                    const lastContract = tenant.contracts?.[0];
                    // Prefer endDate if available, otherwise fallback to updatedAt
                    const moveOutDate = lastContract?.endDate || tenant.updatedAt;
                    
                    return (
                      <tr key={tenant.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(moveOutDate)}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#8b5a3c]">
                          {lastContract?.room?.number || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="font-medium">{tenant.name}</div>
                          {tenant.nickname && <div className="text-xs text-slate-400">({tenant.nickname})</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-mono">
                          {tenant.phone}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
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
        </CardContent>
      </Card>
    </div>
  );
}
