'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { api, Tenant } from '@/services/api';
import { Search, User, Phone, Calendar, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import FormerTenantDetailDialog from './FormerTenantDetailDialog';

const PAGE_SIZE = 15;

export default function FormerTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const allTenants = await api.getTenants({ includeHistory: true });
        const formerTenants = allTenants.filter(t => {
          if (t.status !== 'MOVED_OUT') return false;
          const hasDebt = t.contracts?.some(contract =>
            contract.invoices?.some((inv: any) => inv.status === 'SENT' || inv.status === 'OVERDUE')
          );
          return !hasDebt;
        });
        setTenants(formerTenants);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tenants.filter(t => {
      const lastContract = t.contracts?.[0];
      const room = lastContract?.room?.number ?? '';
      const building = lastContract?.room?.building?.name ?? '';
      return (
        t.name.toLowerCase().includes(q) ||
        (t.nickname?.toLowerCase().includes(q)) ||
        room.toLowerCase().includes(q) ||
        building.toLowerCase().includes(q)
      );
    });
  }, [tenants, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredTenants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearchQuery(v);
    setPage(1);
  };

  const formatDate = (s?: string) => {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 fade-in pb-20 md:pb-0">
      {selectedTenant && (
        <FormerTenantDetailDialog tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ผู้เช่าเก่า</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            ประวัติผู้เช่าที่ย้ายออก
            {!loading && <span className="ml-1 text-indigo-500 font-medium">({filteredTenants.length} คน)</span>}
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="ค้นหาชื่อ ห้อง หรือตึก..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">วันที่ย้ายออก</th>
                <th className="px-6 py-4 font-semibold">ตึก</th>
                <th className="px-6 py-4 font-semibold">ห้อง</th>
                <th className="px-6 py-4 font-semibold">ชื่อ-สกุล</th>
                <th className="px-6 py-4 font-semibold">เบอร์โทร</th>
                <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                      กำลังโหลดข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-8 h-8 opacity-50" />
                      ไม่พบข้อมูลผู้เช่าเก่า
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((tenant) => {
                  const lastContract = tenant.contracts?.[0];
                  const building = lastContract?.room?.building;
                  const moveOutDate = lastContract?.endDate || tenant.updatedAt;

                  return (
                    <tr
                      key={tenant.id}
                      className="bg-white dark:bg-slate-900 hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTenant(tenant)}
                    >
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          {formatDate(moveOutDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {building ? (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm">{building.name}</span>
                            {building.code && <span className="text-xs text-slate-400">({building.code})</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              แสดง {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTenants.length)} จาก {filteredTenants.length} รายการ
            </p>
            <div className="flex items-center gap-1">
              <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4" />
              </PageButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
                  ) : (
                    <PageButton key={p} onClick={() => setPage(p as number)} active={currentPage === p}>
                      {p}
                    </PageButton>
                  )
                )}
              <PageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </PageButton>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">กำลังโหลด...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">ไม่พบข้อมูล</div>
        ) : (
          <>
            {paginated.map((tenant) => {
              const lastContract = tenant.contracts?.[0];
              const building = lastContract?.room?.building;
              const moveOutDate = lastContract?.endDate || tenant.updatedAt;

              return (
                <div
                  key={tenant.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => setSelectedTenant(tenant)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          ห้อง {lastContract?.room?.number || '-'}
                        </span>
                        {building && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Building2 className="w-3 h-3" />
                            {building.name}
                          </span>
                        )}
                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0">
                          ย้ายออกแล้ว
                        </Badge>
                      </div>
                      <div className="text-slate-900 dark:text-white font-medium">{tenant.name}</div>
                      {tenant.nickname && <div className="text-xs text-slate-500 dark:text-slate-400">({tenant.nickname})</div>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
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
            })}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
      }`}
    >
      {children}
    </button>
  );
}
