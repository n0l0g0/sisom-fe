 'use client';
 
 import { useEffect, useState } from 'react';
 import { api, AutoSendConfig } from '@/services/api';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 
 export default function AutoSendSettingsDialog() {
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [enabled, setEnabled] = useState(false);
   const [hour, setHour] = useState<number>(9);
   const [minute, setMinute] = useState<number>(0);
   const [dayOfMonth, setDayOfMonth] = useState<number>(1);
   const [timezone, setTimezone] = useState<string>('Asia/Bangkok');
 
   const load = async () => {
     try {
       const cfg = await api.getAutoSendConfig().catch(() => ({
         enabled: false,
         hour: 9,
         minute: 0,
         dayOfMonth: 1,
         timezone: 'Asia/Bangkok',
       } as AutoSendConfig));
       setEnabled(!!cfg.enabled);
       setHour(Math.max(0, Math.min(23, Number(cfg.hour ?? 9))));
       setMinute(Math.max(0, Math.min(59, Number(cfg.minute ?? 0))));
       setDayOfMonth(Math.max(1, Math.min(28, Number(cfg.dayOfMonth ?? 1))));
       setTimezone(String(cfg.timezone || 'Asia/Bangkok'));
     } catch {
       // ignore load error, keep defaults
     }
   };
 
   useEffect(() => {
     if (open) load();
   }, [open]);
 
   const save = async () => {
     try {
       setLoading(true);
       const payload: AutoSendConfig = {
         enabled,
         hour: Math.max(0, Math.min(23, Number(hour))),
         minute: Math.max(0, Math.min(59, Number(minute))),
         dayOfMonth: Math.max(1, Math.min(28, Number(dayOfMonth))),
         timezone: timezone || 'Asia/Bangkok',
       };
       await api.setAutoSendConfig(payload);
       alert('บันทึกการตั้งค่าส่งบิลอัตโนมัติเรียบร้อย');
       setOpen(false);
    } catch (e) {
      const msg = String((e as Error).message || '').toLowerCase();
      const friendly =
        msg.includes('not found') || msg.includes('cannot post') || msg.includes('failed to update auto-send config')
          ? 'ยังไม่พบ API การตั้งค่าส่งบิลอัตโนมัติบนเซิร์ฟเวอร์ กรุณาอัพเดตฝั่ง Backend เพื่อรองรับเส้นทาง /invoices/auto-send/config'
          : (e as Error).message || 'บันทึกการตั้งค่าไม่สำเร็จ';
      alert(friendly);
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <>
       <button
         onClick={() => setOpen(true)}
         className="px-3 py-2 rounded-md text-xs font-medium bg-slate-700 text-white hover:bg-slate-800"
       >
         ตั้งค่า
       </button>
       <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle>ตั้งค่าการส่งบิลอัตโนมัติ</DialogTitle>
             <DialogDescription>
               กำหนดวันและเวลาที่ระบบจะส่งบิลให้ผู้เช่า พร้อมเปิด/ปิดการทำงาน
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <label className="flex items-center gap-2 text-sm text-slate-700">
               <input
                 type="checkbox"
                 checked={enabled}
                 onChange={(e) => setEnabled(e.target.checked)}
               />
               เปิดใช้งานส่งบิลอัตโนมัติ
             </label>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <div className="text-sm text-slate-600">วันของเดือน</div>
                 <select
                   value={dayOfMonth}
                   onChange={(e) => setDayOfMonth(Number(e.target.value))}
                   className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
                 >
                   {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                     <option key={d} value={d}>{d}</option>
                   ))}
                 </select>
                 <div className="text-xs text-slate-500">เลือกได้ 1–28 เพื่อหลีกเลี่ยงปัญหาเดือนสั้น</div>
               </div>
               <div className="space-y-1">
                 <div className="text-sm text-slate-600">เวลา</div>
                 <div className="flex items-center gap-2">
                   <Input
                     type="number"
                     value={hour}
                     onChange={(e) => setHour(Number(e.target.value))}
                     className="w-20"
                   />
                   <span className="text-slate-600">ชั่วโมง</span>
                   <Input
                     type="number"
                     value={minute}
                     onChange={(e) => setMinute(Number(e.target.value))}
                     className="w-20"
                   />
                   <span className="text-slate-600">นาที</span>
                 </div>
               </div>
             </div>
             <div className="space-y-1">
               <div className="text-sm text-slate-600">โซนเวลา</div>
               <select
                 value={timezone}
                 onChange={(e) => setTimezone(e.target.value)}
                 className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
               >
                 <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                 <option value="UTC">UTC</option>
               </select>
             </div>
             <div className="text-xs text-slate-500">
               ระบบจะส่งบิลสถานะ “ร่าง” ของเดือนปัจจุบันให้ผู้เช่าโดยอัตโนมัติในเวลาที่กำหนด
             </div>
           </div>
           <DialogFooter>
             <div className="w-full flex justify-between">
               <Button
                 onClick={() => setOpen(false)}
                 className="bg-red-600 hover:bg-red-700 text-white"
               >
                 ปิดหน้าต่าง
               </Button>
               <Button
                 onClick={save}
                 disabled={loading}
                 className="bg-[#f5a987] hover:bg-[#e09b7d] text-white"
               >
                 {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
               </Button>
             </div>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 }
