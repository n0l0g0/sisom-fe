'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  User,
  MousePointer2,
  FileJson,
  Layout,
  Database,
  Hash
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
    if (!start && !end && !appliedStart && !appliedEnd) {
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startStr = toYMD(prevMonthStart);
      const endStr = toYMD(now);
      setStart(startStr);
      setEnd(endStr);
      setAppliedStart(startStr);
      setAppliedEnd(endStr);
      setPage(1);
    }
  }, []);

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

  const handleSearch = () => {
    setAppliedUser(userQuery.trim());
    setAppliedAction(action.trim());
    setAppliedStart(start.trim());
    setAppliedEnd(end.trim());
    setPage(1);
  };

  const handleReset = () => {
    setUserQuery('');
    setAction('');
    setStart('');
    setEnd('');
    setAppliedUser('');
    setAppliedAction('');
    setAppliedStart('');
    setAppliedEnd('');
    setPage(1);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
      case 'UPDATE': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700';
      case 'DELETE': return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700';
      case 'LOGIN': return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-8 fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">บันทึกกิจกรรม</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ประวัติการใช้งานระบบของผู้ดูแล</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">ค้นหาผู้ใช้</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Username หรือ ID..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">การกระทำ</label>
            <div className="relative">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="">ทุกการกระทำ</option>
                <option value="CLICK">CLICK</option>
                <option value="VIEW">VIEW</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
              </select>
              <MousePointer2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">ช่วงเวลา</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            ล้างค่า
          </button>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Search className="w-4 h-4" />
            ค้นหา
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">เวลา</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">ผู้ใช้</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">การกระทำ</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">เส้นทาง/เมนู</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">ประเภทข้อมูล</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      กำลังโหลดข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="w-8 h-8 opacity-50" />
                      ไม่พบข้อมูลกิจกรรม
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={`${it.timestamp}-${idx}`} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {new Date(it.timestamp).toLocaleDateString('th-TH')}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(it.timestamp).toLocaleTimeString('th-TH')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                          <User className="w-3 h-3" />
                        </div>
                        {it.username || it.userId || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={`${getActionBadgeColor(it.action)} font-mono`}>
                        {it.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Layout className="w-3 h-3 text-slate-400" />
                        {it.path || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Database className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{it.entityType || '-'}</span>
                        </div>
                        {it.entityId && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Hash className="w-3 h-3" />
                            <span className="font-mono">{it.entityId}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                      <details className="group cursor-pointer">
                        <summary className="list-none flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                          <FileJson className="w-3 h-3" />
                          <span>ดู JSON</span>
                        </summary>
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                          <pre className="font-mono">{JSON.stringify(it.details || {}, null, 2)}</pre>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>แสดง</span>
            <select
              value={pageSize}
              onChange={(e) => setNextPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>รายการ ({currentRangeText})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={loading || total === 0 || page === 1}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
              <span className="sr-only">First</span>
              «
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={loading || total === 0 || page === 1}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-4 text-sm font-medium text-slate-900 dark:text-white">
              หน้า {Math.min(page, totalPages)} / {totalPages}
            </div>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={loading || total === 0 || page >= totalPages}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={loading || total === 0 || page >= totalPages}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
              <span className="sr-only">Last</span>
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
