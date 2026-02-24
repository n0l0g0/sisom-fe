 'use client';
 
import { useEffect, useMemo, useState } from 'react';
import { api, Invoice, MeterReading, DormConfig } from '@/services/api';
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
  const [mode, setMode] = useState<'EDIT' | 'VIEW' | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [itemDesc, setItemDesc] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [currentMR, setCurrentMR] = useState<MeterReading | null>(null);
  const [prevMR, setPrevMR] = useState<MeterReading | null>(null);
  const [dormConfig, setDormConfig] = useState<DormConfig | null>(null);
  const [pendingUtilities, setPendingUtilities] = useState<{ waterAmount?: number; electricAmount?: number } | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleMonthly, setScheduleMonthly] = useState<boolean>(false);
  const [settlePaidAt, setSettlePaidAt] = useState<string>('');
  const formatLocalDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
 
  const canSend = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const canEdit = invoice.status === 'SENT' || invoice.status === 'DRAFT';
  const isPaid = invoice.status === 'PAID';
 
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
      setMode('EDIT');
      const data = await api.getInvoice(invoice.id);
      setDetail(data);
      setSettlePaidAt(formatLocalDateTime(new Date()));
      setDiscount('');
      try {
        const cfg = await api.getDormConfig();
        setDormConfig(cfg || null);
      } catch {}
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
        const schedule = await api.getRoomPaymentSchedule(roomId);
        if (schedule?.oneTimeDate) {
          setScheduleDate(schedule.oneTimeDate.slice(0, 10));
          setScheduleMonthly(false);
        } else if (typeof schedule?.monthlyDay === 'number') {
          const d = new Date(data.year, data.month - 1, Math.max(1, Math.min(28, schedule.monthlyDay || 1)));
          setScheduleDate(new Date(d.getFullYear(), d.getMonth(), schedule.monthlyDay || 1).toISOString().slice(0, 10));
          setScheduleMonthly(true);
        } else {
          setScheduleDate('');
          setScheduleMonthly(false);
        }
      }
    } catch (e) {
      alert('โหลดบิลไม่สำเร็จ');
      setOpen(false);
    }
  };
  const openView = async () => {
    if (!isPaid) return;
    try {
      setOpen(true);
      setMode('VIEW');
      const data = await api.getInvoice(invoice.id);
      setDetail(data);
      if (data.contract?.room?.id) {
        const roomId = data.contract.room.id;
        const list = await api.getMeterReadings(roomId, data.month, data.year);
        setCurrentMR(list[0] || null);
        let pm = data.month - 1;
        let py = data.year;
        if (pm <= 0) {
          pm = 12;
          py = data.year - 1;
        }
        const prevList = await api.getMeterReadings(roomId, pm, py);
        setPrevMR(prevList[0] || null);
      }
    } catch {
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
      try {
        await api.updateInvoice(detail.id, { status: 'DRAFT' as any });
      } catch {}
      const refreshed = await api.getInvoice(detail.id);
      setDetail(refreshed);
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
      try {
        await api.updateInvoice(detail.id, { status: 'DRAFT' as any });
      } catch {}
      const refreshed = await api.getInvoice(detail.id);
      setDetail(refreshed);
    } catch {
      alert('ลบรายการไม่สำเร็จ');
    }
  };

  const saveDiscount = async () => {
    if (!detail) return;
    const d = Math.max(0, Number(discount || 0));
    try {
      await api.updateInvoice(detail.id, { discount: d });
      try {
        await api.updateInvoice(detail.id, { status: 'DRAFT' as any });
      } catch {}
      const refreshed = await api.getInvoice(detail.id);
      setDetail(refreshed);
      router.refresh();
    } catch {
      alert('บันทึกส่วนลดไม่สำเร็จ');
    }
  };

  const saveSchedule = async () => {
    if (!detail) return;
    const roomId = detail.contract?.room?.id;
    if (!roomId) return;
    const dateStr = (scheduleDate || '').trim();
    if (!dateStr) {
      alert('กรุณาเลือกวันที่นัดจ่าย');
      return;
    }
    try {
      await api.setRoomPaymentSchedule(roomId, { date: dateStr, monthly: scheduleMonthly });
      try {
        window.dispatchEvent(new Event('ROOM_PAYMENT_SCHEDULE_UPDATED'));
      } catch {}
      router.refresh();
      alert('บันทึกวันนัดจ่ายเรียบร้อย');
    } catch (e) {
      alert((e as Error).message || 'บันทึกวันนัดจ่ายไม่สำเร็จ');
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
      await api.settleInvoice(detail.id, 'CASH', settlePaidAt || undefined);
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

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const computeTiered = (u: number, tiers?: Array<{ uptoUnit?: number | null; unitPrice: number; chargeType?: 'PER_UNIT' | 'FLAT' }>) => {
    const list = Array.isArray(tiers) ? tiers : [];
    if (!list.length) return 0;
    const normalized = list
      .map((t) => ({
        uptoUnit: t.uptoUnit === null || t.uptoUnit === undefined ? undefined : Number(t.uptoUnit),
        unitPrice: Math.max(0, Number(t.unitPrice ?? 0)),
        chargeType: t.chargeType === 'FLAT' ? 'FLAT' as const : 'PER_UNIT' as const,
      }))
      .filter((t) => t.unitPrice > 0);
    const finite = normalized.filter((t) => t.uptoUnit !== undefined).sort((a, b) => (a.uptoUnit as number) - (b.uptoUnit as number));
    const infinite = normalized.filter((t) => t.uptoUnit === undefined);
    const ordered = [...finite, ...infinite];
    let remaining = Math.max(0, u);
    let previousUpto = 0;
    let total = 0;
    for (const tier of ordered) {
      if (remaining <= 0) break;
      const upto = tier.uptoUnit ?? Number.POSITIVE_INFINITY;
      const rangeSize = Math.max(0, upto - previousUpto);
      const tierUnits = Number.isFinite(upto) ? Math.min(remaining, rangeSize) : remaining;
      if (tier.chargeType === 'FLAT') {
        if (tierUnits > 0) total += tier.unitPrice;
      } else {
        total += tierUnits * tier.unitPrice;
      }
      remaining -= tierUnits;
      previousUpto = Number.isFinite(upto) ? upto : previousUpto;
    }
    return total;
  };

  const updateUtilitiesFromMeter = () => {
    if (!detail || !dormConfig) {
      alert('ไม่พบการตั้งค่าหอพักหรือบิล');
      return;
    }
    const room = detail.contract?.room;
    const waterOverride = Math.max(0, Number(room?.waterOverrideAmount ?? 0));
    const electricOverride = Math.max(0, Number(room?.electricOverrideAmount ?? 0));
    // Compute electric
    const eUsage = Math.max(0, usage.electricUnits);
    let electricAmount = 0;
    const eUnit = Math.max(0, Number(dormConfig.electricUnitPrice));
    const eMinAmt = Math.max(0, Number(dormConfig.electricMinAmount ?? 0));
    const eMinUnits = Math.max(0, Number(dormConfig.electricMinUnits ?? 0));
    const eMethod = (dormConfig.electricFeeMethod || 'METER_USAGE') as DormConfig['electricFeeMethod'];
    if (eMethod === 'FLAT_MONTHLY') {
      electricAmount =
        electricOverride > 0
          ? electricOverride
          : Math.max(0, Number(dormConfig.electricFlatMonthlyFee ?? 0));
    } else if (eMethod === 'METER_USAGE_MIN_AMOUNT') {
      const unit = electricOverride > 0 ? electricOverride : eUnit;
      electricAmount = Math.max(eUsage * unit, eMinAmt);
    } else if (eMethod === 'METER_USAGE_MIN_UNITS') {
      const unit = electricOverride > 0 ? electricOverride : eUnit;
      electricAmount = eUsage <= eMinUnits ? eMinAmt : eUsage * unit;
    } else if (eMethod === 'METER_USAGE_PLUS_BASE') {
      const unit = electricOverride > 0 ? electricOverride : eUnit;
      electricAmount = eUsage <= eMinUnits ? eMinAmt : eMinAmt + (eUsage - eMinUnits) * unit;
    } else if (eMethod === 'METER_USAGE_TIERED') {
      electricAmount = computeTiered(
        eUsage,
        Array.isArray(dormConfig.electricTieredRates) ? dormConfig.electricTieredRates : undefined,
      );
    } else {
      const unit = electricOverride > 0 ? electricOverride : eUnit;
      electricAmount = eUsage * unit;
    }
    // Compute water
    const wUsage = Math.max(0, usage.waterUnits);
    let waterAmount = 0;
    const wUnit = Math.max(0, Number(dormConfig.waterUnitPrice));
    const wMinAmt = Math.max(0, Number(dormConfig.waterMinAmount ?? 0));
    const wMinUnits = Math.max(0, Number(dormConfig.waterMinUnits ?? 0));
    const wMethod = (dormConfig.waterFeeMethod || 'METER_USAGE') as DormConfig['waterFeeMethod'];
    if (wMethod === 'FLAT_MONTHLY') {
      waterAmount =
        waterOverride > 0
          ? waterOverride
          : Math.max(0, Number(dormConfig.waterFlatMonthlyFee ?? 0));
    } else if (wMethod === 'FLAT_PER_PERSON') {
      const perPerson = Math.max(0, Number(dormConfig.waterFlatPerPersonFee ?? 0));
      const occupants = Math.max(1, Number(detail.contract?.occupantCount ?? 1));
      waterAmount = perPerson * occupants;
    } else if (wMethod === 'METER_USAGE_MIN_AMOUNT') {
      const unit = waterOverride > 0 ? waterOverride : wUnit;
      waterAmount = Math.max(wUsage * unit, wMinAmt);
    } else if (wMethod === 'METER_USAGE_MIN_UNITS') {
      const unit = waterOverride > 0 ? waterOverride : wUnit;
      waterAmount = wUsage <= wMinUnits ? wMinAmt : wUsage * unit;
    } else if (wMethod === 'METER_USAGE_PLUS_BASE') {
      const unit = waterOverride > 0 ? waterOverride : wUnit;
      waterAmount = wUsage <= wMinUnits ? wMinAmt : wMinAmt + (wUsage - wMinUnits) * unit;
    } else if (wMethod === 'METER_USAGE_TIERED') {
      waterAmount = computeTiered(
        wUsage,
        Array.isArray(dormConfig.waterTieredRates) ? dormConfig.waterTieredRates : undefined,
      );
    } else {
      const unit = waterOverride > 0 ? waterOverride : wUnit;
      waterAmount = wUsage * unit;
    }
    electricAmount = round2(electricAmount);
    waterAmount = round2(waterAmount);
    const nextTotal = round2(
      Number(detail.rentAmount) +
        electricAmount +
        waterAmount +
        Number(detail.otherFees || 0) +
        (detail.items || []).reduce((sum: number, it: any) => sum + Number(it.amount), 0) -
        Number(detail.discount || 0)
    );
    setPendingUtilities({ waterAmount, electricAmount });
    setDetail({ ...detail, waterAmount, electricAmount, totalAmount: nextTotal });
    alert('อัพเดทค่าน้ำไฟและคำนวนใหม่เรียบร้อย (ยังไม่บันทึก)');
  };

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
          <DialogContent className="sm:max-w-[900px] md:max-w-[1024px]">
            <DialogHeader>
              <DialogTitle>แก้ไขบิล</DialogTitle>
              <DialogDescription>
                ปรับปรุงรายการบิล เพิ่มรายการ และส่วนลด รวมถึงยกเลิกบิล
              </DialogDescription>
              {detail && (
                <div className="mt-2">
                  {detail.status === 'DRAFT' ? (
                    <Button
                      onClick={() =>
                        window.open(
                          `/bills/${detail.id}/print`,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-900 text-white"
                      title="พิมพ์ใบแจ้งหนี้ (A5)"
                    >
                      พิมพ์ใบแจ้งหนี้ (A5)
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      พิมพ์ได้เฉพาะบิลสถานะ “ร่าง”
                    </span>
                  )}
                </div>
              )}
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
                <div className="md:grid md:grid-cols-2 md:gap-6">
                  <div className="space-y-4">
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
                      <div>
                        <Button onClick={updateUtilitiesFromMeter} className="mt-2 bg-[#f5a987] hover:bg-[#e09b7d] text-white">
                          อัพเดทค่าน้ำไฟและคำนวนใหม่
                        </Button>
                        <div className="text-xs text-slate-500 mt-1">หลังอัพเดท ให้กด “บันทึกเป็นร่าง” เพื่อบันทึกค่าน้ำไฟใหม่</div>
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
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-700">วันที่รับชำระ</div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="datetime-local"
                          value={settlePaidAt}
                          onChange={(e) => setSettlePaidAt(e.target.value)}
                          className="w-64"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-700">นัดวันจ่าย</div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-48"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={scheduleMonthly}
                            onChange={(e) => setScheduleMonthly(e.target.checked)}
                          />
                          นัดวันนี้ของทุกเดือน
                        </label>
                        <Button onClick={saveSchedule} className="bg-[#f5a987] hover:opacity-90 text-white">
                          บันทึกวันนัด
                        </Button>
                      </div>
                      <div className="text-xs text-slate-500">
                        ถ้าไม่ติ๊ก จะนัดครั้งเดียวสำหรับบิลนี้
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
                </div>
            </div>
            ) : (
              <div className="text-center text-slate-500 py-8">กำลังโหลด...</div>
            )}
            <div className="w-full flex justify-end items-center px-1 pb-3">
              <div className="flex gap-2">
                <Button
                  onClick={cancelInvoice}
                  className="bg-[#8b5a3c] hover:bg-[#7a4f36] text-white"
                >
                  ยกเลิกบิล
                </Button>
                  <Button
                    onClick={async () => {
                      if (!detail) return;
                      try {
                        await api.updateInvoice(detail.id, {
                          status: 'DRAFT' as any,
                          ...(pendingUtilities?.waterAmount !== undefined ? { waterAmount: pendingUtilities?.waterAmount } : {}),
                          ...(pendingUtilities?.electricAmount !== undefined ? { electricAmount: pendingUtilities?.electricAmount } : {}),
                        });
                        const data = await api.getInvoice(detail.id);
                        setDetail(data);
                        alert('บันทึกเป็น “ร่าง” เรียบร้อย กรุณาส่งบิลใหม่อีกครั้ง');
                        // ไม่ปิด dialog เพื่อให้ผู้ใช้ตรวจสอบก่อน
                      } catch {
                        alert('บันทึกสถานะเป็นร่างไม่สำเร็จ');
                      }
                    }}
                    className="bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    บันทึกเป็นร่าง
                  </Button>
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

  if (isPaid) {
    return (
      <>
        <button
          onClick={openView}
          className="px-3 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
          title="ดูข้อมูลบิลที่ชำระแล้ว"
        >
          ดูข้อมูล
        </button>
        <Dialog open={open && mode === 'VIEW'} onOpenChange={setOpen}>
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
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">รับชำระเมื่อ</div>
                    <div className="font-semibold text-slate-800">
                      {(() => {
                        const list = (detail.payments || []).filter((p: any) => !!p.paidAt);
                        if (list.length === 0) return '-';
                        const latest = list.sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
                        const d = new Date(latest.paidAt);
                        return `${d.toLocaleDateString('th-TH')} ${d.toLocaleTimeString('th-TH')}`;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="md:grid md:grid-cols-2 md:gap-6">
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
                        <div>ค่าน้ำ</div>
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
                        <div>ค่าไฟฟ้า</div>
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
                              <div className="font-mono text-sm">฿{Number(it.amount).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
