'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { User, Save, Filter, Calendar } from "lucide-react"
import { Room, Building, api, MeterReading } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const compareBuildings = (a: Building, b: Building) => {
  const aSource = (a.code || a.name || '').trim();
  const bSource = (b.code || b.name || '').trim();
  const aNum = parseInt(aSource.replace(/\D/g, ''), 10);
  const bNum = parseInt(bSource.replace(/\D/g, ''), 10);
  const aHasNum = Number.isFinite(aNum);
  const bHasNum = Number.isFinite(bNum);
  if (aHasNum && bHasNum && aNum !== bNum) return aNum - bNum;
  if ((a.code || '') !== (b.code || '')) return (a.code || '').localeCompare(b.code || '');
  return (a.name || '').localeCompare(b.name || '');
};

const getRoomSortMeta = (roomNumber: string) => {
  const raw = String(roomNumber || '').trim();
  const digits = raw.replace(/\D/g, '');
  const hasDigits = digits.length > 0;
  const numeric = hasDigits ? parseInt(digits, 10) : NaN;
  const hasThai = /[\u0E00-\u0E7F]/.test(raw);
  const hasEnglish = /[A-Za-z]/.test(raw);
  const group = hasDigits ? 0 : hasThai ? 1 : hasEnglish ? 2 : 3;
  return { raw, group, numeric };
};

const compareRoomsWithinBuilding = (a: Room, b: Room) => {
  const am = getRoomSortMeta(a.number);
  const bm = getRoomSortMeta(b.number);
  if (am.group !== bm.group) return am.group - bm.group;

  if (am.group === 0) {
    if (Number.isFinite(am.numeric) && Number.isFinite(bm.numeric) && am.numeric !== bm.numeric) return am.numeric - bm.numeric;
    return am.raw.localeCompare(bm.raw, 'th', { numeric: true, sensitivity: 'base' });
  }

  if (am.group === 1) return am.raw.localeCompare(bm.raw, 'th', { sensitivity: 'base' });
  if (am.group === 2) return am.raw.localeCompare(bm.raw, 'en', { sensitivity: 'base' });
  return am.raw.localeCompare(bm.raw, 'th', { sensitivity: 'base' });
};

