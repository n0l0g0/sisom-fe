'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Save, 
  Play, 
  Download, 
  Trash2, 
  Clock, 
  HardDrive, 
  FileClock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BackupFile {
  name: string;
  size: number;
  mtime: string;
}

export default function BackupSettingsPage() {
  const [hour, setHour] = useState<number>(3);
  const [minute, setMinute] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedule, backupFiles] = await Promise.all([
        api.getBackupSchedule().catch(() => ({ hour: 3, minute: 0 })),
        api.listBackups().catch(() => [])
      ]);
      setHour(Number(schedule.hour || 3));
      setMinute(Number(schedule.minute || 0));
      setFiles(backupFiles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSchedule = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.setBackupSchedule(hour, minute);
      setMessage({ type: 'success', text: 'บันทึกเวลาสำรองข้อมูลสำเร็จ' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'บันทึกไม่สำเร็จ' });
    } finally {
      setSaving(false);
    }
  };

  const runBackupNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await api.runBackupNow();
      if (res?.ok) {
        const list = await api.listBackups();
        setFiles(list);
        setMessage({ type: 'success', text: 'สำรองข้อมูลเรียบร้อย' });
      } else {
        setMessage({ type: 'error', text: 'สำรองข้อมูลไม่สำเร็จ' });
      }
    } catch {
      setMessage({ type: 'error', text: 'สำรองข้อมูลไม่สำเร็จ' });
    } finally {
      setRunning(false);
    }
  };

  const deleteBackup = async (name: string) => {
    if (!confirm(`ยืนยันการลบไฟล์สำรอง ${name} ?`)) return;
    try {
      await api.deleteBackup(name);
      const list = await api.listBackups();
      setFiles(list);
    } catch {
      alert('ลบไฟล์ไม่สำเร็จ');
    }
  };

  const downloadBackup = (name: string) => {
    api.downloadBackup(name);
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">สำรองฐานข้อมูล</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">จัดการการสำรองข้อมูลอัตโนมัติและไฟล์สำรอง</p>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">ตั้งเวลาทำงานอัตโนมัติ</CardTitle>
          </div>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            ระบบจะทำการสำรองข้อมูลอัตโนมัติทุกวันตามเวลาที่กำหนด
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">เวลา (นาฬิกา)</label>
                <div className="relative">
                  <select
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="w-full h-11 pl-4 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none transition-all"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{`${h}`.padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">นาที</label>
                <div className="relative">
                  <select
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="w-full h-11 pl-4 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none transition-all"
                  >
                    {Array.from({ length: 60 }, (_, m) => (
                      <option key={m} value={m}>{`${m}`.padStart(2, '0')}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <Button 
                onClick={saveSchedule} 
                disabled={saving}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    บันทึกเวลา
                  </span>
                )}
              </Button>
              <Button 
                onClick={runBackupNow} 
                disabled={running}
                variant="outline"
                className="h-11 px-6 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
              >
                {running ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
                    กำลังสำรองข้อมูล...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    สำรองตอนนี้
                  </span>
                )}
              </Button>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-500" />
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">ไฟล์สำรองล่าสุด</CardTitle>
            </div>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {files.length} ไฟล์
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin" />
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <FileClock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">ยังไม่มีไฟล์สำรอง</p>
                <p className="text-sm mt-1">กดปุ่ม "สำรองตอนนี้" เพื่อสร้างไฟล์สำรองแรก</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4 font-medium">ชื่อไฟล์</th>
                    <th className="px-6 py-4 font-medium">วันเวลาที่สร้าง</th>
                    <th className="px-6 py-4 font-medium text-right">ขนาดไฟล์</th>
                    <th className="px-6 py-4 font-medium text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {files.map((f) => (
                    <tr key={f.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Database className="w-4 h-4" />
                          </div>
                          {f.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(f.mtime)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                        {formatSize(f.size)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadBackup(f.name)}
                            className="h-9 px-3 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <Download className="w-4 h-4 mr-1.5" />
                            ดาวน์โหลด
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteBackup(f.name)}
                            className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
