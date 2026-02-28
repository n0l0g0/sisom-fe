 'use client';

import { useEffect, useState } from 'react';
import { api, AutoSendConfig } from '@/services/api';
import { Settings, Clock, Calendar, Globe, Bell } from 'lucide-react';

export default function AutoSendSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const [config, setConfig] = useState<AutoSendConfig>({
    enabled: false,
    hour: 9,
    minute: 0,
    dayOfMonth: 25,
    timezone: 'Asia/Bangkok',
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getAutoSendConfig()
        .then(res => setConfig({
          enabled: res.enabled ?? false,
          hour: res.hour ?? 9,
          minute: res.minute ?? 0,
          dayOfMonth: res.dayOfMonth ?? 25,
          timezone: res.timezone || 'Asia/Bangkok',
        }))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      await api.setAutoSendConfig(config);
      setOpen(false);
    } catch (e) {
      alert((e as Error).message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700 hover:text-white transition-colors"
        title="ตั้งค่าการส่งบิลอัตโนมัติ"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h3 className="text-xl font-bold text-white">ตั้งค่าการส่งบิลอัตโนมัติ</h3>
            <p className="text-sm text-slate-400 mt-1">กำหนดวันและเวลาที่ระบบจะส่งบิลให้ผู้เช่า</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-10 text-center text-slate-400">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              กำลังโหลดข้อมูล...
            </div>
          ) : (
            <>
              {/* Enable Toggle */}
              <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white">เปิดใช้งานส่งบิลอัตโนมัติ</div>
                    <div className="text-xs text-slate-500">ระบบจะส่งบิลสถานะ "ร่าง" ให้อัตโนมัติ</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className={`space-y-6 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="grid grid-cols-2 gap-6">
                  {/* Day of Month */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      วันของเดือน
                    </label>
                    <select
                      value={config.dayOfMonth}
                      onChange={(e) => setConfig({ ...config, dayOfMonth: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>วันที่ {d}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">เลือกได้ 1-28 เพื่อรองรับทุกเดือน</p>
                  </div>

                  {/* Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      เวลาที่ส่ง
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={String(config.hour).padStart(2, '0')}
                          onChange={(e) => setConfig({ ...config, hour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"></span>
                      </div>
                      <span className="text-slate-500 font-bold">:</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={String(config.minute).padStart(2, '0')}
                          onChange={(e) => setConfig({ ...config, minute: Math.max(0, Math.min(59, Number(e.target.value))) })}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">ระบุเวลา 24 ชั่วโมง (เช่น 09:00)</p>
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    โซนเวลา
                  </label>
                  <select
                    value={config.timezone}
                    onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center">
          <button
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saveLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/20"
          >
            {saveLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  );
}
