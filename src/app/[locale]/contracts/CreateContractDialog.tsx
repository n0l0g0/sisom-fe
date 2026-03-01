'use client';

import { useEffect, useState } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

interface CreateContractDialogProps {
  rooms: Room[];
}

export function CreateContractDialog({ rooms }: CreateContractDialogProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tenant Data
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantIdCard, setTenantIdCard] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [contractImageFile, setContractImageFile] = useState<File | null>(null);

  useEffect(() => {
    // try {
    //   const uid = params.get('uid') || '';
    //   if (uid && !lineUserId) setLineUserId(uid);
    // } catch {}
  }, [params]);

  // Contract Data
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deposit, setDeposit] = useState('5000');
  const [rent, setRent] = useState('3500');
  const [occupantCount, setOccupantCount] = useState('1');

  const computeDepositFromRent = (rentValue?: string | number) => {
    const r = Number(rentValue ?? rent);
    if (!Number.isFinite(r)) return;
    if (r === 3000) {
      setDeposit('3000');
    } else {
      setDeposit('1000');
    }
  };

  const vacantRooms = rooms.filter(room => room.status === 'VACANT');

  const handleRoomChange = (id: string) => {
    setRoomId(id);
    const room = rooms.find(r => r.id === id);
    if (room) {
      setRent(String(room.pricePerMonth));
      computeDepositFromRent(room.pricePerMonth);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);

      // 1. Create Tenant
      const tenant = await api.createTenant({
        name: tenantName,
        phone: tenantPhone,
        idCard: tenantIdCard,
        address: tenantAddress,
      });

      // 2. Upload Image (if any)
      let contractImageUrl = '';
      if (contractImageFile) {
        const uploadRes = await api.uploadMedia(contractImageFile);
        contractImageUrl = uploadRes.url;
      }

      // 3. Create Contract
      await api.createContract({
        tenantId: tenant.id,
        roomId,
        startDate,
        deposit: Number(deposit),
        currentRent: Number(rent),
        occupantCount: Math.max(1, Number(occupantCount || 1)),
        contractImageUrl: contractImageUrl || undefined,
      });

      setOpen(false);
      resetForm();
      router.refresh();
      // Use toast instead of alert in future, but alert is fine for now
      alert('สร้างสัญญาเช่าสำเร็จ');
    } catch (error) {
      console.error('Failed to create contract:', error);
      alert('เกิดข้อผิดพลาดในการสร้างสัญญาเช่า');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTenantName('');
    setTenantPhone('');
    setTenantIdCard('');
    setTenantAddress('');
    setContractImageFile(null);
    setRoomId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDeposit('5000');
    setRent('3500');
    setOccupantCount('1');
  };

  useEffect(() => {
    computeDepositFromRent(rent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rent]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 shadow transition-all">
          <Plus className="w-5 h-5 mr-2" />
          ทำสัญญาใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">ทำสัญญาเช่าใหม่</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            กรอกข้อมูลผู้เช่าและรายละเอียดสัญญา
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">ชื่อ-นามสกุล <span className="text-rose-500">*</span></Label>
                <Input id="name" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="สมชาย ใจดี" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">เบอร์โทรศัพท์ <span className="text-rose-500">*</span></Label>
                <Input id="phone" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} placeholder="081-xxxxxxx" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idCard" className="text-slate-700 dark:text-slate-300">เลขบัตรประชาชน</Label>
                <Input id="idCard" value={tenantIdCard} onChange={e => setTenantIdCard(e.target.value)} placeholder="1-xxxx-xxxxx-xx-x" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-700 dark:text-slate-300">ที่อยู่ตามทะเบียนบ้าน</Label>
                <Input id="address" value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">รายละเอียดสัญญา</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room" className="text-slate-700 dark:text-slate-300">ห้องพัก <span className="text-rose-500">*</span></Label>
                <Select value={roomId} onValueChange={handleRoomChange}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="เลือกห้องว่าง" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {vacantRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id} className="focus:bg-slate-100 dark:focus:bg-slate-700">
                        {room.number} (ชั้น {room.floor}){room.pricePerMonth !== undefined ? ` - ฿${room.pricePerMonth.toLocaleString()}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-700 dark:text-slate-300">วันเริ่มสัญญา <span className="text-rose-500">*</span></Label>
                <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent" className="text-slate-700 dark:text-slate-300">ค่าเช่า (บาท/เดือน) <span className="text-rose-500">*</span></Label>
                <Input id="rent" type="number" value={rent} onChange={e => setRent(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit" className="text-slate-700 dark:text-slate-300">เงินประกัน (บาท) <span className="text-rose-500">*</span></Label>
                <Input id="deposit" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  กติกาเงินประกัน: ค่าเช่า 3000 → เงินประกัน 3000 บาท, อื่นๆ → เงินประกัน 1000 บาท
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupantCount" className="text-slate-700 dark:text-slate-300">จำนวนผู้เช่า (คน)</Label>
                <Input id="occupantCount" type="number" min={1} value={occupantCount} onChange={e => setOccupantCount(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractImage" className="text-slate-700 dark:text-slate-300">รูปสัญญาเช่า</Label>
                <Input 
                  id="contractImage" 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setContractImageFile(e.target.files?.[0] ?? null)} 
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleCreate} 
            disabled={loading || !tenantName || !tenantPhone || !roomId || !startDate || !rent || !deposit} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกสัญญาเช่า'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
