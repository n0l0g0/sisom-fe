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
  CheckCircle2,
  Cloud,
  CloudUpload,
  Link2,
  Link2Off,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BackupFile {
  name: string;
  size: number;
  mtime: string;
}

interface DriveConfig {
  folderId: string;
  autoUpload: boolean;
  connected: boolean;
}

export default function BackupSettingsPage() {
  const [hour, setHour] = useState<number>(3);
  const [minute, setMinute] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Google Drive state
  const [driveConfig, setDriveConfig] = useState<DriveConfig>({ folderId: '', autoUpload: false, connected: false });
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveAutoUpload, setDriveAutoUpload] = useState(false);
  const [driveCredentials, setDriveCredentials] = useState('');
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveMessage, setDriveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedule, backupFiles, driveCfg] = await Promise.all([
        api.getBackupSchedule().catch(() => ({ hour: 3, minute: 0 })),
        api.listBackups().catch(() => []),
        api.getGoogleDriveConfig().catch(() => ({ folderId: '', autoUpload: false, connected: false })),
      ]);
      setHour(Number(schedule.hour || 3));
      setMinute(Number(schedule.minute || 0));
      setFiles(backupFiles);
      setDriveConfig(driveCfg);
      setDriveFolderId(driveCfg.folderId);
      setDriveAutoUpload(driveCfg.autoUpload);
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

  const uploadToDrive = async (name: string) => {
    setUploadingFile(name);
    try {
      const res = await api.uploadBackupToDrive(name);
      if (res.ok) {
        if (res.webViewLink) {
          window.open(res.webViewLink, '_blank');
        }
        setDriveMessage({ type: 'success', text: `อัปโหลด ${name} ไป Google Drive สำเร็จ` });
      } else {
        setDriveMessage({ type: 'error', text: res.error || 'อัปโหลดไม่สำเร็จ' });
      }
    } catch {
      setDriveMessage({ type: 'error', text: 'อัปโหลดไม่สำเร็จ' });
    } finally {
      setUploadingFile(null);
      setTimeout(() => setDriveMessage(null), 5000);
    }
  };

  const saveDriveConfig = async () => {
    setDriveSaving(true);
    setDriveMessage(null);
    try {
      let credentials: object | null | undefined = undefined;
      if (driveCredentials.trim()) {
        try {
          credentials = JSON.parse(driveCredentials.trim());
        } catch {
          setDriveMessage({ type: 'error', text: 'Service Account JSON ไม่ถูกต้อง' });
          setDriveSaving(false);
          return;
        }
      }
      const cfg = await api.setGoogleDriveConfig({
        folderId: driveFolderId.trim(),
        autoUpload: driveAutoUpload,
        credentials,
      });
      setDriveConfig(cfg);
      setDriveCredentials('');
      setShowCredentials(false);
      setDriveMessage({ type: 'success', text: 'บันทึกการตั้งค่า Google Drive สำเร็จ' });
      setTimeout(() => setDriveMessage(null), 3000);
    } catch {
      setDriveMessage({ type: 'error', text: 'บันทึกไม่สำเร็จ' });
    } finally {
      setDriveSaving(false);
    }
  };

  const disconnectDrive = async () => {
    if (!confirm('ยืนยันการยกเลิกการเชื่อมต่อ Google Drive ?')) return;
    try {
      await api.removeGoogleDriveConfig();
      setDriveConfig({ folderId: '', autoUpload: false, connected: false });
      setDriveFolderId('');
      setDriveAutoUpload(false);
      setDriveCredentials('');
      setDriveMessage({ type: 'success', text: 'ยกเลิกการเชื่อมต่อสำเร็จ' });
      setTimeout(() => setDriveMessage(null), 3000);
    } catch {
      setDriveMessage({ type: 'error', text: 'ยกเลิกการเชื่อมต่อไม่สำเร็จ' });
    }
  };

  const testDriveConnection = async () => {
    setDriveTesting(true);
    setDriveMessage(null);
    try {
      const res = await api.testGoogleDriveConnection();
      if (res.ok) {
        setDriveMessage({ type: 'success', text: `เชื่อมต่อสำเร็จ: ${res.email}` });
      } else {
        setDriveMessage({ type: 'error', text: res.error || 'เชื่อมต่อไม่สำเร็จ' });
      }
    } catch {
      setDriveMessage({ type: 'error', text: 'ทดสอบการเชื่อมต่อไม่สำเร็จ' });
    } finally {
      setDriveTesting(false);
      setTimeout(() => setDriveMessage(null), 5000);
    }
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

      {/* Schedule Settings Card */}
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

      {/* Google Drive Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Google Drive</CardTitle>
            </div>
            {driveConfig.connected && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                เชื่อมต่อแล้ว
              </span>
            )}
          </div>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            เชื่อมต่อ Google Drive เพื่ออัปโหลดไฟล์สำรองขึ้น Cloud อัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {/* How to guide */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">วิธีตั้งค่า:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>ไปที่ <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a> → สร้าง Service Account</li>
              <li>สร้าง Key (JSON) แล้วคัดลอกเนื้อหาทั้งหมด</li>
              <li>สร้าง Folder ใน Google Drive แล้ว Share ให้ Service Account email</li>
              <li>คัดลอก Folder ID จาก URL (ส่วนท้ายหลัง /folders/)</li>
            </ol>
          </div>

          <div className="grid gap-4">
            {/* Folder ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Google Drive Folder ID
              </label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>

            {/* Service Account JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Service Account JSON {driveConfig.connected && !showCredentials && <span className="text-emerald-500 font-normal">(บันทึกแล้ว)</span>}
                </label>
                {driveConfig.connected && (
                  <button
                    type="button"
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {showCredentials ? 'ซ่อน' : 'อัปเดต credentials'}
                  </button>
                )}
              </div>
              {(!driveConfig.connected || showCredentials) && (
                <textarea
                  value={driveCredentials}
                  onChange={(e) => setDriveCredentials(e.target.value)}
                  placeholder={'วาง Service Account JSON ที่นี่\n{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              )}
            </div>

            {/* Auto upload toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={driveAutoUpload}
                  onChange={(e) => setDriveAutoUpload(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${driveAutoUpload ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${driveAutoUpload ? 'translate-x-5' : ''}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">อัปโหลดอัตโนมัติหลัง backup</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">เมื่อ backup เสร็จ ระบบจะส่งไฟล์ไป Google Drive โดยอัตโนมัติ</p>
              </div>
            </label>
          </div>

          {driveMessage && (
            <div className={`p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${
              driveMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
            }`}>
              {driveMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              {driveMessage.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={saveDriveConfig}
              disabled={driveSaving}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              {driveSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />กำลังบันทึก...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="w-4 h-4" />บันทึกการตั้งค่า</span>
              )}
            </Button>
            {driveConfig.connected && (
              <>
                <Button
                  onClick={testDriveConnection}
                  disabled={driveTesting}
                  variant="outline"
                  className="h-10 px-5 border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {driveTesting ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />กำลังทดสอบ...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Link2 className="w-4 h-4" />ทดสอบการเชื่อมต่อ</span>
                  )}
                </Button>
                <Button
                  onClick={disconnectDrive}
                  variant="ghost"
                  className="h-10 px-5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                >
                  <Link2Off className="w-4 h-4 mr-2" />
                  ยกเลิกการเชื่อมต่อ
                </Button>
              </>
            )}
          </div>
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
                <p className="text-sm mt-1">กดปุ่ม &quot;สำรองตอนนี้&quot; เพื่อสร้างไฟล์สำรองแรก</p>
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
                          {driveConfig.connected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => uploadToDrive(f.name)}
                              disabled={uploadingFile === f.name}
                              className="h-9 px-3 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              {uploadingFile === f.name ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  กำลังอัปโหลด...
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <CloudUpload className="w-3.5 h-3.5" />
                                  Drive
                                </span>
                              )}
                            </Button>
                          )}
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

      {/* Drive upload feedback at page bottom */}
      {driveMessage && uploadingFile === null && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium border ${
          driveMessage.type === 'success'
            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        }`}>
          {driveMessage.type === 'success' ? <ExternalLink className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {driveMessage.text}
        </div>
      )}
    </div>
  );
}
