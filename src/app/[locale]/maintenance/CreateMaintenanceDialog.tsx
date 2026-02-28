'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, Room, MaintenanceRequest } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';

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
    // Prioritize specific building logic if needed, e.g. Ban Noi
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
      return `${buildingLabel} • Room ${room.number}`;
    }
    return `Room ${room.number}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let desc = formData.description;
      
      if (reportType === 'MOVE_OUT') {
        const parts = ['TYPE: MOVE_OUT'];
        if (moveoutDate) parts.push(`MOVEOUT_DATE: ${moveoutDate}`);
        if (formData.description) parts.push(formData.description);
        desc = parts.join('\n');
      }

      const created = await api.createMaintenanceRequest({
        roomId: formData.roomId,
        description: desc,
        title: formData.title || (reportType === 'MOVE_OUT' ? 'แจ้งย้ายออก' : 'แจ้งซ่อม'),
        reportedBy: formData.reportedBy,
      });
      
      setOpen(false);
      if (onCreated) {
        onCreated(created);
      }
      router.refresh();
      
      // Reset form
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
      // Ideally use a toast here
      alert('Failed to create maintenance request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          แจ้งซ่อมใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>แจ้งซ่อมใหม่</DialogTitle>
          <DialogDescription>
            สร้างรายการแจ้งซ่อมหรือแจ้งย้ายออก
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">ประเภท</Label>
              <Select
                value={reportType}
                onValueChange={(value) =>
                  setReportType((value as 'MAINTENANCE' | 'MOVE_OUT') || 'MAINTENANCE')
                }
              >
                <SelectTrigger>
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
              <Select 
                value={formData.roomId}
                onValueChange={(value) => setFormData({...formData, roomId: value})} 
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {sortedRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {roomLabel(room)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">หัวข้อ</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              placeholder={reportType === 'MOVE_OUT' ? "เช่น แจ้งย้ายออก" : "เช่น ก๊อกน้ำรั่ว, แอร์ไม่เย็น"}
            />
          </div>

          {reportType === 'MOVE_OUT' && (
            <div className="space-y-2">
              <Label htmlFor="moveoutDate">วันที่ต้องการย้ายออก</Label>
              <Input
                id="moveoutDate"
                type="date"
                value={moveoutDate}
                onChange={(e) => setMoveoutDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportedBy">ผู้แจ้ง (ระบุหรือไม่ก็ได้)</Label>
            <Input
              id="reportedBy"
              value={formData.reportedBy}
              onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
              placeholder="ชื่อผู้แจ้ง"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกรายการ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
