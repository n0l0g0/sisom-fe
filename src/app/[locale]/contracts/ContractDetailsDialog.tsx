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
import { ExternalLink, Save, Upload, FileText } from "lucide-react";
import { api, Contract } from '@/services/api';
import { useRouter } from 'next/navigation';

interface ContractDetailsDialogProps {
  contract: Contract;
  triggerLabel?: string;
}

export function ContractDetailsDialog({ contract, triggerLabel }: ContractDetailsDialogProps) {
  const router = useRouter();
  const [deposit, setDeposit] = useState(
    (contract.deposit ?? '').toString(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contractImageUrl, setContractImageUrl] = useState(contract.contractImageUrl ?? '');
  const [contractImageVer, setContractImageVer] = useState(0);
  const [tenantName, setTenantName] = useState(contract.tenant?.name ?? '');
  const [tenantPhone, setTenantPhone] = useState(contract.tenant?.phone ?? '');
  const [tenantIdCard, setTenantIdCard] = useState(contract.tenant?.idCard ?? '');
  const [tenantAddress, setTenantAddress] = useState(contract.tenant?.address ?? '');
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isUploadingIdCard, setIsUploadingIdCard] = useState(false);
  const [idCardImageUrl, setIdCardImageUrl] = useState(contract.tenant?.idCardImageUrl ?? '');
  const [idCardImageVer, setIdCardImageVer] = useState(0);

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contract.tenant?.id) return;

    try {
      setIsUploadingIdCard(true);
      const uploadRes = await api.uploadMedia(file);
      await api.updateTenant(contract.tenant.id, { idCardImageUrl: uploadRes.url });
      setIdCardImageUrl(uploadRes.url);
      setIdCardImageVer((v) => v + 1);
      router.refresh();
    } catch (error) {
      console.error('Failed to upload id card image:', error);
      alert('อัปโหลดรูปบัตรประชาชนไม่สำเร็จ');
    } finally {
      setIsUploadingIdCard(false);
    }
  };

  const handleSaveDeposit = async () => {
    const newDeposit = parseFloat(deposit);
    if (isNaN(newDeposit)) return;

    try {
      setIsSaving(true);
      await api.updateContract(contract.id, { deposit: newDeposit });
      router.refresh();
      // Optional: Show success message
    } catch (error) {
      console.error('Failed to update deposit:', error);
      alert('บันทึกเงินประกันไม่สำเร็จ');
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
      setContractImageUrl(uploadRes.url);
      setContractImageVer((v) => v + 1);
      router.refresh();
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTenant = async () => {
    if (!contract.tenant?.id) return;
    const name = tenantName.trim();
    const phone = tenantPhone.trim();
    const idCard = tenantIdCard.trim();
    const address = tenantAddress.trim();
    if (!name || !phone) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์ผู้เช่า');
      return;
    }
    try {
      setIsSavingTenant(true);
      await api.updateTenant(contract.tenant.id, {
        name,
        phone,
        idCard: idCard || undefined,
        address: address || undefined,
      });
      // Force reload page to ensure data is updated
      window.location.reload();
    } catch (error) {
      console.error('Failed to update tenant:', error);
      alert('บันทึกข้อมูลผู้เช่าไม่สำเร็จ');
      setIsSavingTenant(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 shadow-sm text-xs"
        >
          <FileText className="w-4 h-4 mr-2" />
          {triggerLabel ?? 'ดูสัญญา'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">รายละเอียดสัญญาเช่า - ห้อง {contract.room?.number}</DialogTitle>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
             {contract.room?.building?.name ? `ตึก ${contract.room.building.name}` : ''} 
             {contract.room?.floor ? ` ชั้น ${contract.room.floor}` : ''}
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">ข้อมูลผู้เช่า</h3>
            {contract.tenant ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label htmlFor="tenant-name" className="text-slate-500 dark:text-slate-400">ชื่อ-นามสกุล</Label>
                    <Input
                      id="tenant-name"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenant-phone" className="text-slate-500 dark:text-slate-400">เบอร์โทรศัพท์</Label>
                    <Input
                      id="tenant-phone"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenant-idcard" className="text-slate-500 dark:text-slate-400">เลขบัตรประชาชน</Label>
                    <Input
                      id="tenant-idcard"
                      value={tenantIdCard}
                      onChange={(e) => setTenantIdCard(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenant-address" className="text-slate-500 dark:text-slate-400">ที่อยู่</Label>
                    <Input
                      id="tenant-address"
                      value={tenantAddress}
                      onChange={(e) => setTenantAddress(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveTenant}
                    disabled={isSavingTenant}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isSavingTenant ? (
                      <span className="animate-spin mr-2">⏳</span>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    บันทึกข้อมูลผู้เช่า
                  </Button>
                </div>

                {/* ID Card Image */}
                <div className="space-y-2">
                  <Label className="text-slate-500 dark:text-slate-400">รูปบัตรประชาชน</Label>
                  {idCardImageUrl ? (
                    <div className="mt-2">
                      <a href={idCardImageUrl} target="_blank" rel="noopener noreferrer" className="block relative h-40 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:opacity-90 transition-opacity group">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img 
                            src={`${idCardImageUrl}?v=${idCardImageVer}`} 
                            alt="ID Card" 
                            className="w-full h-full object-contain" 
                         />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm font-medium flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" />
                              ดูรูปเต็ม
                            </span>
                         </div>
                      </a>
                    </div>
                  ) : (
                    <div className="mt-2 h-20 w-full rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 text-sm">
                      ไม่มีรูปบัตรประชาชน
                    </div>
                  )}
                  <div className="mt-2">
                     <Label htmlFor="upload-idcard" className="cursor-pointer inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                        {isUploadingIdCard ? 'กำลังอัปโหลด...' : <><Upload className="w-4 h-4" /> อัปโหลดรูปบัตรประชาชนใหม่</>}
                     </Label>
                     <Input 
                        id="upload-idcard" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleIdCardUpload}
                        disabled={isUploadingIdCard}
                     />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm italic">ไม่พบข้อมูลผู้เช่า</div>
            )}
          </div>

          {/* Contract Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">ข้อมูลสัญญา</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-500 dark:text-slate-400">เลขที่ห้อง</Label>
                <div className="font-medium text-slate-900 dark:text-white mt-1">{contract.room?.number}</div>
              </div>
              <div>
                <Label className="text-slate-500 dark:text-slate-400">วันเริ่มสัญญา</Label>
                <div className="font-medium text-slate-900 dark:text-white mt-1">
                  {new Date(contract.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                <Label className="text-slate-500 dark:text-slate-400">ค่าเช่า (ปัจจุบัน)</Label>
                <div className="font-medium text-slate-900 dark:text-white mt-1">฿{Number(contract.currentRent).toLocaleString()}</div>
              </div>
              <div>
                <Label htmlFor="deposit" className="text-slate-500 dark:text-slate-400">เงินประกัน</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="deposit"
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="h-8 w-32 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleSaveDeposit}
                    disabled={isSaving}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                  >
                    {isSaving ? '...' : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Contract Image */}
            <div className="space-y-2">
              <Label className="text-slate-500 dark:text-slate-400">รูปสัญญาเช่า</Label>
              {contractImageUrl ? (
                <div className="mt-2">
                  <a href={contractImageUrl} target="_blank" rel="noopener noreferrer" className="block relative h-40 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:opacity-90 transition-opacity group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`${contractImageUrl}?v=${contractImageVer}`} 
                        alt="Contract" 
                        className="w-full h-full object-contain" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-sm font-medium flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          ดูรูปเต็ม
                        </span>
                      </div>
                  </a>
                </div>
              ) : (
                <div className="mt-2 h-20 w-full rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 text-sm">
                  ไม่มีรูปสัญญา
                </div>
              )}
              <div className="mt-2">
                 <Label htmlFor="upload-contract" className="cursor-pointer inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                    {isUploading ? 'กำลังอัปโหลด...' : <><Upload className="w-4 h-4" /> อัปโหลดรูปสัญญาใหม่</>}
                 </Label>
                 <Input 
                    id="upload-contract" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                 />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
