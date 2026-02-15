'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Save, Upload } from "lucide-react";
import { api, Contract } from '@/services/api';
import { useRouter } from 'next/navigation';

interface ContractDetailsDialogProps {
  contract: Contract;
}

export function ContractDetailsDialog({ contract }: ContractDetailsDialogProps) {
  const router = useRouter();
  const [rent, setRent] = useState(contract.currentRent.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveRent = async () => {
    const newRent = parseFloat(rent);
    if (isNaN(newRent)) return;

    try {
      setIsSaving(true);
      await api.updateContract(contract.id, { currentRent: newRent });
      router.refresh();
      // Optional: Show success message
    } catch (error) {
      console.error('Failed to update rent:', error);
      alert('บันทึกค่าเช่าไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadRes = await api.uploadMedia(file);
      await api.updateContract(contract.id, { contractImageUrl: uploadRes.url });
      router.refresh();
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ExternalLink className="w-4 h-4" />
          ดูสัญญา
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดสัญญาเช่า - ห้อง {contract.room?.number}</DialogTitle>
          <div className="text-sm text-slate-500 mt-1">
             {contract.room?.building?.name ? `ตึก ${contract.room.building.name}` : ''} 
             {contract.room?.floor ? ` ชั้น ${contract.room.floor}` : ''}
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-500">ชื่อ-นามสกุล</Label>
                <div className="font-medium">{contract.tenant?.name}</div>
              </div>
              <div>
                <Label className="text-slate-500">เบอร์โทรศัพท์</Label>
                <div className="font-medium">{contract.tenant?.phone}</div>
              </div>
              <div>
                <Label className="text-slate-500">เลขบัตรประชาชน</Label>
                <div className="font-medium">{contract.tenant?.idCard || '-'}</div>
              </div>
              <div>
                <Label className="text-slate-500">ที่อยู่</Label>
                <div className="font-medium">{contract.tenant?.address || '-'}</div>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">ข้อมูลสัญญา</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-500">วันเริ่มสัญญา</Label>
                <div className="font-medium">
                  {new Date(contract.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                <Label className="text-slate-500">วันสิ้นสุดสัญญา</Label>
                <div className="font-medium">
                  {contract.endDate 
                    ? new Date(contract.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'ไม่มีกำหนด'}
                </div>
              </div>
              <div>
                <Label className="text-slate-500">เงินประกัน</Label>
                <div className="font-medium">฿{Number(contract.deposit).toLocaleString()}</div>
              </div>
              <div>
                <Label className="text-slate-500">สถานะ</Label>
                <div className={`font-medium ${contract.isActive ? 'text-green-600' : 'text-slate-500'}`}>
                  {contract.isActive ? 'ใช้งานอยู่' : 'สิ้นสุดสัญญา'}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="rent" className="text-slate-700 font-semibold">ค่าเช่า (บาท/เดือน)</Label>
                    <Input 
                      id="rent" 
                      type="number" 
                      value={rent} 
                      onChange={(e) => setRent(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveRent} 
                    disabled={isSaving || rent === contract.currentRent.toString()}
                    className="bg-[#f5a987] hover:bg-[#e09b7b]"
                  >
                    {isSaving ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    บันทึกค่าเช่า
                  </Button>
                </div>
              </div>
          </div>

          {/* Contract Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">รูปสัญญาเช่า</h3>
            {contract.contractImageUrl ? (
              <div className="border rounded-lg p-2 bg-slate-50">
                <a href={contract.contractImageUrl} target="_blank" rel="noreferrer">
                  <img 
                    src={contract.contractImageUrl} 
                    alt="รูปสัญญาเช่า" 
                    className="w-full object-contain max-h-[500px] hover:opacity-95 transition-opacity cursor-zoom-in" 
                  />
                </a>
                <p className="text-xs text-center text-slate-500 mt-2">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-slate-500 text-sm mb-2">ไม่มีรูปสัญญาเช่า</p>
                  <Label 
                    htmlFor="contract-image-upload" 
                    className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isUploading 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        กำลังอัปโหลด...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        อัปโหลดรูปสัญญา
                      </>
                    )}
                  </Label>
                  <Input 
                    id="contract-image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
