'use client'
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";

export const dynamic = 'force-dynamic';

export default function BackupSettingsPage() {
  const [hour, setHour] = useState<number>(3);
  const [minute, setMinute] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [files, setFiles] = useState<Array<{ name: string; size: number; mtime: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await api.getBackupSchedule();
        setHour(Number(s.hour || 3));
        setMinute(Number(s.minute || 0));
      } catch {}
      try {
        const list = await api.listBackups();
        setFiles(list);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.setBackupSchedule(hour, minute);
      setMessage("บันทึกเวลาสำรองข้อมูลสำเร็จ");
    } catch {
      setMessage("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setMessage("");
    try {
      const res = await api.runBackupNow();
      if (res?.ok) {
        const list = await api.listBackups();
        setFiles(list);
        setMessage("สำรองข้อมูลเรียบร้อย");
      } else {
        setMessage("สำรองข้อมูลไม่สำเร็จ");
      }
    } catch {
      setMessage("สำรองข้อมูลไม่สำเร็จ");
    } finally {
      setRunning(false);
    }
  };

  const remove = async (name: string) => {
    if (!confirm(`ลบไฟล์ ${name} แบบถาวรใช่หรือไม่?`)) return;
    try {
      await api.deleteBackup(name);
      const list = await api.listBackups();
      setFiles(list);
    } catch {}
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-200">
          <span className="text-2xl">💾</span>
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-blue-900">สำรองฐานข้อมูล</h1>
          <p className="text-blue-700 text-sm">ตั้งเวลาทำงาน และดาวน์โหลดไฟล์สำรอง</p>
        </div>
      </div>

      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ตั้งเวลาทำงาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-700 mb-1">ชั่วโมง</div>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 bg-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{`${h}`.padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">นาที</div>
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 bg-white"
              >
                {Array.from({ length: 60 }, (_, m) => (
                  <option key={m} value={m}>{`${m}`.padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button disabled={saving} onClick={save} className="rounded-lg bg-blue-600 hover:bg-blue-700">
                บันทึกเวลา
              </Button>
              <Button disabled={running} variant="outline" onClick={runNow} className="rounded-lg border-blue-300">
                สำรองตอนนี้
              </Button>
            </div>
          </div>
          {message ? <div className="text-sm text-blue-700">{message}</div> : null}
        </CardContent>
      </Card>

      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ไฟล์สำรองล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-4 text-center">กำลังโหลด...</div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center text-slate-600">ยังไม่มีไฟล์สำรอง</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left">ไฟล์</th>
                    <th className="px-3 py-2 text-left">วันเวลา</th>
                    <th className="px-3 py-2 text-right">ขนาด</th>
                    <th className="px-3 py-2">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.name} className="border-t">
                      <td className="px-3 py-2">{f.name}</td>
                      <td className="px-3 py-2">{new Date(f.mtime).toLocaleString('th-TH')}</td>
                      <td className="px-3 py-2 text-right">
                        {(f.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" onClick={() => api.downloadBackup(f.name)}>ดาวน์โหลด</Button>
                          <Button variant="destructive" onClick={() => remove(f.name)}>ลบ</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
