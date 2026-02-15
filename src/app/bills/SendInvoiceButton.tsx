 'use client';
 
import { useEffect, useMemo, useState } from 'react';
import { api, Invoice, MeterReading } from '@/services/api';
 import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
 
 export default function SendInvoiceButton({ invoice }: { invoice: Invoice }) {
   const router = useRouter();
   const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [itemDesc, setItemDesc] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [currentMR, setCurrentMR] = useState<MeterReading | null>(null);
  const [prevMR, setPrevMR] = useState<MeterReading | null>(null);
 
   const canSend = invoice.status !== 'PAID';
  const canEdit = invoice.status === 'SENT' || invoice.status === 'DRAFT';
 
   const doSend = async () => {
     if (!canSend || loading) return;
     try {
       setLoading(true);
       await api.sendInvoice(invoice.id);
       router.refresh();
     } catch (e) {
       alert((e as Error).message || 'ส่งบิลไม่สำเร็จ');
     } finally {
       setLoading(false);
     }
   };
 
  const openEdit = async () => {
    if (!canEdit) return;
    try {
      setOpen(true);
      const data = await api.getInvoice(invoice.id);
      setDetail(data);
      setDiscount('');
      if (data.contract?.room?.id) {
        const roomId = data.contract.room.id;
        const list = await api.getMeterReadings(roomId, data.month, data.year);
        setCurrentMR(list[0] || null);
        // prev month/year
        let pm = data.month - 1;
        let py = data.year;
        if (pm <= 0) {
          pm = 12;
          py = data.year - 1;
        }
        const prevList = await api.getMeterReadings(roomId, pm, py);
        setPrevMR(prevList[0] || null);
      }
    } catch (e) {
      alert('โหลดบิลไม่สำเร็จ');
      setOpen(false);
    }
  };

  const addItem = async () => {
    if (!detail) return;
    const amt = Number(itemAmount);
    if (!itemDesc.trim() || !Number.isFinite(amt)) return;
    try {
      await api.addInvoiceItem(detail.id, { description: itemDesc.trim(), amount: amt });
      const data = await api.getInvoice(detail.id);
      setDetail(data);
      setItemDesc('');
      setItemAmount('');
    } catch {
      alert('เพิ่มรายการไม่สำเร็จ');
    }
  };

  const removeItem = async (id: string) => {
    if (!detail) return;
    try {
      await api.deleteInvoiceItem(detail.id, id);
      const data = await api.getInvoice(detail.id);
      setDetail(data);
    } catch {
      alert('ลบรายการไม่สำเร็จ');
    }
  };

  const saveDiscount = async () => {
    if (!detail) return;
    const d = Math.max(0, Number(discount || 0));
    try {
      await api.updateInvoice(detail.id, { discount: d });
      const data = await api.getInvoice(detail.id);
      setDetail(data);
      router.refresh();
    } catch {
      alert('บันทึกส่วนลดไม่สำเร็จ');
    }
  };

  const cancelInvoice = async () => {
    if (!detail) return;
    if (!confirm('ยืนยันการยกเลิกบิลนี้?')) return;
    try {
      await api.cancelInvoice(detail.id);
      setOpen(false);
      router.refresh();
    } catch {
      alert('ยกเลิกบิลไม่สำเร็จ');
    }
  };

  const handleSettle = async () => {
    if (!detail) return;
    if (!confirm('ยืนยันการรับชำระเงิน?')) return;
    try {
      setLoading(true);
      await api.settleInvoice(detail.id, 'CASH');
      setOpen(false);
      router.refresh();
    } catch (e) {
      alert((e as Error).message || 'รับชำระเงินไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {};
  }, [open]);

  const usage = useMemo(() => {
    const waterUnits =
      currentMR && prevMR
        ? Math.max(0, Number(currentMR.waterReading) - Number(prevMR.waterReading))
        : 0;
    const electricUnits =
      currentMR && prevMR
        ? Math.max(0, Number(currentMR.electricReading) - Number(prevMR.electricReading))
        : 0;
    return { waterUnits, electricUnits };
  }, [currentMR, prevMR]);

  if (canEdit) {
    return (
      <>
        <button
          onClick={openEdit}
          className="px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          title="แก้ไขบิล"
        >
          แก้ไขบิล
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>แก้ไขบิล</DialogTitle>
              <DialogDescription>
                ปรับปรุงรายการบิล เพิ่มรายการ และส่วนลด รวมถึงยกเลิกบิล
              </DialogDescription>
            </DialogHeader>
            {detail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">ห้อง</div>
                    <div className="font-semibold text-slate-800">{detail.contract?.room?.number}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">ผู้เช่า</div>
                    <div className="font-semibold text-slate-800">{detail.contract?.tenant?.name}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">เดือน</div>
                    <div className="font-semibold text-slate-800">{new Date(detail.year, detail.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">ยอดรวม</div>
                    <div className="font-semibold text-slate-800">฿{Number(detail.totalAmount).toLocaleString()}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-slate-700">รายละเอียดบิล</div>
                  <div className="rounded border">
                    <div className="flex justify-between p-2 text-sm">
                      <div>ค่าเช่าห้อง</div>
                      <div className="font-medium">฿{Number(detail.rentAmount).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between px-2 pb-2 text-xs text-slate-500">
                      <div>เดือน {new Date(detail.year, detail.month - 1).toLocaleDateString('th-TH', { month: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="flex justify-between p-2 text-sm">
                      <div>ค่าน้ำ (Water rate)</div>
                      <div className="font-medium">฿{Number(detail.waterAmount).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between px-2 pb-2 text-xs text-slate-500">
                      <div>
                        {prevMR && currentMR
                          ? `เดือน ${prevMR.month}/${prevMR.year} (${prevMR.waterReading}) → ${currentMR.month}/${currentMR.year} (${currentMR.waterReading}) = ${usage.waterUnits} ยูนิต`
                          : 'ไม่มีข้อมูลมิเตอร์เดือนก่อน'}
                      </div>
                    </div>
                    <div className="flex justify-between p-2 text-sm">
                      <div>ค่าไฟฟ้า (Electrical rate)</div>
                      <div className="font-medium">฿{Number(detail.electricAmount).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between px-2 pb-2 text-xs text-slate-500">
                      <div>
                        {prevMR && currentMR
                          ? `เดือน ${prevMR.month}/${prevMR.year} (${prevMR.electricReading}) → ${currentMR.month}/${currentMR.year} (${currentMR.electricReading}) = ${usage.electricUnits} ยูนิต`
                          : 'ไม่มีข้อมูลมิเตอร์เดือนก่อน'}
                      </div>
                    </div>
                    <div className="flex justify-between p-2 text-sm border-t">
                      <div className="font-semibold">รวมทั้งหมด</div>
                      <div className="font-semibold">฿{Number(detail.totalAmount).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-slate-700">รายการเพิ่มเติม</div>
                  <div className="space-y-2">
                    {(detail.items || []).length === 0 ? (
                      <div className="text-sm text-slate-500">ไม่มีรายการเพิ่มเติม</div>
                    ) : (
                      <div className="space-y-2">
                        {detail.items!.map((it: any) => (
                          <div key={it.id} className="flex items-center justify-between border rounded p-2">
                            <div className="text-sm text-slate-700">{it.description}</div>
                            <div className="flex items-center gap-3">
                              <div className="font-mono text-sm">฿{Number(it.amount).toLocaleString()}</div>
                              <button
                                onClick={() => removeItem(it.id)}
                                className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="รายละเอียด"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                    />
                    <Input
                      placeholder="จำนวนเงิน"
                      type="number"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                    />
                    <Button onClick={addItem} className="bg-[#f5a987] hover:bg-[#e09b7d]">
                      เพิ่มรายการ
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-slate-700">ส่วนลด</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={saveDiscount} className="bg-[#f5a987] hover:bg-[#e09b7d]">
                      บันทึกส่วนลด
                    </Button>
                  </div>
                </div>
            </div>
            ) : (
              <div className="text-center text-slate-500 py-8">กำลังโหลด...</div>
            )}
            <DialogFooter>
              <div className="w-full flex justify-between items-center">
                <Button
                  variant="destructive"
                  onClick={cancelInvoice}
                  className="bg-red-600 hover:bg-red-700"
                >
                  ยกเลิกบิล
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSettle}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    รับชำระ
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!detail) return;
                      try {
                        setLoading(true);
                        await api.sendInvoice(detail.id);
                        setOpen(false);
                        router.refresh();
                      } catch {
                        alert('ส่งบิลไม่สำเร็จ');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-[#FF6413] hover:bg-[#f35a0b] text-white"
                  >
                    ส่งบิล
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <button
      onClick={doSend}
      disabled={!canSend || loading}
      className="px-3 py-1 rounded-md text-xs font-medium bg-[#f5a987] text-white hover:bg-[#e09b7d] disabled:opacity-50"
      title="ส่งบิลไปที่ LINE"
    >
      {loading ? 'กำลังส่ง...' : 'ส่งบิล'}
    </button>
  );
 }
