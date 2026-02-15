import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api";
import { SaveDormSettings } from "./SaveDormSettings";

export const dynamic = 'force-dynamic';

export default async function DormSettingsPage() {
  let config: Awaited<ReturnType<typeof api.getDormConfig>> = null;
  try {
    config = await api.getDormConfig();
  } catch {
    config = null;
  }
  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#8b5a3c]">ข้อมูลหอพัก</h1>
           <p className="text-slate-500 text-sm mt-1">ตั้งค่าข้อมูลพื้นฐานของหอพัก</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#8b5a3c]">ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dormName">ชื่อหอพัก</Label>
              <Input id="dormName" defaultValue={config?.dormName || ''} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Input id="address" defaultValue={config?.address || ''} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์ติดต่อ</Label>
              <Input id="phone" defaultValue={config?.phone || ''} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineId">Line ID</Label>
              <Input id="lineId" defaultValue={config?.lineId || ''} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#8b5a3c]">ตั้งค่าบิลและมิเตอร์</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waterRate">ค่าน้ำ (บาท/หน่วย)</Label>
                <Input
                  id="waterRate"
                  type="number"
                  defaultValue={config?.waterUnitPrice !== undefined && config?.waterUnitPrice !== null ? Number(config.waterUnitPrice) : 0}
                  className="border-slate-200 focus:ring-[#f5a987]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="electricRate">ค่าไฟ (บาท/หน่วย)</Label>
                <Input
                  id="electricRate"
                  type="number"
                  defaultValue={config?.electricUnitPrice !== undefined && config?.electricUnitPrice !== null ? Number(config.electricUnitPrice) : 0}
                  className="border-slate-200 focus:ring-[#f5a987]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commonFee">ค่าส่วนกลาง (บาท/เดือน)</Label>
              <Input id="commonFee" type="number" defaultValue={config ? Number(config.commonFee) : 300} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">เลขที่บัญชีรับโอน</Label>
              <Input id="bankAccount" defaultValue={config?.bankAccount || ''} className="border-slate-200 focus:ring-[#f5a987]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <SaveDormSettings initialConfig={config} />
    </div>
  )
}
