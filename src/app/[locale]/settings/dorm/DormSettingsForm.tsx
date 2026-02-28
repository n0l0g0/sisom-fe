'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DormConfig, DormExtra } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Wallet, Image as ImageIcon, MapPin, Phone, MessageCircle, Save, Loader2 } from 'lucide-react';

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
      };

      // 4. Call APIs
      await Promise.all([
        api.updateDormConfig(configPayload),
        api.updateDormExtra(extraPayload)
      ]);

      // Success
      alert('Settings saved successfully');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Property Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your property details, billing rates, and branding.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[120px]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Section 1: General Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle>General Information</CardTitle>
          </div>
          <CardDescription>Basic details about your property.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dormName">Property Name</Label>
            <Input 
              id="dormName" 
              value={dormName} 
              onChange={(e) => setDormName(e.target.value)} 
              placeholder="e.g. Sisom Residence"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Contact Phone</Label>
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
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="pl-9"
                placeholder="123 Sukhumvit Rd, Bangkok"
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
            <CardTitle>Utility Rates & Billing</CardTitle>
          </div>
          <CardDescription>Set your water, electricity rates and bank account for payments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Rates */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="waterRate">Water Rate (฿/unit)</Label>
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
              <Label htmlFor="electricRate">Electricity Rate (฿/unit)</Label>
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
              <Label htmlFor="commonFee">Common Fee (฿/month)</Label>
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
            <h3 className="text-sm font-medium mb-4">Bank Account Details</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Bank" />
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
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input 
                  id="accountNumber" 
                  value={accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)} 
                  placeholder="XXX-X-XXXXX-X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input 
                  id="accountName" 
                  value={accountName} 
                  onChange={(e) => setAccountName(e.target.value)} 
                  placeholder="Account Owner Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input 
                  id="branch" 
                  value={branch} 
                  onChange={(e) => setBranch(e.target.value)} 
                  placeholder="Branch Name"
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
            <CardTitle>Branding & Links</CardTitle>
          </div>
          <CardDescription>Upload your logo and set external links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Property Logo</Label>
            <div className="flex items-start gap-6">
              <div className="border-2 border-dashed border-muted rounded-xl p-4 w-40 h-40 flex items-center justify-center bg-muted/30">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">No Logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="logo">Upload New Logo</Label>
                  <Input id="logo" type="file" accept="image/*" onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground">Recommended size: 512x512px. Max file size: 2MB.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapUrl">Google Maps Link</Label>
              <Input 
                id="mapUrl" 
                value={mapUrl} 
                onChange={(e) => setMapUrl(e.target.value)} 
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineLink">LINE Official Account Link</Label>
              <Input 
                id="lineLink" 
                value={lineLink} 
                onChange={(e) => setLineLink(e.target.value)} 
                placeholder="https://line.me/R/ti/p/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDay">Monthly Due Day</Label>
              <Input 
                id="dueDay" 
                type="number" 
                min="1" 
                max="31" 
                value={monthlyDueDay} 
                onChange={(e) => setMonthlyDueDay(e.target.value)} 
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">Default day of the month for bill payment deadline.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
