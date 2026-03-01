'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Contract, Room } from "@/services/api";
import { CreateContractDialog } from "./CreateContractDialog";
import { ContractDetailsDialog } from "./ContractDetailsDialog";
import { 
  Search, 
  Filter, 
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';



export default function ContractsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">สัญญาเช่า</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">จัดการสัญญาเช่าและผู้พักอาศัย</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      }
    >
      <ContractsPageContent />
    </Suspense>
  );
}

function ContractsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pagination State
  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  
  const pageSize = 10;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterRoomId = searchParams.get('roomId') || undefined;
  const showInactive = searchParams.get('showInactive') === 'true';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [contractsRes, roomsRes] = await Promise.all([
          api.getContracts(showInactive ? undefined : true),
          api.getRooms()
        ]);
        if (cancelled) return;
        setContracts(contractsRes);
        setRooms(roomsRes);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [showInactive]);

  const filteredContracts = useMemo(() => {
    if (!filterRoomId) return contracts;
    return contracts.filter((c) => c.roomId === filterRoomId);
  }, [contracts, filterRoomId]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      const buildA = a.room?.building?.name || '';
      const buildB = b.room?.building?.name || '';
      
      const isBaanNoiA = buildA.includes('บ้านน้อย') || buildA.toLowerCase().includes('baan noi');
      const isBaanNoiB = buildB.includes('บ้านน้อย') || buildB.toLowerCase().includes('baan noi');

      if (isBaanNoiA && !isBaanNoiB) return 1;
      if (!isBaanNoiA && isBaanNoiB) return -1;
      
      if (buildA !== buildB) {
        return buildA.localeCompare(buildB);
      }
      
      const floorA = a.room?.floor || 0;
      const floorB = b.room?.floor || 0;
      if (floorA !== floorB) return floorA - floorB;
      
      const roomA = a.room?.number || '';
      const roomB = b.room?.number || '';
      return roomA.localeCompare(roomB, undefined, { numeric: true });
    });
  }, [filteredContracts]);

  const activeContracts = useMemo(() => filteredContracts.filter(c => c.isActive), [filteredContracts]);
  const totalDeposit = useMemo(() => activeContracts.reduce((acc, curr) => acc + Number(curr.deposit), 0), [activeContracts]);
  const vacantRoomsCount = useMemo(() => rooms.filter(r => r.status === 'VACANT').length, [rooms]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedContracts.length / pageSize));
  }, [sortedContracts.length, pageSize]);

  useEffect(() => {
    if (loading) return;
    if (sortedContracts.length === 0) return;
    if (page <= totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(totalPages));
    router.replace(`/contracts?${params.toString()}`);
  }, [loading, page, sortedContracts.length, router, searchParams, totalPages]);

  const pagedContracts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedContracts.slice(start, start + pageSize);
  }, [page, pageSize, sortedContracts]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/contracts?${params.toString()}`);
  };

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">สัญญาเช่า</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">จัดการสัญญาเช่าและผู้พักอาศัย</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showInactive} 
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.checked) params.set('showInactive', 'true');
                else params.delete('showInactive');
                params.set('page', '1');
                router.push(`/contracts?${params.toString()}`);
              }}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-600 bg-white dark:bg-slate-800"
            />
            แสดงสัญญาที่ปิดแล้ว
          </label>
          <CreateContractDialog rooms={rooms} />
        </div>
      </div>

      {filterRoomId && (
        <div className="flex items-center justify-between mb-4 text-sm bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            กำลังแสดงเฉพาะสัญญาของห้อง{' '}
            <span className="font-bold">
              {rooms.find((r) => r.id === filterRoomId)?.number || '-'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/contracts')}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline-offset-2 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          {error}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <KPICard 
          title="สัญญาใช้งานอยู่" 
          value={`${activeContracts.length} สัญญา`}
          color="indigo"
          progress={activeContracts.length > 0 ? 100 : 0}
        />
        <KPICard 
          title="เงินประกันรวม" 
          value={`฿${totalDeposit.toLocaleString()}`}
          color="emerald"
          progress={totalDeposit > 0 ? 100 : 0}
        />
        <KPICard 
          title="ห้องว่าง" 
          value={`${vacantRoomsCount} ห้อง`}
          color="amber"
          progress={rooms.length > 0 ? (vacantRoomsCount / rooms.length) * 100 : 0}
        />
      </div>

      {/* Table Wrapper (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">ห้อง</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">ตึก/ชั้น</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">ผู้เช่า</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">วันที่เริ่มสัญญา</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">ค่าเช่า</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">เงินประกัน</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex justify-center items-center gap-2 text-slate-500 dark:text-slate-400">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      กำลังโหลดข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : sortedContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 opacity-50" />
                      ไม่พบข้อมูลสัญญาเช่า
                    </div>
                  </td>
                </tr>
              ) : (
                pagedContracts.map((contract, idx) => (
                  <tr 
                    key={contract.id} 
                    className={`
                      transition-colors hover:bg-slate-100 dark:hover:bg-slate-800
                      ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {contract.room?.number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-white font-medium">{contract.room?.building?.name || '-'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ชั้น {contract.room?.floor || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{contract.tenant?.name || '-'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        {contract.tenant?.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(contract.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                      ฿{Number(contract.currentRent).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      ฿{Number(contract.deposit).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge isActive={contract.isActive} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ContractDetailsDialog contract={contract} triggerLabel="ดูสัญญา" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards (below md) */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">กำลังโหลด...</div>
        ) : sortedContracts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">ไม่พบข้อมูล</div>
        ) : (
          pagedContracts.map((contract) => (
            <div 
              key={contract.id} 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {contract.room?.number || '-'}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      {contract.room?.building?.name}
                    </span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-medium mt-1">
                    {contract.tenant?.name || '-'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {contract.tenant?.phone || '-'}
                  </div>
                </div>
                <StatusBadge isActive={contract.isActive} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">เริ่มสัญญา</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(contract.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">ค่าเช่า</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    ฿{Number(contract.currentRent).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="w-full">
                  <ContractDetailsDialog contract={contract} triggerLabel="ดูรายละเอียดสัญญา" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = page;
              if (totalPages > 5) {
                if (page < 3) p = i + 1;
                else if (page > totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
              } else {
                p = i + 1;
              }
              
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    page === p
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Helper Components

function KPICard({ title, value, color, progress }: { title: string, value: string, color: 'indigo' | 'emerald' | 'amber', progress: number }) {
  const colorStyles = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  const progressColors = {
    indigo: 'bg-indigo-600 dark:bg-indigo-500',
    emerald: 'bg-emerald-600 dark:bg-emerald-500',
    amber: 'bg-amber-600 dark:bg-amber-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
      <h3 className={`text-2xl font-bold mt-2 ${colorStyles[color]}`}>{value}</h3>
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressColors[color]}`} 
          style={{ width: `${Math.max(5, progress)}%` }}
        ></div>
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        ใช้งานอยู่
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
      หมดสัญญา
    </span>
  );
}
