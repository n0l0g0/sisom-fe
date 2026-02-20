'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

type ActivityItem = {
  timestamp: string;
  userId?: string;
  username?: string;
  action: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  details?: any;
};

export default function ActivityLogsPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await api.getActivityLogs(500);
        setItems(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Activity Logs</h1>
      {loading ? (
        <div>กำลังโหลด...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">เวลา</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้ใช้</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">การกระทำ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">เมนู/เส้นทาง</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ประเภทข้อมูล</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((it, idx) => (
                <tr key={`${it.timestamp}-${idx}`}>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {new Date(it.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {it.username || it.userId || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">{it.action}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.path || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.entityType || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{it.entityId || '-'}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(it.details || {}, null, 2)}</pre>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
