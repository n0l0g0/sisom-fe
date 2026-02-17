import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, DormExtra } from "@/services/api";
import { SaveDormSettings } from "./SaveDormSettings";
import SaveDormExtra from "./SaveDormExtra";

export const dynamic = 'force-dynamic';

const bankOptions = [
  { value: "กรุงเทพ", label: "ธนาคารกรุงเทพ" },
  { value: "กสิกรไทย", label: "ธนาคารกสิกรไทย" },
  { value: "ไทยพาณิชย์", label: "ธนาคารไทยพาณิชย์" },
  { value: "กรุงศรี", label: "ธนาคารกรุงศรีอยุธยา" },
  { value: "กรุงไทย", label: "ธนาคารกรุงไทย" },
  { value: "ทหารไทยธนชาต", label: "ธนาคารทหารไทยธนชาต" },
  { value: "ออมสิน", label: "ธนาคารออมสิน" },
  { value: "กยศ.", label: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร" },
];

const parseBankAccount = (raw: string) => {
  const value = (raw || '').trim();
  if (!value)
    return {
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
    };

  const indices = ['ชื่อบัญชี', 'เลขที่บัญชี', 'สาขา']
    .map((label) => value.indexOf(label))
    .filter((idx) => idx >= 0);
  const cutIndex = indices.length ? Math.min(...indices) : value.length;
  const bankName = value.slice(0, cutIndex).trim();

  const extract = (label: string, endLabels: string[]) => {
    const end = endLabels.length ? `(?:${endLabels.join('|')}|$)` : '$';
    const match = value.match(new RegExp(`${label}\\s*([\\s\\S]*?)${end}`));
    return match?.[1]?.trim() ?? '';
  };

  return {
    bankName,
    accountName: extract('ชื่อบัญชี', ['เลขที่บัญชี', 'สาขา']),
    accountNumber: extract('เลขที่บัญชี', ['สาขา']),
    branch: extract('สาขา', []),
  };
};

export default async function DormSettingsPage() {
  let config: Awaited<ReturnType<typeof api.getDormConfig>> = null;
  let extra: DormExtra = {};
  try {
    config = await api.getDormConfig();
    extra = await api.getDormExtra();
  } catch {
    config = null;
    extra = {};
  }
  const bankAccountRaw = (config?.bankAccount || '').trim();
  const parsedBank = parseBankAccount(bankAccountRaw);
  const hasCustomBank =
    parsedBank.bankName &&
    !bankOptions.some((opt) => opt.value === parsedBank.bankName);
  return (
    <div className="space-y-8 fade-in bg-gradient-to-br from-[#fffbf7] to-[#f5ede3] min-h-screen p-4 md:p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center shadow-sm border border-amber-200">
               <span className="text-2xl">🏠</span>
             </div>
             <div>
               <h1 className="text-2xl md:text-3xl font-semibold text-amber-900">ตั้งค่าหอพัก</h1>
               <p className="text-amber-700 text-sm">จัดการข้อมูลและอัตราค่าใช้งาน</p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-2xl p-6 bg-white/70 backdrop-blur-sm border-amber-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2"><span className="text-2xl">🏠</span> ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dormName">ชื่อหอพัก</Label>
              <Input id="dormName" defaultValue={config?.dormName || ''} className="rounded-2xl border-amber-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input id="address" defaultValue={config?.address || ''} className="rounded-2xl border-amber-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์ติดต่อ</Label>
              <Input id="phone" defaultValue={config?.phone || ''} className="rounded-2xl border-amber-200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineId">Line ID</Label>
              <Input id="lineId" defaultValue={config?.lineId || ''} className="rounded-2xl border-amber-200" />
            </div>
          </CardContent>
        </div>

        <div className="border rounded-2xl p-6 bg-white/70 backdrop-blur-sm border-amber-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-amber-900 flex items-center gap-2"><span className="text-2xl">⚡</span> ตั้งค่าบิลและมิเตอร์</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waterRate">ค่าน้ำ (บาท/หน่วย)</Label>
                <Input
                  id="waterRate"
                  type="number"
                  defaultValue={config?.waterUnitPrice !== undefined && config?.waterUnitPrice !== null ? Number(config.waterUnitPrice) : 0}
                  className="rounded-2xl border-amber-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricRate">ค่าไฟ (บาท/หน่วย)</Label>
                <Input
                  id="electricRate"
                  type="number"
                  defaultValue={config?.electricUnitPrice !== undefined && config?.electricUnitPrice !== null ? Number(config.electricUnitPrice) : 0}
                  className="rounded-2xl border-amber-200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commonFee">ค่าส่วนกลาง (บาท/เดือน)</Label>
              <Input id="commonFee" type="number" defaultValue={config ? Number(config.commonFee) : 300} className="rounded-2xl border-amber-200" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">ชื่อธนาคาร</Label>
                <select
                  id="bankName"
                defaultValue={parsedBank.bankName || ""}
                  className="rounded-2xl border-amber-200 w-full px-3 py-2 bg-white"
                >
                  <option value="">-- เลือกธนาคาร --</option>
                {hasCustomBank && (
                  <option value={parsedBank.bankName}>{parsedBank.bankName}</option>
                )}
                {bankOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">เลขที่บัญชี</Label>
              <Input
                id="bankAccountNumber"
                defaultValue={parsedBank.accountNumber || ""}
                className="rounded-2xl border-amber-200"
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountName">ชื่อบัญชี</Label>
              <Input
                id="bankAccountName"
                defaultValue={parsedBank.accountName || ""}
                className="rounded-2xl border-amber-200"
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">สาขา</Label>
              <Input
                id="bankBranch"
                defaultValue={parsedBank.branch || ""}
                className="rounded-2xl border-amber-200"
              />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      
      <div className="border rounded-2xl p-6 bg-white/70 backdrop-blur-sm border-amber-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-amber-900">โลโก้และลิงก์</CardTitle>
        </CardHeader>
        <CardContent>
          <SaveDormExtra initial={extra} />
        </CardContent>
      </div>

      <SaveDormSettings initialConfig={config} />
    </div>
  )
}
