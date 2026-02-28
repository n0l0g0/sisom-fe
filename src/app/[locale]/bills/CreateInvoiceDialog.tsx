'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, Room } from '@/services/api';
import { useRouter } from 'next/navigation';

interface CreateInvoiceDialogProps {
  rooms: Room[];
  onCreated?: () => Promise<void> | void;
}

export function CreateInvoiceDialog({ rooms, onCreated }: CreateInvoiceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  // Filter only occupied rooms
  const occupiedRooms = rooms
    .filter((room) => room.status === 'OCCUPIED')
    .slice()
    .sort((a, b) => {
      const aBuilding =
        (a.building?.code || a.building?.name || '').toString().toLowerCase();
      const bBuilding =
        (b.building?.code || b.building?.name || '').toString().toLowerCase();
      if (aBuilding !== bBuilding) {
        return aBuilding.localeCompare(bBuilding, 'th-TH');
      }
      const aFloor = a.floor ?? 0;
      const bFloor = b.floor ?? 0;
      if (aFloor !== bFloor) {
        return aFloor - bFloor;
      }
      const parseRoomNumber = (num: string) => {
        const trimmed = (num || '').trim();
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        return Number.POSITIVE_INFINITY;
      };
      const aNum = parseRoomNumber(a.number);
      const bNum = parseRoomNumber(b.number);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
      return a.number.localeCompare(b.number, 'th-TH');
    });

  const handleCreate = async () => {
    if (!roomId || !month || !year) return;

    try {
      setLoading(true);
      await api.generateInvoice({
        roomId,
        month: Number(month),
        year: Number(year),
      });
      if (onCreated) {
        await onCreated();
      } else {
        router.refresh();
      }
      setOpen(false);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. Please check if meter reading exists for this month.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 rounded-lg bg-[#f5a987] text-white hover:opacity-90 transition shadow-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          สร้างบิลประจำเดือน
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>สร้างบิลค่าเช่า</DialogTitle>
          <DialogDescription>
            สร้างใบแจ้งหนี้สำหรับห้องเช่า เลือกห้องและเดือนที่ต้องการ
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room" className="text-right">
              ห้อง
            </Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {occupiedRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {`${room.building?.name || room.building?.code || 'ไม่ทราบตึก'} • ชั้น ${room.floor || '-'} • ห้อง ${room.number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="text-right">
              เดือน
            </Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="เลือกเดือน" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {new Date(0, m - 1).toLocaleDateString('th-TH', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year" className="text-right">
              ปี
            </Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleCreate} disabled={loading || !roomId} className="bg-[#f5a987] hover:bg-[#e09b7b]">
            {loading ? 'กำลังสร้าง...' : 'สร้างบิล'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