export function MeterRecordTable({ rooms, buildings }: { rooms: Room[], buildings: Building[] }) {
  // Date Selection
  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const [selectedMonth, setSelectedMonth] = useState<number>(nextMonthDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(nextMonthDate.getFullYear());
  
  // Building Selection
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  // Data State
  const [readings, setReadings] = useState<Record<string, { electric: string, water: string }>>({})
  const [currentReadings, setCurrentReadings] = useState<Record<string, MeterReading>>({});
  const [prevReadings, setPrevReadings] = useState<Record<string, MeterReading>>({});
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false);

  const buildingLookup = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);

  const sortedBuildings = useMemo(() => [...buildings].sort(compareBuildings), [buildings]);

  // Fetch readings when month/year changes
  useEffect(() => {
    const fetchReadings = async () => {
      setIsLoading(true);
      try {
        // Current Month Readings
        const current = await api.getMeterReadings(undefined, selectedMonth, selectedYear);
        const currentMap: Record<string, MeterReading> = {};
        current.forEach(r => currentMap[r.roomId] = r);
        setCurrentReadings(currentMap);

        // Previous Month Readings
        let prevM = selectedMonth - 1;
        let prevY = selectedYear;
        if (prevM === 0) {
          prevM = 12;
          prevY = selectedYear - 1;
        }
        const prev = await api.getMeterReadings(undefined, prevM, prevY);
        const prevMap: Record<string, MeterReading> = {};
        prev.forEach(r => prevMap[r.roomId] = r);
        setPrevReadings(prevMap);

        // Pre-fill inputs with existing current readings
        const initialInputs: Record<string, { electric: string, water: string }> = {};
        current.forEach(r => {
          initialInputs[r.roomId] = {
            electric: r.electricReading.toString(),
            water: r.waterReading.toString()
          };
        });
        setReadings(initialInputs);

      } catch (error) {
        console.error("Failed to fetch readings", error);
      } finally {
        setIsLoading(false);
      }
    };

    (async () => {
      await fetchReadings();
    })();
  }, [selectedMonth, selectedYear]);

  const handleInputChange = (roomId: string, type: 'electric' | 'water', value: string) => {
    setReadings(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [type]: value
      }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(readings).map(async ([roomId, reading]) => {
        if (!reading.electric || !reading.water) return;
        
        // Check if value changed from DB or is new
        const existing = currentReadings[roomId];
        if (existing && 
            existing.electricReading === parseFloat(reading.electric) && 
            existing.waterReading === parseFloat(reading.water)) {
          return; // No change
        }

        await api.createMeterReading({
          roomId,
          month: selectedMonth,
          year: selectedYear,
          electricReading: parseFloat(reading.electric),
          waterReading: parseFloat(reading.water),
        });
      });

      await Promise.all(promises);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      // Refresh data
      const current = await api.getMeterReadings(undefined, selectedMonth, selectedYear);
      const currentMap: Record<string, MeterReading> = {};
      current.forEach(r => currentMap[r.roomId] = r);
      setCurrentReadings(currentMap);
    } catch (error) {
      console.error('Failed to save readings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter rooms
  const filteredRooms = rooms.filter(r => 
    selectedBuildingId === "all" || r.buildingId === selectedBuildingId
  );
  const displayRooms = useMemo(() => {
    const list = [...filteredRooms];
    if (selectedBuildingId !== 'all') return list.sort(compareRoomsWithinBuilding);

    return list.sort((a, b) => {
      const aBid = a.buildingId || '';
      const bBid = b.buildingId || '';
      if (!aBid && bBid) return 1;
      if (!bBid && aBid) return -1;

      if (aBid && bBid && aBid !== bBid) {
        const ab = buildingLookup.get(aBid);
        const bb = buildingLookup.get(bBid);
        if (ab && bb) return compareBuildings(ab, bb);
        if (ab && !bb) return -1;
        if (!ab && bb) return 1;
        return aBid.localeCompare(bBid);
      }

      return compareRoomsWithinBuilding(a, b);
    });
  }, [filteredRooms, selectedBuildingId, buildingLookup]);

  return (
    <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row justify-between p-4 gap-4 items-end md:items-center">
        
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[120px] border-none h-8">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(0, m - 1).toLocaleDateString('th-TH', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px] border-none h-8">
                <SelectValue placeholder="ปี" />
              </SelectTrigger>
              <SelectContent>
                {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Building Filter */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
              <SelectTrigger className="w-[180px] border-none h-8">
                <SelectValue placeholder="ทุกตึก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกตึก ({rooms.length} ห้อง)</SelectItem>
                {sortedBuildings.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} ({rooms.filter(r => r.buildingId === b.id).length} ห้อง)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="bg-[#f5a987] hover:bg-[#e09270] text-white w-full md:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </Button>
      </div>

      <CardContent className="p-0">
        <div className="relative overflow-x-auto rounded-xl border border-slate-200 max-h-[70vh]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-slate-50 border-b sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 w-[220px] font-semibold text-[#8b5a3c] bg-slate-50">ห้อง</th>
                <th scope="col" className="px-6 py-3 text-center border-l bg-[#f5a987]/10 text-[#8b5a3c]" colSpan={3}>
                  มิเตอร์ไฟฟ้า
                </th>
                <th scope="col" className="px-6 py-3 text-center border-l bg-[#f5a987]/20 text-[#8b5a3c]" colSpan={3}>
                  มิเตอร์น้ำ
                </th>
              </tr>
              <tr className="border-b bg-slate-50/50">
                <th className="px-6 py-2 bg-slate-50"></th>
                
                {/* Electric Headers */}
                <th className="px-4 py-2 text-center text-slate-500 border-l font-normal">ก่อนหน้า</th>
                <th className="px-4 py-2 text-center font-semibold text-[#8b5a3c]">ปัจจุบัน</th>
                <th className="px-4 py-2 text-center text-slate-500 font-normal">ใช้ไป</th>

                {/* Water Headers */}
                <th className="px-4 py-2 text-center text-slate-500 border-l font-normal">ก่อนหน้า</th>
                <th className="px-4 py-2 text-center font-semibold text-[#8b5a3c]">ปัจจุบัน</th>
                <th className="px-4 py-2 text-center text-slate-500 font-normal">ใช้ไป</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">ไม่พบข้อมูลห้องพัก</td>
                </tr>
              ) : (
                displayRooms.map((room) => {
                  const prev = prevReadings[room.id];
                  const current = readings[room.id];
                  
                  const prevElectric = prev ? Number(prev.electricReading) : 0;
                  const prevWater = prev ? Number(prev.waterReading) : 0;
                  
                  const currentElectric = current?.electric ? parseFloat(current.electric) : 0;
                  const currentWater = current?.water ? parseFloat(current.water) : 0;
                  
                  const electricUsage = currentElectric && prevElectric ? currentElectric - prevElectric : 0;
                  const waterUsage = currentWater && prevWater ? currentWater - prevWater : 0;

                  return (
                    <tr key={room.id} className="bg-white border-b hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900 bg-white sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[220px] min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="text-lg text-[#8b5a3c]">{room.number}</span>
                          <Badge variant="outline" className="text-xs font-normal text-slate-400 border-slate-200">
                             {room.buildingId ? (buildingLookup.get(room.buildingId)?.name || 'N/A') : 'N/A'}
                          </Badge>
                        </div>
                        {room.contracts?.[0]?.tenant && (
                          <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            <User className="w-3 h-3" />
                            {room.contracts[0].tenant.name}
                          </div>
                        )}
                      </td>

                      {/* Electric Input */}
                      <td className="px-4 py-4 text-center text-slate-500 border-l bg-slate-50/30">
                        {prevElectric > 0 ? prevElectric.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-4 bg-[#f5a987]/5">
                        <Input 
                          type="number" 
                          value={current?.electric || ''}
                          onChange={(e) => handleInputChange(room.id, 'electric', e.target.value)}
                          className="text-center font-medium h-9 border-[#f5a987]/30 focus:border-[#f5a987] focus:ring-[#f5a987]/20"
                          placeholder="0.00"
                        />
                      </td>
                      <td className={`px-4 py-4 text-center font-medium ${electricUsage < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {current?.electric ? (electricUsage > 0 ? `+${electricUsage.toLocaleString()}` : electricUsage) : '-'}
                      </td>

                      {/* Water Input */}
                      <td className="px-4 py-4 text-center text-slate-500 border-l bg-slate-50/30">
                        {prevWater > 0 ? prevWater.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-4 bg-[#f5a987]/5">
                        <Input 
                          type="number" 
                          value={current?.water || ''}
                          onChange={(e) => handleInputChange(room.id, 'water', e.target.value)}
                          className="text-center font-medium h-9 border-[#f5a987]/30 focus:border-[#f5a987] focus:ring-[#f5a987]/20"
                          placeholder="0.00"
                        />
                      </td>
                      <td className={`px-4 py-4 text-center font-medium ${waterUsage < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                         {current?.water ? (waterUsage > 0 ? `+${waterUsage.toLocaleString()}` : waterUsage) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
