 'use client';
 import { useState } from 'react';
 import { api, Payment } from '@/services/api';
 
 type Props = {
   payment: Payment;
 };
 
 export default function PaymentActions({ payment }: Props) {
   const [loading, setLoading] = useState<'verify' | 'reject' | null>(null);
   const canVerify = payment.status === 'PENDING' && !!payment.slipImageUrl;
 
   const doVerify = async () => {
     try {
      const room = payment.invoice?.contract?.room?.number || '-';
      const amt = Number(payment.amount).toLocaleString('th-TH');
      const ok = window.confirm(`ยืนยันตัดยอดชำระเงินห้อง ${room} จำนวน ฿${amt} ?`);
      if (!ok) return;
       setLoading('verify');
       await api.confirmSlip({ paymentId: payment.id, status: 'VERIFIED' });
       window.location.reload();
     } catch (e) {
       alert((e as Error).message || 'ยืนยันการชำระเงินไม่สำเร็จ');
     } finally {
       setLoading(null);
     }
   };
 
   const doReject = async () => {
     try {
      const room = payment.invoice?.contract?.room?.number || '-';
      const ok = window.confirm(`ยืนยันปฏิเสธสลิปห้อง ${room} ?`);
      if (!ok) return;
       setLoading('reject');
       await api.confirmSlip({ paymentId: payment.id, status: 'REJECTED' });
       window.location.reload();
     } catch (e) {
       alert((e as Error).message || 'ปฏิเสธสลิปไม่สำเร็จ');
     } finally {
       setLoading(null);
     }
   };
 
   if (!canVerify) return null;
 
   return (
     <div className="flex items-center justify-center gap-2 mt-2">
       <button
         onClick={doVerify}
         disabled={!!loading}
         className="px-3 py-1 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
         title="ยืนยันการชำระเงิน"
       >
         {loading === 'verify' ? 'กำลังยืนยัน...' : 'ยืนยัน'}
       </button>
       <button
         onClick={doReject}
         disabled={!!loading}
         className="px-3 py-1 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
         title="ปฏิเสธสลิป"
       >
         {loading === 'reject' ? 'กำลังปฏิเสธ...' : 'ปฏิเสธ'}
       </button>
     </div>
   );
 }
