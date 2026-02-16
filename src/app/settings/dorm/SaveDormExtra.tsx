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
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-200">
        <span className="text-3xl">🖼️</span>
        <div className="text-xl font-semibold text-amber-900">Logo หอพัก</div>
      </div>
      <div className="mb-2">
        <div className="min-h-[150px] flex items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40">
          {logoPreview ? (
            <img src={logoPreview} alt="logo preview" className="max-h-[150px] w-auto object-contain" />
          ) : (
            <div className="text-center w-full">
              <span className="text-5xl block mb-2">📸</span>
              <p className="text-sm text-amber-700">คลิกเพื่ออัพโหลด Logo</p>
            </div>
          )}
        </div>
      </div>
      <label className="inline-block bg-gradient-to-br from-amber-400 to-amber-600 text-white px-4 py-2 rounded-xl shadow hover:brightness-110 cursor-pointer">
        เลือกรูป Logo
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>ลิงก์ Google Map</Label>
          <Input
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="rounded-2xl border-amber-200"
          />
        </div>
        <div className="space-y-2">
          <Label>ลิงก์ LINE</Label>
          <Input
            value={lineLink}
            onChange={(e) => setLineLink(e.target.value)}
            placeholder="https://line.me/R/ti/p/..."
            className="rounded-2xl border-amber-200"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-[#f5a987] hover:bg-[#e09b7d] text-white rounded-2xl px-6">
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเพิ่มเติม'}
        </Button>
      </div>
    </div>
  );
}
