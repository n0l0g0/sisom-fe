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
  // const [lineUserId, setLineUserId] = useState('');
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
        // lineUserId: lineUserId || undefined,
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
        <button className="px-4 py-2 rounded-lg bg-[#f5a987] text-white hover:opacity-90 transition shadow-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          ทำสัญญาใหม่
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>ทำสัญญาเช่าใหม่</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลผู้เช่าและรายละเอียดสัญญา
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
                <Input id="name" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="สมชาย ใจดี" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
                <Input id="phone" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} placeholder="081-xxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idCard">เลขบัตรประชาชน</Label>
                <Input id="idCard" value={tenantIdCard} onChange={e => setTenantIdCard(e.target.value)} placeholder="1-xxxx-xxxxx-xx-x" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่ตามทะเบียนบ้าน</Label>
                <Input id="address" value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">รายละเอียดสัญญา</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room">ห้องพัก <span className="text-red-500">*</span></Label>
                <Select value={roomId} onValueChange={handleRoomChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกห้องว่าง" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.number} (ชั้น {room.floor}){room.pricePerMonth !== undefined ? ` - ฿${room.pricePerMonth.toLocaleString()}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">วันเริ่มสัญญา <span className="text-red-500">*</span></Label>
                <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent">ค่าเช่า (บาท/เดือน) <span className="text-red-500">*</span></Label>
                <Input id="rent" type="number" value={rent} onChange={e => setRent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">เงินประกัน (บาท) <span className="text-red-500">*</span></Label>
                <Input id="deposit" type="number" value={deposit} onChange={e => setDeposit(e.target.value)} />
                <div className="text-xs text-slate-500">
                  กติกาเงินประกัน: ค่าเช่า 3000 → เงินประกัน 3000 บาท, อื่นๆ → เงินประกัน 1000 บาท
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupantCount">จำนวนผู้เช่า (คน)</Label>
                <Input id="occupantCount" type="number" min={1} value={occupantCount} onChange={e => setOccupantCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractImage">รูปสัญญาเช่า</Label>
                <Input 
                  id="contractImage" 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setContractImageFile(e.target.files?.[0] ?? null)} 
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
            className="bg-[#f5a987] hover:bg-[#e09b7b] w-full"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกสัญญาเช่า'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
