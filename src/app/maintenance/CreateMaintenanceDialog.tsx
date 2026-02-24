'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, Room, MaintenanceRequest } from '@/services/api';
import { useRouter } from 'next/navigation';

interface CreateMaintenanceDialogProps {
  rooms: Room[];
  onCreated?: (req: MaintenanceRequest) => void;
}

export function CreateMaintenanceDialog({ rooms, onCreated }: CreateMaintenanceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    roomId: '',
    title: '',
    description: '',
    reportedBy: ''
  });
  const [reportType, setReportType] = useState<'MAINTENANCE' | 'MOVE_OUT'>('MAINTENANCE');
  const [moveoutDate, setMoveoutDate] = useState<string>('');

  const sortedRooms = [...rooms].sort((a, b) => {
    const nameA = (a.building?.name || a.building?.code || '').trim();
    const nameB = (b.building?.name || b.building?.code || '').trim();
    const isBanNoiA = /บ้านน้อย/.test(nameA);
    const isBanNoiB = /บ้านน้อย/.test(nameB);
    if (isBanNoiA !== isBanNoiB) {
      return isBanNoiA ? 1 : -1;
    }
    const buildingCmp = nameA.localeCompare(nameB, 'th');
    if (buildingCmp !== 0) return buildingCmp;
    const numA = parseInt(String(a.number).replace(/\D+/g, ''), 10);
    const numB = parseInt(String(b.number).replace(/\D+/g, ''), 10);
    const validA = Number.isFinite(numA) ? numA : Infinity;
    const validB = Number.isFinite(numB) ? numB : Infinity;
    if (validA !== validB) return validA - validB;
    return String(a.number).localeCompare(String(b.number), 'th');
  });

  const roomLabel = (room: Room) => {
    const buildingLabel = room.building?.name || room.building?.code;
    if (buildingLabel) {
      return `${buildingLabel} • ห้อง ${room.number} (ชั้น ${room.floor})`;
    }
    return `ห้อง ${room.number} (ชั้น ${room.floor})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const desc =
        reportType === 'MOVE_OUT'
          ? [
              'TYPE: MOVE_OUT',
              moveoutDate ? `MOVEOUT_DATE: ${moveoutDate}` : undefined,
              formData.description,
            ]
              .filter(Boolean)
              .join('\n')
          : formData.description;
      const created = await api.createMaintenanceRequest({
        ...formData,
        description: desc,
        title: formData.title || (reportType === 'MOVE_OUT' ? 'แจ้งย้ายออก' : 'แจ้งซ่อม'),
      });
      setOpen(false);
      if (onCreated) {
        onCreated(created);
      }
      router.refresh();
      setFormData({
        roomId: '',
        title: '',
        description: '',
        reportedBy: ''
      });
      setReportType('MAINTENANCE');
      setMoveoutDate('');
    } catch (error) {
      console.error('Failed to create maintenance request:', error);
      alert('Failed to create maintenance request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#f5a987] hover:bg-[#e09b7d] text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          แจ้งซ่อมใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#8b5a3c]">แจ้งซ่อมใหม่</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="type">ประเภท</Label>
            <Select
              value={reportType}
              onValueChange={(value) =>
                setReportType((value as 'MAINTENANCE' | 'MOVE_OUT') || 'MAINTENANCE')
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINTENANCE">แจ้งซ่อม</SelectItem>
                <SelectItem value="MOVE_OUT">แจ้งย้ายออก</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">ห้อง</Label>
            <Select onValueChange={(value) => setFormData({...formData, roomId: value})} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {sortedRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {roomLabel(room)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">หัวข้อ</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder="เช่น ไฟห้องน้ำเสีย, ท่อน้ำรั่ว"
            />
          </div>

          {reportType === 'MOVE_OUT' && (
            <div className="space-y-2">
              <Label htmlFor="moveoutDate">วันที่ต้องการออก</Label>
              <Input
                id="moveoutDate"
                type="date"
                value={moveoutDate}
                onChange={(e) => setMoveoutDate(e.target.value)}
                required
              />
              <div className="text-xs text-slate-500">จะถูกบันทึกในรายละเอียดเพื่อแจ้งเจ้าหน้าที่</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportedBy">ผู้แจ้ง</Label>
            <Input
              id="reportedBy"
              value={formData.reportedBy}
              onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
              placeholder="ระบุชื่อผู้แจ้ง (ถ้ามี)"
            />
          </div>

          <Button type="submit" className="w-full bg-[#f5a987] hover:bg-[#e09b7d] text-white" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
