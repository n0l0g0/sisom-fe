'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Room, api } from "@/services/api";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function RentSettingsTable({ rooms }: { rooms: Room[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const initial = useMemo(() => {
    const m: Record<string, { price: string; water?: string; electric?: string }> = {};
    for (const r of rooms) {
      m[r.id] = {
        price: String(Number(r.pricePerMonth ?? 0)),
        water: r.waterOverrideAmount !== undefined ? String(Number(r.waterOverrideAmount)) : undefined,
        electric: r.electricOverrideAmount !== undefined ? String(Number(r.electricOverrideAmount)) : undefined,
      };
    }
    return m;
  }, [rooms]);
  const [values, setValues] = useState<Record<string, { price: string; water?: string; electric?: string }>>(initial);
  const [saving, setSaving] = useState(false);

  const sortedRooms = useMemo(() => {
    const normalizeName = (r: Room) => (r.building?.name || r.building?.code || '').trim();
    return rooms.slice().sort((a, b) => {
      const na = normalizeName(a);
      const nb = normalizeName(b);
      const aIsSmall = /บ้านน้อย/i.test(na);
      const bIsSmall = /บ้านน้อย/i.test(nb);
      if (aIsSmall !== bIsSmall) return aIsSmall ? 1 : -1;
      const nameCmp = na.localeCompare(nb, 'th');
      if (nameCmp !== 0) return nameCmp;
      const floorCmp = Number(a.floor) - Number(b.floor);
      if (floorCmp !== 0) return floorCmp;
      const numA = parseInt(String(a.number), 10);
      const numB = parseInt(String(b.number), 10);
      const bothNumeric = Number.isFinite(numA) && Number.isFinite(numB);
      if (bothNumeric) return numA - numB;
      return String(a.number).localeCompare(String(b.number), 'th');
    });
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (!searchTerm.trim()) return sortedRooms;
    const lower = searchTerm.toLowerCase();
    return sortedRooms.filter(r => 
      r.number.toLowerCase().includes(lower) || 
      (r.building?.name || r.building?.code || '').toLowerCase().includes(lower)
    );
  }, [sortedRooms, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, page, pageSize]);

  const maxBuildingLen = useMemo(() => {
    let max = 0;
    for (const r of rooms) {
      const name = (r.building?.name || r.building?.code || '-').trim();
      max = Math.max(max, name.length);
    }
    return max;
  }, [rooms]);
  const buildingColMinWidth = `${Math.max(8, maxBuildingLen + 2)}ch`;

  const handleSave = async () => {
    try {
      setSaving(true);
      const contracts = await api.getContracts();
      let syncedContracts = 0;
      for (const room of rooms) {
        const v = values[room.id];
        const priceValue = v?.price !== undefined ? Number(v.price) : undefined;
        const waterValue = v?.water !== undefined ? Number(v.water) : undefined;
        const electricValue = v?.electric !== undefined ? Number(v.electric) : undefined;
        const payload: Partial<Room> = {};
        if (priceValue !== undefined && Number.isFinite(priceValue)) payload.pricePerMonth = priceValue;
        if (waterValue !== undefined && Number.isFinite(waterValue)) payload.waterOverrideAmount = waterValue;
        if (electricValue !== undefined && Number.isFinite(electricValue)) payload.electricOverrideAmount = electricValue;
        if (Object.keys(payload).length > 0) {
          await api.updateRoom(room.id, payload);
          if (priceValue !== undefined && Number.isFinite(priceValue)) {
            const activeContract = contracts.find((c) => c.roomId === room.id && c.isActive);
            if (activeContract) {
              const contractPayload: Partial<typeof activeContract> = { currentRent: priceValue as any };
              if (priceValue === 3000) {
                contractPayload.deposit = 3000 as any;
              } else {
                contractPayload.deposit = 1000 as any;
              }
              await api.updateContract(activeContract.id, contractPayload as any);
              syncedContracts++;
            }
          }
        }
      }
      alert(`บันทึกค่าเช่ารายเดือนได้เรียบร้อย และซิงค์สัญญา ${syncedContracts} สัญญา`);
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="ค้นหาห้อง หรือ ชื่อตึก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="text-sm text-slate-500">
          ทั้งหมด {filteredRooms.length} ห้อง
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0 pb-24">
          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] whitespace-nowrap" style={{ width: buildingColMinWidth }}>หอ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ชั้น</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c]">ห้อง</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ค่าเช่าปัจจุบัน</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ปรับค่าเช่า</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ค่าน้ำ (กำหนดรายห้อง)</th>
                  <th className="px-6 py-4 font-semibold text-[#8b5a3c] text-right">ค่าไฟ (กำหนดรายห้อง)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  paginatedRooms.map((room) => (
                    <tr key={room.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-700 whitespace-nowrap" style={{ width: buildingColMinWidth }}>{room.building?.name || room.building?.code || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{Number(room.floor) || '-'}</td>
                      <td className="px-6 py-4 font-bold text-[#8b5a3c]">{room.number}</td>
                      <td className="px-6 py-4 text-center">
                        {room.status === 'OCCUPIED' ? (
                          <Badge className="bg-green-100 text-green-700 border-none">มีผู้เช่า</Badge>
                        ) : room.status === 'VACANT' ? (
                          <Badge variant="outline" className="text-slate-600 border-slate-200">ว่าง</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-200">ซ่อมบำรุง</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">฿{Number(room.pricePerMonth).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <Input 
                          id={`price-${room.id}`} 
                          type="number" 
                          value={values[room.id]?.price ?? ''} 
                          onChange={(e) => setValues((prev) => ({ ...prev, [room.id]: { ...(prev[room.id] || { price: '' }), price: e.target.value } }))}
                          className="text-right font-mono border-slate-200 focus:ring-[#f5a987] focus:border-[#f5a987]" 
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          id={`water-override-${room.id}`}
                          type="number"
                          value={values[room.id]?.water ?? ''}
                          onChange={(e) => setValues((prev) => ({ ...prev, [room.id]: { ...(prev[room.id] || { price: '' }), water: e.target.value } }))}
                          placeholder="เช่น 0 หรือ 200"
                          className="text-right font-mono border-slate-200 focus:ring-[#f5a987] focus:border-[#f5a987]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          id={`electric-override-${room.id}`}
                          type="number"
                          value={values[room.id]?.electric ?? ''}
                          onChange={(e) => setValues((prev) => ({ ...prev, [room.id]: { ...(prev[room.id] || { price: '' }), electric: e.target.value } }))}
                          placeholder="เช่น 0 หรือ 500"
                          className="text-right font-mono border-slate-200 focus:ring-[#f5a987] focus:border-[#f5a987]"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 bg-white rounded-b-xl">
            <div className="text-sm text-slate-500">
              แสดง {filteredRooms.length === 0 ? 0 : (page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filteredRooms.length)} จาก {filteredRooms.length} รายการ
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                หน้า {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        {createPortal(
          <div className="fixed bottom-5 right-5 z-[9999]">
            <Button
              onClick={handleSave}
              className="bg-[#f5a987] hover:bg-[#e09270] text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center"
              aria-label="บันทึกทั้งหมด"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
              </svg>
            </Button>
          </div>,
          document.body
        )}
        {saving &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-xl p-6 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#f5a987] border-t-transparent animate-spin" />
                <div className="text-slate-700 font-medium">กำลังบันทึกข้อมูล...</div>
              </div>
            </div>,
            document.body
          )
        }
      </Card>
    </div>
  )
}
