'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { DateRangeInput } from '@/components/ui/date-range';

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
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [userQuery, setUserQuery] = useState('');
  const [action, setAction] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [appliedUser, setAppliedUser] = useState('');
  const [appliedAction, setAppliedAction] = useState<string>('');
  const [appliedStart, setAppliedStart] = useState<string>('');
  const [appliedEnd, setAppliedEnd] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await api.getActivityLogsPaged({
          page,
          pageSize,
          user: appliedUser || undefined,
          action: appliedAction || undefined,
          start: appliedStart || undefined,
          end: appliedEnd || undefined,
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
  }, [page, pageSize, appliedUser, appliedAction, appliedStart, appliedEnd]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);
  const currentRangeText = useMemo(() => {
    if (total === 0) return '0-0 จาก 0';
    const startIdx = (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, total);
    return `${startIdx}-${endIdx} จาก ${total}`;
  }, [page, pageSize, total]);
  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    setPage(p);
  };
  const setNextPageSize = (nextSize: number) => {
    const allowed = [10, 20, 50, 100];
    const size = allowed.includes(nextSize) ? nextSize : 10;
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">บันทึกกิจกรรม</h1>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="ค้นหาผู้ใช้ (username หรือ userId)"
          value={userQuery}
          onChange={(e) => { setUserQuery(e.target.value); }}
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={action}
          onChange={(e) => { setAction(e.target.value); }}
        >
          <option value="">ทุกการกระทำ</option>
          <option value="CLICK">CLICK</option>
          <option value="VIEW">VIEW</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <DateRangeInput
          className="md:col-span-2"
          value={{ start, end }}
          onChange={(v) => {
            setStart(v.start || '');
            setEnd(v.end || '');
          }}
        />
        <button
          type="button"
          onClick={() => { 
            setAppliedUser(userQuery.trim()); 
            setAppliedAction(action.trim());
            setAppliedStart(start.trim());
            setAppliedEnd(end.trim());
            setPage(1);
          }}
          className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50"
        >
          ค้นหา
        </button>
        <button
          type="button"
          onClick={() => { 
            setUserQuery(''); setAction(''); setStart(''); setEnd(''); 
            setAppliedUser(''); setAppliedAction(''); setAppliedStart(''); setAppliedEnd('');
            setPage(1); 
          }}
          className="px-3 py-2 border rounded text-sm bg-white hover:bg-slate-50"
        >
          ล้างค่า filter
        </button>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">แสดง</div>
              <select
                value={pageSize}
                onChange={(e) => setNextPageSize(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className="text-sm text-slate-600">รายการต่อหน้า</div>
              <div className="text-sm text-slate-500">{currentRangeText}</div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => goToPage(1)}
                disabled={loading || total === 0 || page === 1}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
                title="หน้าแรก"
              >
                «
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={loading || total === 0 || page === 1}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
                title="ก่อนหน้า"
              >
                ‹
              </button>
              <div className="text-sm text-slate-700 px-2">
                หน้า {Math.min(page, totalPages)} / {totalPages}
              </div>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={loading || total === 0 || page >= totalPages}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
                title="ถัดไป"
              >
                ›
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={loading || total === 0 || page >= totalPages}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
                title="หน้าสุดท้าย"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
