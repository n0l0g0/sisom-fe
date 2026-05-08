'use client';

import { Payment, normalizeMediaUrl } from '@/services/api';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

type Props = {
  payment: Payment;
  onClose: () => void;
  onVerify?: () => void;
  onReject?: () => void;
};

export default function PaymentDetailDialog({ payment, onClose, onVerify, onReject }: Props) {
  const [imgZoomed, setImgZoomed] = useState(false);
  const [actionLoading, setActionLoading] = useState<'verify' | 'reject' | null>(null);
  const [paidAt, setPaidAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const inv = payment.invoice;
  const totalPaid = inv?.payments
    ?.filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Number(p.amount), 0) ?? Number(payment.amount);
  const remaining = inv ? Math.max(0, Number(inv.totalAmount) - totalPaid) : 0;

  const slipUrl = payment.slipImageUrl ? normalizeMediaUrl(payment.slipImageUrl) : null;

  const statusLabel = payment.status === 'VERIFIED' ? 'ตรวจสอบแล้ว' : payment.status === 'PENDING' ? 'รอยืนยัน' : 'ปฏิเสธ';
  const statusClass =
    payment.status === 'VERIFIED'
      ? 'bg-green-100 text-green-700'
      : payment.status === 'PENDING'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

  const canVerify = payment.status === 'PENDING' && !!payment.slipImageUrl;

  const handleVerify = async () => {
    const room = inv?.contract?.room?.number || '-';
    const amt = Number(payment.amount).toLocaleString('th-TH');
    if (!window.confirm(`ยืนยันตัดยอดชำระเงินห้อง ${room} จำนวน ฿${amt} ?`)) return;
    setActionLoading('verify');
    try {
      const { api } = await import('@/services/api');
      await api.confirmSlip({ paymentId: payment.id, status: 'VERIFIED', paidAt });
      onVerify?.();
      onClose();
      window.location.reload();
    } catch (e) {
      alert((e as Error).message || 'ยืนยันการชำระเงินไม่สำเร็จ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    const room = inv?.contract?.room?.number || '-';
    if (!window.confirm(`ยืนยันปฏิเสธสลิปห้อง ${room} ?`)) return;
    setActionLoading('reject');
    try {
      const { api } = await import('@/services/api');
      await api.confirmSlip({ paymentId: payment.id, status: 'REJECTED' });
      onReject?.();
      onClose();
      window.location.reload();
    } catch (e) {
      alert((e as Error).message || 'ปฏิเสธสลิปไม่สำเร็จ');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[#8b5a3c]">รายละเอียดการชำระเงิน</h2>
            <p className="text-xs text-slate-400 mt-0.5">#{payment.id.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Room & Tenant */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#8b5a3c]">ห้อง {inv?.contract?.room?.number ?? '-'}</span>
                {inv?.contract?.room?.building?.name && (
                  <span className="text-sm text-slate-500">{inv.contract.room.building.name}</span>
                )}
              </div>
              <p className="text-slate-600">{inv?.contract?.tenant?.name ?? '-'}</p>
            </div>
            <Badge className={`${statusClass} border-none text-sm px-3 py-1`}>{statusLabel}</Badge>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="วันที่ชำระ" value={new Date(payment.paidAt).toLocaleString('th-TH')} />
            <InfoRow
              label="ช่องทาง"
              value={slipUrl ? 'โอนเงิน' : 'เงินสด'}
              valueClass={slipUrl ? 'text-blue-600' : 'text-green-600'}
            />
            <InfoRow
              label="เดือนที่ชำระ"
              value={inv ? `${MONTHS_TH[Math.max(0, inv.month - 1)]} ${inv.year}` : '-'}
            />
            <InfoRow
              label="จำนวนเงินที่ชำระ"
              value={`฿${Number(payment.amount).toLocaleString()}`}
              valueClass="font-bold text-slate-800"
            />
          </div>

          {/* Invoice Summary */}
          {inv && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">สรุปบิล</p>
              <SummaryRow label="ยอดรวมบิล" value={`฿${Number(inv.totalAmount).toLocaleString()}`} />
              <SummaryRow label="ชำระแล้ว" value={`฿${totalPaid.toLocaleString()}`} valueClass="text-green-600" />
              {remaining > 0 ? (
                <SummaryRow label="คงค้าง" value={`฿${remaining.toLocaleString()}`} valueClass="text-red-500 font-semibold" />
              ) : (
                <SummaryRow label="คงค้าง" value="ชำระครบแล้ว" valueClass="text-green-600 font-semibold" />
              )}
            </div>
          )}

          {/* Slip Image */}
          {slipUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">สลิปการโอนเงิน</p>
              <div
                className="relative rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in bg-slate-50 flex items-center justify-center"
                style={{ minHeight: 200 }}
                onClick={() => setImgZoomed(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slipUrl}
                  alt="สลิปการโอนเงิน"
                  className="max-h-72 object-contain w-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  ขยาย
                </div>
              </div>
              <a
                href={slipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-[#f5a987] hover:underline"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                เปิดในแท็บใหม่
              </a>
            </div>
          )}

          {/* Actions */}
          {canVerify && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">การดำเนินการ</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">วันที่รับชำระ</label>
                  <input
                    type="datetime-local"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {actionLoading === 'verify' ? 'กำลังยืนยัน...' : 'ยืนยันการชำระ'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  {actionLoading === 'reject' ? 'กำลังปฏิเสธ...' : 'ปฏิเสธสลิป'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom overlay */}
      {imgZoomed && slipUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setImgZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slipUrl} alt="สลิปขยาย" className="max-h-screen max-w-screen object-contain p-4" />
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueClass = 'text-slate-700' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, valueClass = 'text-slate-700' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
