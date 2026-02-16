'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, DormExtra } from '@/services/api';

export default function SaveDormExtra({ initial }: { initial: DormExtra }) {
  const [logoPreview, setLogoPreview] = useState<string>(initial?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [mapUrl, setMapUrl] = useState<string>(initial?.mapUrl || '');
  const [lineLink, setLineLink] = useState<string>(initial?.lineLink || '');
  const [saving, setSaving] = useState(false);

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
      let finalLogoUrl = initial?.logoUrl || '';
      if (logoFile) {
        const uploaded = await api.uploadMedia(logoFile);
        finalLogoUrl = uploaded?.url || uploaded?.filename || finalLogoUrl;
      }
      const payload: DormExtra = {
        logoUrl: finalLogoUrl || undefined,
        mapUrl: mapUrl || undefined,
        lineLink: lineLink || undefined,
      };
      await api.updateDormExtra(payload);
      alert('บันทึกข้อมูลเพิ่มเติมของหอพักเรียบร้อยแล้ว');
    } catch {
      alert('บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>โลโก้หอพัก</Label>
        {logoPreview ? (
          <img src={logoPreview} alt="logo preview" className="w-32 h-32 object-cover rounded-lg border" />
        ) : null}
        <Input type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      <div className="space-y-2">
        <Label>ลิงก์ Google Map</Label>
        <Input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
      </div>
      <div className="space-y-2">
        <Label>ลิงก์ LINE</Label>
        <Input value={lineLink} onChange={(e) => setLineLink(e.target.value)} placeholder="https://line.me/R/ti/p/..." />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-[#f5a987] hover:bg-[#e09b7d] text-white">
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเพิ่มเติม'}
        </Button>
      </div>
    </div>
  );
}
