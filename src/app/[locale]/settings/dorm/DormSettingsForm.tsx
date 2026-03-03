'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DormConfig, DormExtra } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Wallet, Image as ImageIcon, MapPin, Phone, MessageCircle, Save, Loader2, Bot, Receipt } from 'lucide-react';

interface DormSettingsFormProps {
  initialConfig: DormConfig | null;
  initialExtra: DormExtra | null;
}

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

export function DormSettingsForm({ initialConfig, initialExtra }: DormSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // General Config State
  const [dormName, setDormName] = useState(initialConfig?.dormName || '');
  const [address, setAddress] = useState(initialConfig?.address || '');
  const [phone, setPhone] = useState(initialConfig?.phone || '');
  const [lineId, setLineId] = useState(initialConfig?.lineId || '');
  
  // Utility Config State
  const [waterUnitPrice, setWaterUnitPrice] = useState(initialConfig?.waterUnitPrice?.toString() || '0');
  const [electricUnitPrice, setElectricUnitPrice] = useState(initialConfig?.electricUnitPrice?.toString() || '0');
  const [commonFee, setCommonFee] = useState(initialConfig?.commonFee?.toString() || '300');

  // Bank Config State
  // Parse initial bank account string "BankName AccountName AccountNumber Branch"
  const parseBankAccount = (raw: string) => {
    const value = (raw || '').trim();
    if (!value) return { bankName: '', accountName: '', accountNumber: '', branch: '' };

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

  const initialBank = parseBankAccount(initialConfig?.bankAccount || '');
  const [bankName, setBankName] = useState(initialBank.bankName);
  const [accountName, setAccountName] = useState(initialBank.accountName);
  const [accountNumber, setAccountNumber] = useState(initialBank.accountNumber);
  const [branch, setBranch] = useState(initialBank.branch);

  // Extra Config State
  const [logoPreview, setLogoPreview] = useState<string>(initialExtra?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [mapUrl, setMapUrl] = useState(initialExtra?.mapUrl || '');
  const [lineLink, setLineLink] = useState(initialExtra?.lineLink || '');
  const [monthlyDueDay, setMonthlyDueDay] = useState(initialExtra?.monthlyDueDay?.toString() || '5');

  // LINE OA Config State
  const [lineOaChannelId, setLineOaChannelId] = useState(initialExtra?.lineOaChannelId || '');
  const [lineOaChannelSecret, setLineOaChannelSecret] = useState(initialExtra?.lineOaChannelSecret || '');
  const [lineOaChannelAccessToken, setLineOaChannelAccessToken] = useState(initialExtra?.lineOaChannelAccessToken || '');

  // Slipok Config State
  const [slipokApiKey, setSlipokApiKey] = useState(initialExtra?.slipokApiKey || '');
  const [slipokApiUrl, setSlipokApiUrl] = useState(initialExtra?.slipokApiUrl || '');
  const [slipokBranchId, setSlipokBranchId] = useState(initialExtra?.slipokBranchId || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setLogoFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setLogoPreview(url);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Upload Logo if changed
      let finalLogoUrl = initialExtra?.logoUrl || '';
      if (logoFile) {
        try {
          const uploaded = await api.uploadMedia(logoFile);
          finalLogoUrl = uploaded?.url || uploaded?.filename || finalLogoUrl;
        } catch (e) {
          console.error('Failed to upload logo', e);
          // Continue saving other settings
        }
      }

      // 2. Prepare Config Payload
      const bankAccountString = `${bankName} ชื่อบัญชี ${accountName} เลขที่บัญชี ${accountNumber} สาขา ${branch}`;
      
      const configPayload = {
        dormName,
        address,
        phone,
        lineId,
        waterUnitPrice: Number(waterUnitPrice) || 0,
        electricUnitPrice: Number(electricUnitPrice) || 0,
        commonFee: Number(commonFee) || 0,
        bankAccount: bankAccountString.trim(),
      };

      // 3. Prepare Extra Payload
      const extraPayload: DormExtra = {
        logoUrl: finalLogoUrl || undefined,
        mapUrl: mapUrl || undefined,
        lineLink: lineLink || undefined,
        monthlyDueDay: Number(monthlyDueDay) || 5,
        lineOaChannelId: lineOaChannelId || undefined,
        lineOaChannelSecret: lineOaChannelSecret || undefined,
        lineOaChannelAccessToken: lineOaChannelAccessToken || undefined,
        slipokApiKey: slipokApiKey || undefined,
        slipokApiUrl: slipokApiUrl || undefined,
        slipokBranchId: slipokBranchId || undefined,
      };

      // 4. Call APIs
      await Promise.all([
        api.updateDormConfig(configPayload),
        api.updateDormExtra(extraPayload)
      ]);

      // Success
      alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ตั้งค่าหอพัก</h1>
          <p className="text-muted-foreground mt-1">จัดการข้อมูลหอพัก, อัตราค่าสาธารณูปโภค และบัญชีธนาคาร</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[120px]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              บันทึกข้อมูล
            </>
          )}
        </Button>
      </div>

      {/* Section 1: General Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
          </div>
          <CardDescription>รายละเอียดพื้นฐานเกี่ยวกับหอพักของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dormName">ชื่อหอพัก</Label>
            <Input 
              id="dormName" 
              value={dormName} 
              onChange={(e) => setDormName(e.target.value)} 
              placeholder="เช่น หอพักสีส้ม"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์ติดต่อ</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="pl-9"
                placeholder="081-234-5678"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">ที่อยู่</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="pl-9"
                placeholder="เช่น 123 ถ.สุขุมวิท กรุงเทพฯ"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineId">LINE ID</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="lineId" 
                value={lineId} 
                onChange={(e) => setLineId(e.target.value)} 
                className="pl-9"
                placeholder="@sisom"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Utility Rates & Bank Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>อัตราค่าสาธารณูปโภค & การชำระเงิน</CardTitle>
          </div>
          <CardDescription>กำหนดค่าน้ำ ค่าไฟ และบัญชีธนาคารสำหรับรับชำระเงิน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Rates */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="waterRate">ค่าน้ำ (บาท/หน่วย)</Label>
              <Input 
                id="waterRate" 
                type="number" 
                min="0"
                step="0.01"
                value={waterUnitPrice} 
                onChange={(e) => setWaterUnitPrice(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="electricRate">ค่าไฟ (บาท/หน่วย)</Label>
              <Input 
                id="electricRate" 
                type="number" 
                min="0"
                step="0.01"
                value={electricUnitPrice} 
                onChange={(e) => setElectricUnitPrice(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commonFee">ค่าส่วนกลาง (บาท/เดือน)</Label>
              <Input 
                id="commonFee" 
                type="number" 
                min="0"
                value={commonFee} 
                onChange={(e) => setCommonFee(e.target.value)} 
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-4">ข้อมูลบัญชีธนาคาร</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">ชื่อธนาคาร</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกธนาคาร" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">เลขที่บัญชี</Label>
                <Input 
                  id="accountNumber" 
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)} 
                  placeholder="XXX-X-XXXXX-X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">ชื่อบัญชี</Label>
                <Input 
                  id="accountName" 
                  value={accountName} 
                  onChange={(e) => setAccountName(e.target.value)} 
                  placeholder="ชื่อเจ้าของบัญชี"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">สาขา</Label>
                <Input 
                  id="branch" 
                  value={branch} 
                  onChange={(e) => setBranch(e.target.value)} 
                  placeholder="ชื่อสาขา"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <CardTitle>การตกแต่ง & ลิงก์</CardTitle>
          </div>
          <CardDescription>อัปโหลดโลโก้และตั้งค่าลิงก์ภายนอก</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>โลโก้หอพัก</Label>
            <div className="flex items-start gap-6">
              <div className="border-2 border-dashed border-muted rounded-xl p-4 w-40 h-40 flex items-center justify-center bg-muted/30">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">ไม่มีโลโก้</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="logo">อัปโหลดโลโก้ใหม่</Label>
                  <Input id="logo" type="file" accept="image/*" onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground">ขนาดที่แนะนำ: 512x512px ขนาดไฟล์สูงสุด: 2MB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapUrl">ลิงก์ Google Maps</Label>
              <Input 
                id="mapUrl" 
                value={mapUrl} 
                onChange={(e) => setMapUrl(e.target.value)} 
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineLink">ลิงก์ LINE Official Account</Label>
              <Input 
                id="lineLink" 
                value={lineLink} 
                onChange={(e) => setLineLink(e.target.value)} 
                placeholder="https://line.me/R/ti/p/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDay">วันครบกำหนดชำระเงินประจำเดือน</Label>
              <Input 
                id="dueDay" 
                type="number" 
                min="1" 
                max="31" 
                value={monthlyDueDay} 
                onChange={(e) => setMonthlyDueDay(e.target.value)} 
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">วันที่เริ่มต้นสำหรับกำหนดส่งบิลชำระเงิน</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Section 4: System Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>LINE OA & SlipOK</CardTitle>
          </div>
          <CardDescription>ตั้งค่าการเชื่อมต่อกับ LINE Official Account และระบบตรวจสอบสลิปอัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* LINE OA */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> LINE Official Account
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lineChannelId">Channel ID</Label>
                <Input 
                  id="lineChannelId" 
                  value={lineOaChannelId} 
                  onChange={(e) => setLineOaChannelId(e.target.value)} 
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lineChannelSecret">Channel Secret</Label>
                <Input 
                  id="lineChannelSecret" 
                  value={lineOaChannelSecret} 
                  onChange={(e) => setLineOaChannelSecret(e.target.value)} 
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="lineChannelAccessToken">Channel Access Token</Label>
                <Input 
                  id="lineChannelAccessToken" 
                  value={lineOaChannelAccessToken} 
                  onChange={(e) => setLineOaChannelAccessToken(e.target.value)} 
                  placeholder="long_access_token_string..."
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" /> SlipOK (ระบบตรวจสลิป)
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="slipokApiUrl">API URL</Label>
                <Input 
                  id="slipokApiUrl" 
                  value={slipokApiUrl} 
                  onChange={(e) => setSlipokApiUrl(e.target.value)} 
                  placeholder="https://api.slipok.com/api/line/apikey/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slipokApiKey">API Key</Label>
                <Input 
                  id="slipokApiKey" 
                  value={slipokApiKey} 
                  onChange={(e) => setSlipokApiKey(e.target.value)} 
                  placeholder="SLIPOK_API_KEY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slipokBranchId">Branch ID (Optional)</Label>
                <Input 
                  id="slipokBranchId" 
                  value={slipokBranchId} 
                  onChange={(e) => setSlipokBranchId(e.target.value)} 
                  placeholder="ระบุ Branch ID หากมี"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
