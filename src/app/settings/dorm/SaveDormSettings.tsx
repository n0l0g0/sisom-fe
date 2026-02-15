'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api, DormConfig } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WaterFeeMethod =
  | 'METER_USAGE'
  | 'METER_USAGE_MIN_AMOUNT'
  | 'METER_USAGE_MIN_UNITS'
  | 'METER_USAGE_PLUS_BASE'
  | 'METER_USAGE_TIERED'
  | 'FLAT_MONTHLY'
  | 'FLAT_PER_PERSON';

function normalizeWaterFeeMethod(value?: string | null): WaterFeeMethod | undefined {
  if (
    value === 'METER_USAGE' ||
    value === 'METER_USAGE_MIN_AMOUNT' ||
    value === 'METER_USAGE_MIN_UNITS' ||
    value === 'METER_USAGE_PLUS_BASE' ||
    value === 'METER_USAGE_TIERED' ||
    value === 'FLAT_MONTHLY' ||
    value === 'FLAT_PER_PERSON'
  )
    return value;
  return undefined;
}

export function WaterFeeSettingsDialog({ initialConfig }: { initialConfig: DormConfig | null }) {
  const initialMethod =
    normalizeWaterFeeMethod(initialConfig?.waterFeeMethod) ?? ('METER_USAGE' as const);

  const [open, setOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [method, setMethod] = useState<WaterFeeMethod>(initialMethod);
  const [unitPrice, setUnitPrice] = useState(
    initialConfig?.waterUnitPrice !== null && initialConfig?.waterUnitPrice !== undefined
      ? String(Number(initialConfig.waterUnitPrice))
      : '0',
  );
  const [flatMonthly, setFlatMonthly] = useState(
    initialConfig?.waterFlatMonthlyFee !== null && initialConfig?.waterFlatMonthlyFee !== undefined
      ? String(Number(initialConfig.waterFlatMonthlyFee))
      : '0'
  );
  const [flatPerPerson, setFlatPerPerson] = useState(
    initialConfig?.waterFlatPerPersonFee !== null && initialConfig?.waterFlatPerPersonFee !== undefined
      ? String(Number(initialConfig.waterFlatPerPersonFee))
      : '0'
  );
  const [minAmount, setMinAmount] = useState(
    initialConfig?.waterMinAmount !== null && initialConfig?.waterMinAmount !== undefined
      ? String(Number(initialConfig.waterMinAmount))
      : '0',
  );
  const [minUnits, setMinUnits] = useState(
    initialConfig?.waterMinUnits !== null && initialConfig?.waterMinUnits !== undefined
      ? String(Number(initialConfig.waterMinUnits))
      : '0',
  );
  const [tiers, setTiers] = useState<
    Array<{ uptoUnit: string; unitPrice: string; chargeType: 'PER_UNIT' | 'FLAT' }>
  >(() => {
    const raw = initialConfig?.waterTieredRates;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((t) => ({
        uptoUnit:
          t.uptoUnit === null || t.uptoUnit === undefined ? '' : String(Number(t.uptoUnit)),
        unitPrice: t.unitPrice !== null && t.unitPrice !== undefined ? String(Number(t.unitPrice)) : '0',
        chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
      }));
    }
    return [
      { uptoUnit: '5', unitPrice: String(Number(initialConfig?.waterUnitPrice ?? 0)), chargeType: 'PER_UNIT' },
      { uptoUnit: '', unitPrice: '0', chargeType: 'FLAT' },
    ];
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const cfg = await api.getDormConfig();
        setMethod(normalizeWaterFeeMethod(cfg?.waterFeeMethod) ?? 'METER_USAGE');
        setUnitPrice(
          cfg?.waterUnitPrice !== null && cfg?.waterUnitPrice !== undefined
            ? String(Number(cfg.waterUnitPrice))
            : ''
        );
        setFlatMonthly(
          cfg?.waterFlatMonthlyFee !== null && cfg?.waterFlatMonthlyFee !== undefined
            ? String(Number(cfg.waterFlatMonthlyFee))
            : ''
        );
        setFlatPerPerson(
          cfg?.waterFlatPerPersonFee !== null && cfg?.waterFlatPerPersonFee !== undefined
            ? String(Number(cfg.waterFlatPerPersonFee))
            : ''
        );
        setMinAmount(
          cfg?.waterMinAmount !== null && cfg?.waterMinAmount !== undefined
            ? String(Number(cfg.waterMinAmount))
            : ''
        );
        setMinUnits(
          cfg?.waterMinUnits !== null && cfg?.waterMinUnits !== undefined
            ? String(Number(cfg.waterMinUnits))
            : ''
        );
        const raw = cfg?.waterTieredRates;
        if (Array.isArray(raw) && raw.length) {
          setTiers(
            raw.map((t) => ({
              uptoUnit: t.uptoUnit === null || t.uptoUnit === undefined ? '' : String(Number(t.uptoUnit)),
              unitPrice: t.unitPrice !== null && t.unitPrice !== undefined ? String(Number(t.unitPrice)) : '0',
              chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
            }))
          );
        }
      } catch {}
    })();
  }, [open]);

  const applyToHiddenInputs = () => {
    const waterRateInput = document.getElementById('waterRate') as HTMLInputElement | null;
    const methodInput = document.getElementById('waterFeeMethod') as HTMLInputElement | null;
    const monthlyInput = document.getElementById('waterFlatMonthlyFee') as HTMLInputElement | null;
    const perPersonInput = document.getElementById('waterFlatPerPersonFee') as HTMLInputElement | null;
    const minAmountInput = document.getElementById('waterMinAmount') as HTMLInputElement | null;
    const minUnitsInput = document.getElementById('waterMinUnits') as HTMLInputElement | null;
    const tieredRatesInput = document.getElementById('waterTieredRates') as HTMLInputElement | null;
    if (methodInput) methodInput.value = method;
    if (monthlyInput) monthlyInput.value = flatMonthly;
    if (perPersonInput) perPersonInput.value = flatPerPerson;
    if (minAmountInput) minAmountInput.value = minAmount;
    if (minUnitsInput) minUnitsInput.value = minUnits;
    if (tieredRatesInput) {
      const normalized = tiers
        .map((t) => ({
          uptoUnit:
            t.uptoUnit !== undefined && t.uptoUnit !== null && t.uptoUnit !== '' ? Number(t.uptoUnit) : null,
          unitPrice: Number(t.unitPrice ?? 0),
          chargeType: t.chargeType,
        }))
        .filter((t) => Number.isFinite(t.unitPrice) && t.unitPrice > 0)
        .map((t) => ({
          uptoUnit:
            t.uptoUnit !== null && Number.isFinite(t.uptoUnit) && (t.uptoUnit as number) > 0
              ? t.uptoUnit
              : null,
          unitPrice: t.unitPrice,
          chargeType: t.chargeType,
        }));
      tieredRatesInput.value = JSON.stringify(normalized);
    }
    if (waterRateInput) waterRateInput.value = unitPrice;
  };

  useEffect(() => {
    applyToHiddenInputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, unitPrice, flatMonthly, flatPerPerson, minAmount, minUnits, tiers]);

  const handleSaveDialog = () => {
    applyToHiddenInputs();
    setOpen(false);
  };

  const toNumber = (value: string) => {
    if (value === undefined || value === null) return 0;
    const trimmed = String(value).trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const unitPriceNumber = Math.max(0, toNumber(unitPrice));
  const minAmountNumber = Math.max(0, toNumber(minAmount));
  const minUnitsNumber = Math.max(0, toNumber(minUnits));
  const flatMonthlyNumber = Math.max(0, toNumber(flatMonthly));
  const flatPerPersonNumber = Math.max(0, toNumber(flatPerPerson));

  const computeTieredAmount = (usageUnits: number) => {
    const u = Math.max(0, usageUnits);
    const normalized = tiers
      .map((t) => ({
        uptoUnit: t.uptoUnit.trim() ? toNumber(t.uptoUnit) : null,
        unitPrice: toNumber(t.unitPrice),
        chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
      }))
      .filter((t) => t.unitPrice > 0)
      .map((t) => ({
        uptoUnit:
          t.uptoUnit !== null && Number.isFinite(t.uptoUnit) && t.uptoUnit > 0 ? t.uptoUnit : null,
        unitPrice: Math.max(0, t.unitPrice),
        chargeType: t.chargeType,
      }));

    const finite = normalized
      .filter((t) => t.uptoUnit !== null)
      .sort((a, b) => (a.uptoUnit as number) - (b.uptoUnit as number));
    const infinite = normalized.filter((t) => t.uptoUnit === null);
    const ordered = [...finite, ...infinite];

    if (!ordered.length) return u * unitPriceNumber;

    let remaining = u;
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

  const computeExampleAmount = (usageUnits: number, occupants: number) => {
    const usage = Math.max(0, usageUnits);
    if (method === 'FLAT_MONTHLY') return flatMonthlyNumber;
    if (method === 'FLAT_PER_PERSON') return flatPerPersonNumber * Math.max(1, occupants);
    if (method === 'METER_USAGE_MIN_AMOUNT') return Math.max(usage * unitPriceNumber, minAmountNumber);
    if (method === 'METER_USAGE_MIN_UNITS')
      return usage <= minUnitsNumber ? minAmountNumber : usage * unitPriceNumber;
    if (method === 'METER_USAGE_PLUS_BASE')
      return usage <= minUnitsNumber
        ? minAmountNumber
        : minAmountNumber + (usage - minUnitsNumber) * unitPriceNumber;
    if (method === 'METER_USAGE_TIERED') return computeTieredAmount(usage);
    return usage * unitPriceNumber;
  };

  const describeTieredRates = () => {
    const normalized = tiers
      .map((t) => ({
        uptoUnit: t.uptoUnit.trim() ? toNumber(t.uptoUnit) : null,
        unitPrice: toNumber(t.unitPrice),
        chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
      }))
      .filter((t) => t.unitPrice > 0)
      .map((t) => ({
        uptoUnit:
          t.uptoUnit !== null && Number.isFinite(t.uptoUnit) && t.uptoUnit > 0 ? t.uptoUnit : null,
        unitPrice: Math.max(0, t.unitPrice),
        chargeType: t.chargeType,
      }));

    const finite = normalized
      .filter((t) => t.uptoUnit !== null)
      .sort((a, b) => (a.uptoUnit as number) - (b.uptoUnit as number));
    const infinite = normalized.filter((t) => t.uptoUnit === null);
    const ordered = [...finite, ...infinite];
    if (!ordered.length) return '';

    let previousUpto = 0;
    const parts: string[] = [];
    for (const tier of ordered) {
      const from = previousUpto + 1;
      const to = tier.uptoUnit ?? null;
      const label =
        to !== null ? `หน่วยที่ ${from}-${to}` : `ตั้งแต่หน่วยที่ ${from} ขึ้นไป`;
      const priceLabel =
        tier.chargeType === 'FLAT'
          ? `เหมาจ่าย ${Math.max(0, tier.unitPrice).toLocaleString()} บาท`
          : `หน่วยละ ${Math.max(0, tier.unitPrice).toLocaleString()} บาท`;
      parts.push(`${label} ${priceLabel}`);
      previousUpto = to !== null ? to : previousUpto;
    }
    if (parts.length <= 2) return parts.join(' , ');
    return `${parts[0]} , ${parts[1]} ...`;
  };

  const tierRanges = tiers.reduce(
    (acc, tier) => {
      const raw = tier.uptoUnit.trim() ? toNumber(tier.uptoUnit) : null;
      const to = raw !== null && Number.isFinite(raw) && raw > 0 ? raw : null;
      const from = acc.prev + 1;
      const nextPrev = to !== null ? to : acc.prev;
      return { prev: nextPrev, ranges: [...acc.ranges, { from, to }] };
    },
    { prev: 0, ranges: [] as Array<{ from: number; to: number | null }> },
  ).ranges;

  const exampleTitle =
    method === 'FLAT_MONTHLY'
      ? 'เหมาจ่ายรายเดือน'
      : method === 'FLAT_PER_PERSON'
        ? 'เหมาจ่ายรายหัว'
        : method === 'METER_USAGE_MIN_AMOUNT'
          ? 'คิดตามจริง ขั้นต่ำเป็นจำนวนเงิน'
          : method === 'METER_USAGE_MIN_UNITS'
            ? 'คิดตามจริง ขั้นต่ำเป็นยูนิต'
            : method === 'METER_USAGE_PLUS_BASE'
              ? 'คิดตามจริง บวกส่วนต่างจากราคาขั้นต่ำ'
              : method === 'METER_USAGE_TIERED'
                ? 'คิดตามจริง แบบขั้นบันได'
                : 'คิดตามจริง';

  const examplePill =
    method === 'FLAT_MONTHLY'
      ? `กำหนด ค่าน้ำเหมาจ่ายเดือนละ: ${flatMonthlyNumber.toLocaleString()} บาท`
      : method === 'FLAT_PER_PERSON'
        ? `กำหนด ค่าน้ำเหมาจ่ายหัวละ: ${flatPerPersonNumber.toLocaleString()} บาท`
        : method === 'METER_USAGE_MIN_AMOUNT'
          ? `กำหนด ค่าน้ำหน่วยละ: ${unitPriceNumber.toLocaleString()} บาท ขั้นต่ำ ${minAmountNumber.toLocaleString()} บาท`
          : method === 'METER_USAGE_MIN_UNITS'
            ? `กำหนด ค่าน้ำหน่วยละ: ${unitPriceNumber.toLocaleString()} บาท (ขั้นต่ำ ${minUnitsNumber.toLocaleString()} ยูนิต เหมาจ่าย ${minAmountNumber.toLocaleString()} บาท)`
            : method === 'METER_USAGE_PLUS_BASE'
              ? `กำหนด ค่าน้ำหน่วยละ: ${unitPriceNumber.toLocaleString()} บาท (ขั้นต่ำ ${minUnitsNumber.toLocaleString()} ยูนิต เหมาจ่าย ${minAmountNumber.toLocaleString()} บาท)`
              : method === 'METER_USAGE_TIERED'
                ? `กำหนด อัตราค่าน้ำแบบขั้นบันได: ${describeTieredRates() || '-'}`
                : `กำหนด ค่าน้ำหน่วยละ: ${unitPriceNumber.toLocaleString()} บาท`;

  return (
    <div className="space-y-2">
      <input
        id="waterRate"
        type="hidden"
        defaultValue={
          initialConfig?.waterUnitPrice !== null && initialConfig?.waterUnitPrice !== undefined
            ? String(Number(initialConfig.waterUnitPrice))
            : ''
        }
      />
      <input
        id="waterFeeMethod"
        type="hidden"
        defaultValue={normalizeWaterFeeMethod(initialConfig?.waterFeeMethod) ?? 'METER_USAGE'}
      />
      <input
        id="waterFlatMonthlyFee"
        type="hidden"
        defaultValue={
          initialConfig?.waterFlatMonthlyFee !== null && initialConfig?.waterFlatMonthlyFee !== undefined
            ? String(Number(initialConfig.waterFlatMonthlyFee))
            : ''
        }
      />
      <input
        id="waterFlatPerPersonFee"
        type="hidden"
        defaultValue={
          initialConfig?.waterFlatPerPersonFee !== null && initialConfig?.waterFlatPerPersonFee !== undefined
            ? String(Number(initialConfig.waterFlatPerPersonFee))
            : ''
        }
      />
      <input
        id="waterMinAmount"
        type="hidden"
        defaultValue={
          initialConfig?.waterMinAmount !== null && initialConfig?.waterMinAmount !== undefined
            ? String(Number(initialConfig.waterMinAmount))
            : ''
        }
      />
      <input
        id="waterMinUnits"
        type="hidden"
        defaultValue={
          initialConfig?.waterMinUnits !== null && initialConfig?.waterMinUnits !== undefined
            ? String(Number(initialConfig.waterMinUnits))
            : ''
        }
      />
      <input
        id="waterTieredRates"
        type="hidden"
        defaultValue={
          Array.isArray(initialConfig?.waterTieredRates)
            ? JSON.stringify(initialConfig?.waterTieredRates)
            : ''
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            กำหนดค่าน้ำ
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>กำหนดค่าน้ำ</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">1</div>
                <div className="font-semibold">เลือกวิธีคิดค่าน้ำ</div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'FLAT_MONTHLY'}
                    onChange={() => setMethod('FLAT_MONTHLY')}
                  />
                  <div className="font-medium">เหมาจ่ายรายเดือน</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'FLAT_PER_PERSON'}
                    onChange={() => setMethod('FLAT_PER_PERSON')}
                  />
                  <div className="font-medium">เหมาจ่ายรายหัว</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'METER_USAGE'}
                    onChange={() => setMethod('METER_USAGE')}
                  />
                  <div className="font-medium">คิดตามจริง</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'METER_USAGE_MIN_AMOUNT'}
                    onChange={() => setMethod('METER_USAGE_MIN_AMOUNT')}
                  />
                  <div className="font-medium">คิดตามจริง (ขั้นต่ำเป็นจำนวนเงิน)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'METER_USAGE_MIN_UNITS'}
                    onChange={() => setMethod('METER_USAGE_MIN_UNITS')}
                  />
                  <div className="font-medium">คิดตามจริง (ขั้นต่ำเป็นยูนิต)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'METER_USAGE_PLUS_BASE'}
                    onChange={() => setMethod('METER_USAGE_PLUS_BASE')}
                  />
                  <div className="font-medium">คิดตามจริง (บวกส่วนต่างจากราคาขั้นต่ำ)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="waterFeeMethodRadio"
                    checked={method === 'METER_USAGE_TIERED'}
                    onChange={() => setMethod('METER_USAGE_TIERED')}
                  />
                  <div className="font-medium">คิดตามจริง (แบบขั้นบันได)</div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">2</div>
                <div className="font-semibold">กรุณากรอกข้อมูลค่าน้ำ</div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                {method === 'FLAT_MONTHLY' && (
                  <div className="space-y-2">
                    <Label>เหมาจ่ายรายเดือน (บาท/เดือน)</Label>
                    <Input type="number" value={flatMonthly} onChange={(e) => setFlatMonthly(e.target.value)} />
                  </div>
                )}

                {method === 'FLAT_PER_PERSON' && (
                  <div className="space-y-2">
                    <Label>เหมาจ่ายรายหัวละ (บาท/เดือน)</Label>
                    <Input type="number" value={flatPerPerson} onChange={(e) => setFlatPerPerson(e.target.value)} />
                  </div>
                )}

                {method === 'METER_USAGE' && (
                  <div className="space-y-2">
                    <Label>คิดตามจริง (บาท/ยูนิต)</Label>
                    <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                  </div>
                )}

                {method === 'METER_USAGE_MIN_AMOUNT' && (
                  <>
                    <div className="space-y-2">
                      <Label>คิดตามจริง (บาท/ยูนิต)</Label>
                      <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ขั้นต่ำ (บาท)</Label>
                      <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                    </div>
                  </>
                )}

                {method === 'METER_USAGE_MIN_UNITS' && (
                  <>
                    <div className="space-y-2">
                      <Label>คิดตามจริง (บาท/ยูนิต)</Label>
                      <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ยูนิตขั้นต่ำ (ยูนิต)</Label>
                      <Input type="number" value={minUnits} onChange={(e) => setMinUnits(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>คิดเป็นเงิน (บาท)</Label>
                      <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                    </div>
                  </>
                )}

                {method === 'METER_USAGE_PLUS_BASE' && (
                  <>
                    <div className="space-y-2">
                      <Label>คิดตามจริง (บาท/ยูนิต)</Label>
                      <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ยูนิตขั้นต่ำ (ยูนิต)</Label>
                      <Input type="number" value={minUnits} onChange={(e) => setMinUnits(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>คิดเป็นเงิน (บาท)</Label>
                      <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                    </div>
                  </>
                )}

                {method === 'METER_USAGE_TIERED' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>อัตราค่าน้ำแบบขั้นบันได</Label>
                      <div className="space-y-2">
                        {tiers.map((tier, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-[80px_28px_1fr_110px_1fr_48px] gap-2 items-center"
                          >
                            {tier.uptoUnit.trim() ? (
                              <>
                                <Input type="number" value={String(tierRanges[idx]?.from ?? 1)} disabled />
                                <div className="text-center text-slate-500">ถึง</div>
                                <Input
                                  type="number"
                                  value={tier.uptoUnit}
                                  placeholder="ยูนิตที่"
                                  onChange={(e) => {
                                    const next = [...tiers];
                                    next[idx] = { ...next[idx], uptoUnit: e.target.value };
                                    setTiers(next);
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <div className="col-span-3 text-slate-600">
                                  ตั้งแต่หน่วยที่ {tierRanges[idx]?.from ?? 1} ขึ้นไป
                                </div>
                              </>
                            )}
                            <select
                              value={tier.chargeType}
                              onChange={(e) => {
                                const value = e.target.value === 'FLAT' ? 'FLAT' : 'PER_UNIT';
                                const next = [...tiers];
                                next[idx] = { ...next[idx], chargeType: value };
                                setTiers(next);
                              }}
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="PER_UNIT">หน่วยละ</option>
                              <option value="FLAT">เหมาจ่าย</option>
                            </select>
                            <Input
                              type="number"
                              value={tier.unitPrice}
                              placeholder="0"
                              onChange={(e) => {
                                const next = [...tiers];
                                next[idx] = { ...next[idx], unitPrice: e.target.value };
                                setTiers(next);
                              }}
                            />
                            <div className="text-slate-500">บาท</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => {
                          const lastFiniteTo = tiers
                            .map((t) => (t.uptoUnit.trim() ? toNumber(t.uptoUnit) : 0))
                            .filter((n) => Number.isFinite(n) && n > 0)
                            .reduce((max, n) => Math.max(max, n), 0);
                          const nextUpto = String(Math.max(1, lastFiniteTo + 5));
                          const next = [...tiers];
                          const infiniteIndex = next.findIndex((t) => !t.uptoUnit.trim());
                          const newTier = { uptoUnit: nextUpto, unitPrice: String(unitPriceNumber), chargeType: 'PER_UNIT' as const };
                          if (infiniteIndex >= 0) next.splice(infiniteIndex, 0, newTier);
                          else next.push(newTier);
                          setTiers(next);
                        }}
                      >
                        เพิ่มขั้น
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-200"
                        onClick={() => {
                          if (tiers.length <= 1) return;
                          const next = [...tiers];
                          if (!next[next.length - 1].uptoUnit.trim() && next.length > 1) {
                            next.splice(next.length - 2, 1);
                          } else {
                            next.splice(next.length - 1, 1);
                          }
                          setTiers(next.length ? next : tiers);
                        }}
                      >
                        ลบขั้น
                      </Button>
                    </div>
                  </div>
                )}

                <Dialog open={exampleOpen} onOpenChange={setExampleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                      ดูตัวอย่างการคำนวณ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px]">
                    <DialogHeader>
                      <DialogTitle>ตัวอย่างการคำนวณ</DialogTitle>
                    </DialogHeader>
                    <div className="text-center space-y-6 py-2">
                      <div className="font-semibold text-lg">{exampleTitle}</div>
                      <div className="inline-flex px-4 py-2 rounded-full bg-slate-100 font-semibold">{examplePill}</div>
                      {method === 'METER_USAGE_TIERED' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="border rounded-xl p-6 text-center space-y-2">
                            <div className="font-semibold text-blue-700">กรณีที่ 1</div>
                            <div className="text-slate-600">ห้อง 101 ใช้น้ำ 4 ยูนิต</div>
                            <div className="font-semibold">
                              คิดเป็นค่าน้ำที่ต้องจ่าย {computeExampleAmount(4, 1).toLocaleString()} บาท
                            </div>
                          </div>
                          <div className="border rounded-xl p-6 text-center space-y-2">
                            <div className="font-semibold text-blue-700">กรณีที่ 2</div>
                            <div className="text-slate-600">ห้อง 201 ใช้น้ำ 5 ยูนิต</div>
                            <div className="font-semibold">
                              คิดเป็นค่าน้ำที่ต้องจ่าย {computeExampleAmount(5, 1).toLocaleString()} บาท
                            </div>
                          </div>
                          <div className="border rounded-xl p-6 text-center space-y-2">
                            <div className="font-semibold text-blue-700">กรณีที่ 3</div>
                            <div className="text-slate-600">ห้อง 301 ใช้น้ำ 6 ยูนิต</div>
                            <div className="font-semibold">
                              คิดเป็นค่าน้ำที่ต้องจ่าย {computeExampleAmount(6, 1).toLocaleString()} บาท
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border rounded-xl p-6 text-center space-y-2">
                            <div className="font-semibold text-blue-700">กรณีที่ 1</div>
                            <div className="text-slate-600">
                              {method === 'FLAT_PER_PERSON' ? 'ห้อง 101 มีผู้เช่า 1 คน' : 'ห้อง 101 ใช้น้ำ 5 ยูนิต'}
                            </div>
                            <div className="font-semibold">
                              คิดเป็นค่าน้ำที่ต้องจ่าย {computeExampleAmount(5, 1).toLocaleString()} บาท
                            </div>
                          </div>
                          <div className="border rounded-xl p-6 text-center space-y-2">
                            <div className="font-semibold text-blue-700">กรณีที่ 2</div>
                            <div className="text-slate-600">
                              {method === 'FLAT_PER_PERSON' ? 'ห้อง 201 มีผู้เช่า 2 คน' : 'ห้อง 201 ใช้น้ำ 20 ยูนิต'}
                            </div>
                            <div className="font-semibold">
                              คิดเป็นค่าน้ำที่ต้องจ่าย {computeExampleAmount(20, 2).toLocaleString()} บาท
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              ยกเลิก
            </Button>
            <Button onClick={handleSaveDialog} className="bg-green-600 hover:bg-green-700 text-white">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ElectricFeeSettingsDialog({ initialConfig }: { initialConfig: DormConfig | null }) {
  const initialMethod =
    ((): 'METER_USAGE' | 'METER_USAGE_MIN_AMOUNT' | 'METER_USAGE_MIN_UNITS' | 'METER_USAGE_PLUS_BASE' | 'METER_USAGE_TIERED' | 'FLAT_MONTHLY' => {
      const v = initialConfig?.electricFeeMethod;
      if (
        v === 'METER_USAGE' ||
        v === 'METER_USAGE_MIN_AMOUNT' ||
        v === 'METER_USAGE_MIN_UNITS' ||
        v === 'METER_USAGE_PLUS_BASE' ||
        v === 'METER_USAGE_TIERED' ||
        v === 'FLAT_MONTHLY'
      ) return v;
      return 'METER_USAGE';
    })();
  const [open, setOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [method, setMethod] = useState(initialMethod);
  const [unitPrice, setUnitPrice] = useState(
    initialConfig?.electricUnitPrice !== null && initialConfig?.electricUnitPrice !== undefined
      ? String(Number(initialConfig.electricUnitPrice))
      : '0',
  );
  const [flatMonthly, setFlatMonthly] = useState(
    initialConfig?.electricFlatMonthlyFee !== null && initialConfig?.electricFlatMonthlyFee !== undefined
      ? String(Number(initialConfig.electricFlatMonthlyFee))
      : '0'
  );
  const [minAmount, setMinAmount] = useState(
    initialConfig?.electricMinAmount !== null && initialConfig?.electricMinAmount !== undefined
      ? String(Number(initialConfig.electricMinAmount))
      : '0',
  );
  const [minUnits, setMinUnits] = useState(
    initialConfig?.electricMinUnits !== null && initialConfig?.electricMinUnits !== undefined
      ? String(Number(initialConfig.electricMinUnits))
      : '0',
  );
  const [tiers, setTiers] = useState<
    Array<{ uptoUnit: string; unitPrice: string; chargeType: 'PER_UNIT' | 'FLAT' }>
  >(() => {
    const raw = initialConfig?.electricTieredRates as
      | Array<{ uptoUnit?: number | null; unitPrice: number; chargeType?: 'PER_UNIT' | 'FLAT' }>
      | null
      | undefined;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((t) => ({
        uptoUnit:
          t.uptoUnit === null || t.uptoUnit === undefined ? '' : String(Number(t.uptoUnit)),
        unitPrice: t.unitPrice !== null && t.unitPrice !== undefined ? String(Number(t.unitPrice)) : '0',
        chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
      }));
    }
    return [
      { uptoUnit: '50', unitPrice: String(Number(initialConfig?.electricUnitPrice ?? 0)), chargeType: 'PER_UNIT' },
      { uptoUnit: '', unitPrice: '0', chargeType: 'FLAT' },
    ];
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const cfg = await api.getDormConfig();
        const v = cfg?.electricFeeMethod;
        if (
          v === 'METER_USAGE' ||
          v === 'METER_USAGE_MIN_AMOUNT' ||
          v === 'METER_USAGE_MIN_UNITS' ||
          v === 'METER_USAGE_PLUS_BASE' ||
          v === 'METER_USAGE_TIERED' ||
          v === 'FLAT_MONTHLY'
        ) {
          setMethod(v);
        } else {
          setMethod('METER_USAGE');
        }
        setUnitPrice(
          cfg?.electricUnitPrice !== null && cfg?.electricUnitPrice !== undefined
            ? String(Number(cfg.electricUnitPrice))
            : ''
        );
        setFlatMonthly(
          cfg?.electricFlatMonthlyFee !== null && cfg?.electricFlatMonthlyFee !== undefined
            ? String(Number(cfg.electricFlatMonthlyFee))
            : ''
        );
        setMinAmount(
          cfg?.electricMinAmount !== null && cfg?.electricMinAmount !== undefined
            ? String(Number(cfg.electricMinAmount))
            : ''
        );
        setMinUnits(
          cfg?.electricMinUnits !== null && cfg?.electricMinUnits !== undefined
            ? String(Number(cfg.electricMinUnits))
            : ''
        );
        const raw = cfg?.electricTieredRates as
          | Array<{ uptoUnit?: number | null; unitPrice: number; chargeType?: 'PER_UNIT' | 'FLAT' }>
          | null
          | undefined;
        if (Array.isArray(raw) && raw.length) {
          setTiers(
            raw.map((t) => ({
              uptoUnit: t.uptoUnit === null || t.uptoUnit === undefined ? '' : String(Number(t.uptoUnit)),
              unitPrice: t.unitPrice !== null && t.unitPrice !== undefined ? String(Number(t.unitPrice)) : '0',
              chargeType: t.chargeType === 'FLAT' ? 'FLAT' : 'PER_UNIT',
            }))
          );
        }
      } catch {}
    })();
  }, [open]);

  const toNumber = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const unitPriceNumber = Math.max(0, toNumber(unitPrice));
  const flatMonthlyNumber = Math.max(0, toNumber(flatMonthly));
  const minAmountNumber = Math.max(0, toNumber(minAmount));
  const minUnitsNumber = Math.max(0, toNumber(minUnits));

  const tierRanges = tiers.reduce(
    (acc, tier, idx) => {
      const raw = tier.uptoUnit.trim() ? toNumber(tier.uptoUnit) : null;
      const to = raw !== null && Number.isFinite(raw) && raw > 0 ? raw : null;
      const previousTo = idx > 0 ? acc.prev : 0;
      const from = previousTo + 1;
      acc.ranges.push({ from, to });
      acc.prev = to ?? acc.prev;
      return acc;
    },
    { prev: 0, ranges: [] as Array<{ from: number; to: number | null }> },
  ).ranges;

  const describeTieredRates = () => {
    const arr = tiers
      .map((t, idx) => {
        const r = tierRanges[idx];
        const from = r?.from ?? 1;
        const to = r?.to ?? null;
        const rangeText = to ? `${from}-${to}` : `ตั้งแต่ ${from} ขึ้นไป`;
        const chargeText = t.chargeType === 'FLAT' ? `เหมาจ่าย ${toNumber(t.unitPrice).toLocaleString()} บาท` : `หน่วยละ ${toNumber(t.unitPrice).toLocaleString()} บาท`;
        return `หน่วยที่ ${rangeText} (${chargeText})`;
      })
      .filter(Boolean);
    return arr.join(', ');
  };

  const computeExampleAmount = (units: number) => {
    const u = Math.max(0, units);
    if (method === 'FLAT_MONTHLY') return flatMonthlyNumber;
    if (method === 'METER_USAGE_MIN_AMOUNT') return Math.max(u * unitPriceNumber, minAmountNumber);
    if (method === 'METER_USAGE_MIN_UNITS') return u <= minUnitsNumber ? minAmountNumber : u * unitPriceNumber;
    if (method === 'METER_USAGE_PLUS_BASE')
      return u <= minUnitsNumber ? minAmountNumber : minAmountNumber + (u - minUnitsNumber) * unitPriceNumber;
    if (method === 'METER_USAGE_TIERED') {
      const normalized = tiers
        .map((t) => ({
          uptoUnit:
            t.uptoUnit !== undefined && t.uptoUnit !== null && t.uptoUnit !== '' ? Number(t.uptoUnit) : undefined,
          unitPrice: Number(t.unitPrice ?? 0),
          chargeType: t.chargeType,
        }))
        .filter((t) => t.unitPrice > 0);
      const finite = normalized
        .filter((t) => t.uptoUnit !== undefined)
        .sort((a, b) => (a.uptoUnit as number) - (b.uptoUnit as number));
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
    }
    return u * unitPriceNumber;
  };

  const applyToHiddenInputs = () => {
    const electricRateInput = document.getElementById('electricRate') as HTMLInputElement | null;
    const methodInput = document.getElementById('electricFeeMethod') as HTMLInputElement | null;
    const monthlyInput = document.getElementById('electricFlatMonthlyFee') as HTMLInputElement | null;
    const minAmountInput = document.getElementById('electricMinAmount') as HTMLInputElement | null;
    const minUnitsInput = document.getElementById('electricMinUnits') as HTMLInputElement | null;
    const tieredRatesInput = document.getElementById('electricTieredRates') as HTMLInputElement | null;
    if (electricRateInput) electricRateInput.value = unitPrice;
    if (methodInput) methodInput.value = method;
    if (monthlyInput) monthlyInput.value = flatMonthly;
    if (minAmountInput) minAmountInput.value = minAmount;
    if (minUnitsInput) minUnitsInput.value = minUnits;
    if (tieredRatesInput) {
      const normalized = tiers
        .map((t) => ({
          uptoUnit:
            t.uptoUnit !== undefined && t.uptoUnit !== null && t.uptoUnit !== '' ? Number(t.uptoUnit) : null,
          unitPrice: Number(t.unitPrice ?? 0),
          chargeType: t.chargeType,
        }))
        .filter((t) => Number.isFinite(t.unitPrice) && t.unitPrice > 0)
        .map((t) => ({
          uptoUnit:
            t.uptoUnit !== null && Number.isFinite(t.uptoUnit) && (t.uptoUnit as number) > 0
              ? t.uptoUnit
              : null,
          unitPrice: t.unitPrice,
          chargeType: t.chargeType,
        }));
      tieredRatesInput.value = JSON.stringify(normalized);
    }
  };

  useEffect(() => {
    applyToHiddenInputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, unitPrice, flatMonthly, minAmount, minUnits, tiers]);

  const handleSaveDialog = () => {
    applyToHiddenInputs();
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <input
        id="electricRate"
        type="hidden"
        defaultValue={
          initialConfig?.electricUnitPrice !== null && initialConfig?.electricUnitPrice !== undefined
            ? String(Number(initialConfig.electricUnitPrice))
            : ''
        }
      />
      <input
        id="electricFeeMethod"
        type="hidden"
        defaultValue={
          initialConfig?.electricFeeMethod ??
          'METER_USAGE'
        }
      />
      <input
        id="electricFlatMonthlyFee"
        type="hidden"
        defaultValue={
          initialConfig?.electricFlatMonthlyFee !== null && initialConfig?.electricFlatMonthlyFee !== undefined
            ? String(Number(initialConfig.electricFlatMonthlyFee))
            : ''
        }
      />
      <input
        id="electricMinAmount"
        type="hidden"
        defaultValue={
          initialConfig?.electricMinAmount !== null && initialConfig?.electricMinAmount !== undefined
            ? String(Number(initialConfig.electricMinAmount))
            : ''
        }
      />
      <input
        id="electricMinUnits"
        type="hidden"
        defaultValue={
          initialConfig?.electricMinUnits !== null && initialConfig?.electricMinUnits !== undefined
            ? String(Number(initialConfig.electricMinUnits))
            : ''
        }
      />
      <input id="electricTieredRates" type="hidden" defaultValue={Array.isArray(initialConfig?.electricTieredRates) ? JSON.stringify(initialConfig?.electricTieredRates) : ''} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
            กำหนดค่าไฟ
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#8b5a3c]">กำหนดค่าไฟ</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">1) เลือกวิธีคิดค่าไฟ</div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'FLAT_MONTHLY'}
                    onChange={() => setMethod('FLAT_MONTHLY')}
                  />
                  <div className="font-medium">เหมาจ่ายรายเดือน</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'METER_USAGE'}
                    onChange={() => setMethod('METER_USAGE')}
                  />
                  <div className="font-medium">คิดตามจริง</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'METER_USAGE_MIN_AMOUNT'}
                    onChange={() => setMethod('METER_USAGE_MIN_AMOUNT')}
                  />
                  <div className="font-medium">คิดตามจริง (ขั้นต่ำเป็นจำนวนเงิน)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'METER_USAGE_MIN_UNITS'}
                    onChange={() => setMethod('METER_USAGE_MIN_UNITS')}
                  />
                  <div className="font-medium">คิดตามจริง (ขั้นต่ำเป็นยูนิต)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'METER_USAGE_PLUS_BASE'}
                    onChange={() => setMethod('METER_USAGE_PLUS_BASE')}
                  />
                  <div className="font-medium">คิดตามจริง (บวกส่วนต่างจากราคาขั้นต่ำ)</div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="electricFeeMethodRadio"
                    checked={method === 'METER_USAGE_TIERED'}
                    onChange={() => setMethod('METER_USAGE_TIERED')}
                  />
                  <div className="font-medium">คิดตามจริง (แบบขั้นบันได)</div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">2) กรอกค่าไฟ</div>
              {method === 'FLAT_MONTHLY' ? (
                <div className="space-y-2">
                  <Label htmlFor="electricFlatMonthlyFeeDialog">ค่าไฟเหมาจ่าย (บาท/เดือน)</Label>
                  <Input
                    id="electricFlatMonthlyFeeDialog"
                    type="number"
                    value={flatMonthly}
                    onChange={(e) => setFlatMonthly(e.target.value)}
                    className="border-slate-200 focus:ring-[#f5a987]"
                  />
                </div>
              ) : method === 'METER_USAGE_TIERED' ? (
                <div className="space-y-2">
                  <div className="space-y-3">
                    {tiers.map((tier, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div className="text-slate-700">
                          {(() => {
                            const r = tierRanges[idx];
                            const from = r?.from ?? 1;
                            const to = r?.to ?? null;
                            return to ? `หน่วยที่ ${from}-${to}` : `ตั้งแต่หน่วยที่ ${from} ขึ้นไป`;
                          })()}
                        </div>
                        <Input
                          placeholder="ถึงหน่วยที่"
                          value={tier.uptoUnit}
                          onChange={(e) => {
                            const next = [...tiers];
                            next[idx] = { ...next[idx], uptoUnit: e.target.value };
                            setTiers(next);
                          }}
                        />
                        <select
                          value={tier.chargeType}
                          onChange={(e) => {
                            const value = e.target.value === 'FLAT' ? 'FLAT' : 'PER_UNIT';
                            const next = [...tiers];
                            next[idx] = { ...next[idx], chargeType: value };
                            setTiers(next);
                          }}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="PER_UNIT">หน่วยละ</option>
                          <option value="FLAT">เหมาจ่าย</option>
                        </select>
                        <Input
                          type="number"
                          value={tier.unitPrice}
                          placeholder="0"
                          onChange={(e) => {
                            const next = [...tiers];
                            next[idx] = { ...next[idx], unitPrice: e.target.value };
                            setTiers(next);
                          }}
                        />
                        <div className="text-slate-500">บาท</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="electricUnitPriceDialog">ค่าไฟ (บาท/หน่วย)</Label>
                    <Input
                      id="electricUnitPriceDialog"
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="border-slate-200 focus:ring-[#f5a987]"
                    />
                  </div>
                  {(method === 'METER_USAGE_MIN_AMOUNT' ||
                    method === 'METER_USAGE_MIN_UNITS' ||
                    method === 'METER_USAGE_PLUS_BASE') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="electricMinAmountDialog">ขั้นต่ำ (บาท)</Label>
                        <Input
                          id="electricMinAmountDialog"
                          type="number"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                          className="border-slate-200 focus:ring-[#f5a987]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="electricMinUnitsDialog">ขั้นต่ำ (ยูนิต)</Label>
                        <Input
                          id="electricMinUnitsDialog"
                          type="number"
                          value={minUnits}
                          onChange={(e) => setMinUnits(e.target.value)}
                          className="border-slate-200 focus:ring-[#f5a987]"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setExampleOpen(true)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                  ดูตัวอย่างการคำนวณ
                </Button>
              </div>

              <Dialog open={exampleOpen} onOpenChange={setExampleOpen}>
                <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-[#8b5a3c]">ตัวอย่างการคิดค่าไฟ</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-sm text-slate-700">
                      {method === 'FLAT_MONTHLY'
                        ? `กำหนด ค่าไฟเหมาจ่ายเดือนละ: ${flatMonthlyNumber.toLocaleString()} บาท`
                        : method === 'METER_USAGE_TIERED'
                        ? `กำหนด อัตราค่าไฟแบบขั้นบันได: ${describeTieredRates() || '-'}`
                        : `กำหนด ค่าไฟหน่วยละ: ${unitPriceNumber.toLocaleString()} บาท`}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border rounded-xl p-6 text-center space-y-2">
                        <div className="font-semibold text-blue-700">กรณีที่ 1</div>
                        <div className="text-slate-600">ห้อง 101 ใช้ไฟ 50 ยูนิต</div>
                        <div className="font-semibold">
                          คิดเป็นค่าไฟที่ต้องจ่าย {computeExampleAmount(50).toLocaleString()} บาท
                        </div>
                      </div>
                      <div className="border rounded-xl p-6 text-center space-y-2">
                        <div className="font-semibold text-blue-700">กรณีที่ 2</div>
                        <div className="text-slate-600">ห้อง 201 ใช้ไฟ 120 ยูนิต</div>
                        <div className="font-semibold">
                          คิดเป็นค่าไฟที่ต้องจ่าย {computeExampleAmount(120).toLocaleString()} บาท
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setExampleOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                      ปิด
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              ยกเลิก
            </Button>
            <Button onClick={handleSaveDialog} className="bg-green-600 hover:bg-green-700 text-white">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SaveDormSettings({ initialConfig }: { initialConfig: DormConfig | null }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setIsSaving(true);
    const dormName = (document.getElementById('dormName') as HTMLInputElement)?.value;
    const address = (document.getElementById('address') as HTMLInputElement)?.value;
    const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
    const lineId = (document.getElementById('lineId') as HTMLInputElement)?.value;
    const waterRateRaw = (document.getElementById('waterRate') as HTMLInputElement)?.value ?? '';
    const electricRateRaw = (document.getElementById('electricRate') as HTMLInputElement)?.value ?? '';
    const waterRate =
      waterRateRaw.trim() === '' ? undefined : Number(waterRateRaw);
    const electricRate =
      electricRateRaw.trim() === '' ? undefined : Number(electricRateRaw);
    const commonFee = Number((document.getElementById('commonFee') as HTMLInputElement)?.value);
    const bankAccount = (document.getElementById('bankAccount') as HTMLInputElement)?.value;
    const waterFeeMethodRaw = (document.getElementById('waterFeeMethod') as HTMLInputElement | null)?.value;
    const waterFlatMonthlyFeeRaw = (document.getElementById('waterFlatMonthlyFee') as HTMLInputElement | null)?.value;
    const waterFlatPerPersonFeeRaw = (document.getElementById('waterFlatPerPersonFee') as HTMLInputElement | null)?.value;
    const waterMinAmountRaw = (document.getElementById('waterMinAmount') as HTMLInputElement | null)?.value;
    const waterMinUnitsRaw = (document.getElementById('waterMinUnits') as HTMLInputElement | null)?.value;
    const waterTieredRatesRaw = (document.getElementById('waterTieredRates') as HTMLInputElement | null)?.value;

    const waterFeeMethod = normalizeWaterFeeMethod(waterFeeMethodRaw);
    const waterFlatMonthlyFee =
      waterFlatMonthlyFeeRaw !== undefined && waterFlatMonthlyFeeRaw !== null && waterFlatMonthlyFeeRaw !== ''
        ? Number(waterFlatMonthlyFeeRaw)
        : undefined;
    const waterFlatPerPersonFee =
      waterFlatPerPersonFeeRaw !== undefined && waterFlatPerPersonFeeRaw !== null && waterFlatPerPersonFeeRaw !== ''
        ? Number(waterFlatPerPersonFeeRaw)
        : undefined;
    const waterMinAmount =
      waterMinAmountRaw !== undefined && waterMinAmountRaw !== null && waterMinAmountRaw !== ''
        ? Number(waterMinAmountRaw)
        : undefined;
    const waterMinUnits =
      waterMinUnitsRaw !== undefined && waterMinUnitsRaw !== null && waterMinUnitsRaw !== ''
        ? Number(waterMinUnitsRaw)
        : undefined;
    const waterTieredRates =
      waterTieredRatesRaw !== undefined && waterTieredRatesRaw !== null && waterTieredRatesRaw !== ''
        ? (() => {
            try {
              const parsed: unknown = JSON.parse(waterTieredRatesRaw);
              if (!Array.isArray(parsed)) return undefined;
              const normalized = parsed
                .filter((r) => typeof r === 'object' && r !== null)
                .map((r) => {
                  const record = r as Record<string, unknown>;
                  const uptoUnitRaw = record.uptoUnit;
                  const unitPriceRaw = record.unitPrice;
                  const chargeTypeRaw = record.chargeType;
                  const uptoUnit =
                    typeof uptoUnitRaw === 'number' && Number.isFinite(uptoUnitRaw) ? uptoUnitRaw : null;
                  const unitPrice =
                    typeof unitPriceRaw === 'number' && Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0;
                  const chargeType: 'PER_UNIT' | 'FLAT' = chargeTypeRaw === 'FLAT' ? 'FLAT' : 'PER_UNIT';
                  return { uptoUnit, unitPrice, chargeType };
                })
                .filter((r) => r.unitPrice > 0);
              return normalized.length ? normalized : undefined;
            } catch {
              return undefined;
            }
          })()
        : undefined;

    const electricFeeMethodRaw = (document.getElementById('electricFeeMethod') as HTMLInputElement | null)?.value;
    const electricFlatMonthlyFeeRaw = (document.getElementById('electricFlatMonthlyFee') as HTMLInputElement | null)?.value;
    const electricMinAmountRaw = (document.getElementById('electricMinAmount') as HTMLInputElement | null)?.value;
    const electricMinUnitsRaw = (document.getElementById('electricMinUnits') as HTMLInputElement | null)?.value;
    const electricTieredRatesRaw = (document.getElementById('electricTieredRates') as HTMLInputElement | null)?.value;

    const electricFeeMethod =
      electricFeeMethodRaw === 'FLAT_MONTHLY' ||
      electricFeeMethodRaw === 'METER_USAGE' ||
      electricFeeMethodRaw === 'METER_USAGE_MIN_AMOUNT' ||
      electricFeeMethodRaw === 'METER_USAGE_MIN_UNITS' ||
      electricFeeMethodRaw === 'METER_USAGE_PLUS_BASE' ||
      electricFeeMethodRaw === 'METER_USAGE_TIERED'
        ? electricFeeMethodRaw
        : undefined;
    const electricFlatMonthlyFee =
      electricFlatMonthlyFeeRaw !== undefined && electricFlatMonthlyFeeRaw !== null && electricFlatMonthlyFeeRaw !== ''
        ? Number(electricFlatMonthlyFeeRaw)
        : undefined;
    const electricMinAmount =
      electricMinAmountRaw !== undefined && electricMinAmountRaw !== null && electricMinAmountRaw !== ''
        ? Number(electricMinAmountRaw)
        : undefined;
    const electricMinUnits =
      electricMinUnitsRaw !== undefined && electricMinUnitsRaw !== null && electricMinUnitsRaw !== ''
        ? Number(electricMinUnitsRaw)
        : undefined;
    const electricTieredRates =
      electricTieredRatesRaw !== undefined && electricTieredRatesRaw !== null && electricTieredRatesRaw !== ''
        ? (() => {
            try {
              const parsed: unknown = JSON.parse(electricTieredRatesRaw);
              if (!Array.isArray(parsed)) return undefined;
              const normalized = parsed
                .filter((r) => typeof r === 'object' && r !== null)
                .map((r) => {
                  const record = r as Record<string, unknown>;
                  const uptoUnitRaw = record.uptoUnit;
                  const unitPriceRaw = record.unitPrice;
                  const chargeTypeRaw = record.chargeType;
                  const uptoUnit =
                    typeof uptoUnitRaw === 'number' && Number.isFinite(uptoUnitRaw) ? uptoUnitRaw : null;
                  const unitPrice =
                    typeof unitPriceRaw === 'number' && Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0;
                  const chargeType: 'PER_UNIT' | 'FLAT' = chargeTypeRaw === 'FLAT' ? 'FLAT' : 'PER_UNIT';
                  return { uptoUnit, unitPrice, chargeType };
                })
                .filter((r) => r.unitPrice > 0);
              return normalized.length ? normalized : undefined;
            } catch {
              return undefined;
            }
          })()
        : undefined;

    try {
      const minimalPayload = {
        dormName,
        address,
        phone,
        lineId,
        waterUnitPrice: waterRate !== undefined ? waterRate : undefined,
        electricUnitPrice: electricRate !== undefined ? electricRate : undefined,
        commonFee,
        bankAccount,
      };
      const saved = await api.updateDormConfig(minimalPayload);
      try {
        await api.getDormConfig();
      } catch {}
      alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
      router.refresh();
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-end gap-4">
      <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">ยกเลิก</Button>
      <Button onClick={handleSave} disabled={isSaving} className="bg-[#f5a987] hover:bg-[#e09b7d] text-white">
        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
      </Button>
    </div>
  )
}
