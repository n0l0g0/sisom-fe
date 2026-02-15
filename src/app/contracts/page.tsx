'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api, Contract, Room } from "@/services/api";
import { CreateContractDialog } from "./CreateContractDialog";
import { ViewContractCell } from "./ViewContractCell";
import { ContractDetailsDialog } from "./ContractDetailsDialog";

export default function ContractsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#8b5a3c]">สัญญาเช่า</h1>
              <p className="text-slate-500 text-sm mt-1">จัดการสัญญาเช่าและผู้พักอาศัย</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-slate-500 text-center py-10">กำลังโหลด...</div>
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

  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') || '10');
    const allowed = [10, 20, 50, 100];
    return allowed.includes(raw) ? raw : 10;
  }, [searchParams]);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterRoomId = searchParams.get('roomId') || undefined;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [contractsRes, roomsRes] = await Promise.all([
          api.getContracts(),
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
  }, []);

  const filteredContracts = useMemo(() => {
    if (!filterRoomId) return contracts;
    return contracts.filter((c) => c.roomId === filterRoomId);
  }, [contracts, filterRoomId]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      const buildA = a.room?.building?.name || '';
      const buildB = b.room?.building?.name || '';
      
      // Check for "Baan Noi" (Thai or English)
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

  const currentRangeText = useMemo(() => {
    if (sortedContracts.length === 0) return '0-0 จาก 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, sortedContracts.length);
    return `${start}-${end} จาก ${sortedContracts.length}`;
  }, [page, pageSize, sortedContracts.length]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/contracts?${params.toString()}`);
  };

  const setNextPageSize = (nextSize: number) => {
    const allowed = [10, 20, 50, 100];
    const size = allowed.includes(nextSize) ? nextSize : 10;
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(size));
    params.set('page', '1');
    router.push(`/contracts?${params.toString()}`);
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#8b5a3c]">สัญญาเช่า</h1>
           <p className="text-slate-500 text-sm mt-1">จัดการสัญญาเช่าและผู้พักอาศัย</p>
        </div>
        <CreateContractDialog rooms={rooms} />
      </div>

      {filterRoomId && (
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="text-slate-600">
            กำลังแสดงเฉพาะสัญญาของห้อง{' '}
            <span className="font-semibold">
              {rooms.find((r) => r.id === filterRoomId)?.number || '-'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/contracts')}
            className="text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">สัญญาที่ใช้งานอยู่</p>
          <p className="text-2xl font-bold text-[#f5a987] mt-1">{activeContracts.length} สัญญา</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">เงินประกันรวม</p>
          <p className="text-2xl font-bold text-green-600 mt-1">฿{totalDeposit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">ห้องว่าง</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{rooms.filter(r => r.status === 'VACANT').length} ห้อง</p>
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ตึก</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ชั้น</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ห้อง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ผู้เช่า</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">วันที่เริ่มสัญญา</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ค่าเช่า</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">เงินประกัน</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สัญญา</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="bg-white border-b">
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : sortedContracts.length === 0 ? (
                  <tr className="bg-white border-b">
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  pagedContracts.map((contract) => (
                    <tr key={contract.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#8b5a3c]">{contract.room?.building?.name || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{contract.room?.floor || '-'}</td>
                      <td className="px-6 py-4 font-bold text-[#8b5a3c]">{contract.room?.number}</td>
                      <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{contract.tenant?.name}</div>
                          <div className="text-xs text-slate-500">{contract.tenant?.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                          {new Date(contract.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        ฿{Number(contract.currentRent).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">฿{Number(contract.deposit).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={contract.isActive ? 'secondary' : 'outline'} className={contract.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' : 'text-slate-500 border-slate-200'}>
                          {contract.isActive ? 'ใช้งานอยู่' : 'สิ้นสุดสัญญา'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <ContractDetailsDialog contract={contract} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">แสดง</div>
          <select
            value={pageSize}
            onChange={(e) => setNextPageSize(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div className="text-sm text-slate-600">รายการต่อหน้า</div>
          <div className="text-sm text-slate-500">{currentRangeText}</div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => goToPage(1)}
            disabled={loading || sortedContracts.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าแรก"
          >
            «
          </button>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={loading || sortedContracts.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ก่อนหน้า"
          >
            ‹
          </button>
          <div className="text-sm text-slate-700 px-2">
            หน้า {Math.min(page, totalPages)} / {totalPages}
          </div>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={loading || sortedContracts.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ถัดไป"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={loading || sortedContracts.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าสุดท้าย"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}
