 'use client';
import { useState } from 'react';
 import { api, Payment } from '@/services/api';
 
 type Props = {
   payment: Payment;
 };
 
 export default function PaymentActions({ payment }: Props) {
  const [loading, setLoading] = useState<'verify' | 'reject' | null>(null);
  const [paidAt, setPaidAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
   const canVerify = payment.status === 'PENDING' && !!payment.slipImageUrl;
 
   const doVerify = async () => {
     try {
      const room = payment.invoice?.contract?.room?.number || '-';
      const amt = Number(payment.amount).toLocaleString('th-TH');
      const ok = window.confirm(`ยืนยันตัดยอดชำระเงินห้อง ${room} จำนวน ฿${amt} ?`);
      if (!ok) return;
       setLoading('verify');
      await api.confirmSlip({ paymentId: payment.id, status: 'VERIFIED', paidAt });
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
      <input
        type="datetime-local"
        value={paidAt}
        onChange={(e) => setPaidAt(e.target.value)}
        className="px-2 py-1 border rounded text-xs"
        title="วันที่รับชำระ"
      />
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
