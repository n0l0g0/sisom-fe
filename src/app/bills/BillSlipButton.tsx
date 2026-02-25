 'use client';
 
import { useEffect, useMemo, useState } from 'react';
import { api, Invoice } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
 
export default function BillSlipButton({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const isPaid = invoice.status === 'PAID';
  const latestPaid = useMemo(() => {
    const list = (detail?.payments || []).filter((p: any) => !!p.paidAt);
    const fallback = (payments || []).filter((p: any) => !!p.paidAt);
    const all = list.length ? list : fallback;
    if (!all.length) return null;
    return all.sort(
      (a: any, b: any) =>
        new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    )[0];
  }, [detail, payments]);
  const parseSlipMeta = (raw?: string) => {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') return data as Record<string, unknown>;
      return null;
    } catch {
      return null;
    }
  };
  const pickStr = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;
  const formatSlipDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.toLocaleDateString('th-TH')} ${d.toLocaleTimeString('th-TH')}`;
  };
  const openView = async () => {
    if (!isPaid) return;
    setOpen(true);
    const data = await api.getInvoice(invoice.id);
    setDetail(data);
    try {
      const ps = await api.getPaymentsByInvoice(invoice.id);
      setPayments(Array.isArray(ps) ? ps : []);
    } catch {}
  };
  const onUpload = async () => {
    if (!uploadFile || !detail) return;
    const form = new FormData();
    form.append('file', uploadFile);
    form.append('invoiceId', detail.id);
    const created = await api.createPayment(form);
    const refreshed = await api.getPaymentsByInvoice(detail.id);
    setPayments(refreshed);
    setUploadFile(null);
  };
  return (
    <>
      <button
        onClick={openView}
        className="px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
        title="ดูสลิปการชำระ"
      >
        ดูสลิป
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[900px] md:max-w-[1024px]">
          <DialogHeader>
            <DialogTitle>รายละเอียดบิล</DialogTitle>
            <DialogDescription>ข้อมูลบิลที่ชำระแล้ว</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">ห้อง</div>
                  <div className="font-semibold text-slate-800">
                    {detail.contract?.room?.number}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">ผู้เช่า</div>
                  <div className="font-semibold text-slate-800">
                    {detail.contract?.tenant?.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">เดือน</div>
                  <div className="font-semibold text-slate-800">
                    {new Date(
                      detail.year,
                      detail.month - 1,
                    ).toLocaleDateString('th-TH', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">ยอดรวม</div>
                  <div className="font-semibold text-slate-800">
                    ฿{Number(detail.totalAmount).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">รับชำระเมื่อ</div>
                  <div className="font-semibold text-slate-800">
                    {latestPaid
                      ? formatSlipDate(pickStr(latestPaid.paidAt))
                      : '-'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">ข้อมูลสลิป</div>
                {latestPaid ? (
                  (() => {
                    const meta = parseSlipMeta(latestPaid.slipBankRef);
                    const origin = [pickStr(meta?.sourceBank), pickStr(meta?.sourceAccount)]
                      .filter(Boolean)
                      .join(' / ') || '-';
                    const dest = [pickStr(meta?.destBank), pickStr(meta?.destAccount)]
                      .filter(Boolean)
                      .join(' / ') || '-';
                    const when = formatSlipDate(pickStr(meta?.transactedAt));
                    const ref = pickStr(meta?.bankRef) || '-';
                    return (
                      <div className="rounded border p-3 space-y-2 text-sm text-slate-700">
                        <div>เวลาโอน: {when}</div>
                        <div>ต้นทาง: {origin}</div>
                        <div>ปลายทาง: {dest}</div>
                        <div>เลขอ้างอิง: {ref}</div>
                        {latestPaid.slipImageUrl ? (
                          <img
                            src={latestPaid.slipImageUrl}
                            alt="slip"
                            className="mt-2 w-full max-w-[360px] rounded border"
                          />
                        ) : (
                          <div className="text-xs text-slate-500">
                            ไม่มีรูปสลิปแนบ สามารถอัปโหลดได้ด้านล่าง
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-slate-500">ไม่พบข้อมูลสลิป</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">แนบสลิปย้อนหลัง</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={onUpload}
                    className="bg-[#f5a987] hover:bg-[#e09b7d] text-white"
                    disabled={!uploadFile}
                  >
                    อัปโหลด
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">กำลังโหลด...</div>
          )}
          <DialogFooter>
            <div className="w-full flex justify-start">
              <Button
                onClick={() => setOpen(false)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                ปิดหน้าต่าง
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
