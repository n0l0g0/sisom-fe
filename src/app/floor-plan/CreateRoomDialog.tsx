'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, Building, Room } from '@/services/api';

export default function CreateRoomDialog({ children, buildingId }: { children: React.ReactNode; buildingId?: string }) {
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomFloor, setRoomFloor] = useState<number>(1);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildingId || '');

  const [buildingName, setBuildingName] = useState('');
  const [buildingCode, setBuildingCode] = useState('');
  const [roomDigits, setRoomDigits] = useState<3 | 4>(3);
  const [buildingDigit, setBuildingDigit] = useState('1');
  const [roomPrefix, setRoomPrefix] = useState('');
  const roomsPerFloorDefault = 10;
  const [manualFloors, setManualFloors] = useState<Array<{ floor: number; rooms: number }>>([
    { floor: 1, rooms: 10 },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (buildingId) {
      setSelectedBuildingId(buildingId);
      return;
    }
    api
      .getBuildings()
      .then((bs) => setBuildings(bs))
      .catch(() => setBuildings([]));
  }, [open, buildingId]);

  useEffect(() => {
    if (buildingId) setSelectedBuildingId(buildingId);
  }, [buildingId]);

  const canCreateSingleRoom = useMemo(() => {
    return Boolean(selectedBuildingId && roomNumber.trim() && Number.isFinite(roomFloor));
  }, [roomFloor, roomNumber, selectedBuildingId]);

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      if (!selectedBuildingId) throw new Error('missing building');
      const payload: Omit<Room, 'id' | 'contracts' | 'meterReadings'> & { buildingId?: string } = {
        number: roomNumber,
        floor: roomFloor,
        status: 'VACANT',
        buildingId: selectedBuildingId,
      };
      await api.createRoom(payload);
      setOpen(false);
      window.location.reload();
    } catch {
      alert('สร้างห้องไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuildingAndRooms = async () => {
    try {
      setLoading(true);
      const building = await api.createBuilding({
        name: buildingName || 'อาคาร',
        code: buildingCode || undefined,
        floors: manualFloors.length,
      });
      const normalizedDigit = (buildingDigit.match(/\d/)?.[0] || '1').slice(0, 1);
      await api.generateRooms(building.id, {
        floors: manualFloors,
        format: {
          digits: roomDigits,
          buildingDigit: roomDigits === 4 ? normalizedDigit : undefined,
          prefix: roomPrefix.trim() ? roomPrefix.trim() : undefined,
        },
      });
      setOpen(false);
      window.location.reload();
    } catch {
      alert('สร้างตึก/ห้องไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogTitle className="sr-only">สร้างห้องหรือตึก</DialogTitle>
        <Tabs defaultValue="single">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-6 gap-6">
            <TabsTrigger value="single" className="data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-600">
              เพิ่มห้องเดี่ยว
            </TabsTrigger>
            <TabsTrigger value="building" className="data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-600">
              เพิ่มตึกและหลายห้อง
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-0 space-y-4">
            {!buildingId ? (
              <div>
                <label className="text-sm text-slate-600">ตึก</label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
                >
                  <option value="">เลือกตึก</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="text-sm text-slate-600">เลขห้อง</label>
              <Input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">ชั้น</label>
              <Input type="number" value={roomFloor} onChange={(e) => setRoomFloor(Number(e.target.value))} />
            </div>
           
            <div className="flex justify-end">
              <Button
                onClick={handleCreateRoom}
                disabled={loading || !canCreateSingleRoom}
                className="bg-[#f5a987] hover:bg-[#e09270] text-white"
              >
                สร้างห้อง
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="building" className="mt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600">ชื่อตึก</label>
                <Input type="text" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600">รหัสตึก (ไม่บังคับ)</label>
                <Input type="text" value={buildingCode} onChange={(e) => setBuildingCode(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600">จำนวนตัวเลขเลขห้อง</label>
                <select
                  value={roomDigits}
                  onChange={(e) => setRoomDigits(Number(e.target.value) === 4 ? 4 : 3)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
                >
                  <option value={3}>3 ตัว (เช่น 101)</option>
                  <option value={4}>4 ตัว (เช่น 1101)</option>
                </select>
              </div>
              {roomDigits === 4 ? (
                <div>
                  <label className="text-sm text-slate-600">เลขตึก (ใช้กับ 4 ตัว)</label>
                  <Input type="text" value={buildingDigit} onChange={(e) => setBuildingDigit(e.target.value)} />
                </div>
              ) : null}
              <div className="col-span-2">
                <label className="text-sm text-slate-600">Prefix นำหน้าเลขห้อง (ไม่บังคับ)</label>
                <Input type="text" value={roomPrefix} onChange={(e) => setRoomPrefix(e.target.value)} placeholder="เช่น A, B, 1-" />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-600">กำหนดจำนวนห้องแต่ละชั้น</label>
                  <button
                    className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                    onClick={() => setManualFloors((prev) => [...prev, { floor: (prev[prev.length - 1]?.floor ?? 0) + 1, rooms: roomsPerFloorDefault }])}
                  >
                    เพิ่มชั้น
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {manualFloors.map((f, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs text-slate-500 w-16">ชั้น</span>
                      <Input
                        type="number"
                        value={f.floor}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setManualFloors((prev) => prev.map((pf, i) => (i === idx ? { ...pf, floor: v } : pf)));
                        }}
                      />
                      <span className="text-xs text-slate-500 w-20">จำนวนห้อง</span>
                      <Input
                        type="number"
                        value={f.rooms}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setManualFloors((prev) => prev.map((pf, i) => (i === idx ? { ...pf, rooms: v } : pf)));
                        }}
                      />
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200"
                        onClick={() => setManualFloors((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreateBuildingAndRooms} disabled={loading} className="bg-[#f5a987] hover:bg-[#e09270] text-white">
                สร้างตึกและห้อง
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
