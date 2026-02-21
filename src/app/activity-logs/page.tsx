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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [userQuery, setUserQuery] = useState('');
  const [action, setAction] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await api.getActivityLogsPaged({
          page,
          pageSize,
          user: userQuery || undefined,
          action: action || undefined,
          start: start || undefined,
          end: end || undefined,
        });
        setItems(data.items as ActivityItem[]);
        setTotal(data.total || 0);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [page, pageSize, userQuery, action, start, end]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Activity Logs</h1>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="ค้นหาผู้ใช้ (username หรือ userId)"
          value={userQuery}
          onChange={(e) => { setPage(1); setUserQuery(e.target.value); }}
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={action}
          onChange={(e) => { setPage(1); setAction(e.target.value); }}
        >
          <option value="">ทุกการกระทำ</option>
          <option value="CLICK">CLICK</option>
          <option value="VIEW">VIEW</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={start}
          onChange={(e) => { setPage(1); setStart(e.target.value); }}
        />
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={end}
          onChange={(e) => { setPage(1); setEnd(e.target.value); }}
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={pageSize}
          onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
        >
          <option value={20}>20 ต่อหน้า</option>
          <option value={50}>50 ต่อหน้า</option>
          <option value={100}>100 ต่อหน้า</option>
        </select>
      </div>
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
          <div className="flex items-center justify-between px-4 py-2">
            <div className="text-sm text-gray-600">
              ทั้งหมด {total} รายการ
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ก่อนหน้า
              </button>
              <span className="text-sm">หน้า {page}</span>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                onClick={() => {
                  const maxPage = Math.max(1, Math.ceil(total / pageSize));
                  setPage((p) => Math.min(maxPage, p + 1));
                }}
                disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
