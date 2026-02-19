'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, MaintenanceRequest, Room } from "@/services/api";
import { CreateMaintenanceDialog } from "./CreateMaintenanceDialog";
import MaintenanceStatusBadge from './MaintenanceStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function parseMoveOutDescription(description?: string) {
  const result: {
    waterImageUrl?: string;
    electricImageUrl?: string;
    tenantName?: string;
    phone?: string;
    otherLines: string[];
    isMoveOut: boolean;
  } = {
    otherLines: [],
    isMoveOut: false,
  };
  if (!description) return result;
  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.toUpperCase().startsWith('WATER_IMG:')) {
      const url = line.split(':').slice(1).join(':').trim();
      if (url) result.waterImageUrl = url;
      result.isMoveOut = true;
      continue;
    }
    if (line.toUpperCase().startsWith('ELECTRIC_IMG:')) {
      const url = line.split(':').slice(1).join(':').trim();
      if (url) result.electricImageUrl = url;
      result.isMoveOut = true;
      continue;
    }
    if (line.toUpperCase().startsWith('TENANT:')) {
      const value = line.split(':').slice(1).join(':').trim();
      if (value) result.tenantName = value;
      result.isMoveOut = true;
      continue;
    }
    if (line.toUpperCase().startsWith('PHONE:')) {
      const value = line.split(':').slice(1).join(':').trim();
      if (value) result.phone = value;
      result.isMoveOut = true;
      continue;
    }
    result.otherLines.push(line);
  }
  return result;
}

function parseMaintenanceDescription(description?: string) {
  const result: { textLines: string[]; images: string[] } = {
    textLines: [],
    images: [],
  };
  if (!description) return result;
  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^IMAGE\d*:/i.test(line)) {
      const url = line.split(':').slice(1).join(':').trim();
      if (url) result.images.push(url);
      continue;
    }
    const m = line.match(/https?:\/\/\S+/);
    if (m && /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(m[0])) {
      const url = m[0];
      result.images.push(url);
      const rest = line.replace(url, '').trim();
      if (rest) result.textLines.push(rest);
      continue;
    }
    result.textLines.push(line);
  }
  return result;
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#8b5a3c]">แจ้งซ่อม</h1>
              <p className="text-slate-500 text-sm mt-1">จัดการรายการแจ้งซ่อมและติดตามสถานะ</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-slate-500 text-center py-10">กำลังโหลด...</div>
          </div>
        </div>
      }
    >
      <MaintenancePageContent />
    </Suspense>
  );
}

function MaintenancePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') || '10');
    const allowed = [10, 20, 50, 100];
    return allowed.includes(raw) ? raw : 10;
  }, [searchParams]);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MOVE_OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [requestsRes, roomsRes] = await Promise.all([
          api.getMaintenanceRequests(),
          api.getRooms()
        ]);
        if (cancelled) return;
        setRequests(requestsRes);
        setRooms(roomsRes);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'PENDING'), [requests]);
  const inProgressRequests = useMemo(() => requests.filter(r => r.status === 'IN_PROGRESS'), [requests]);
  const completedRequests = useMemo(() => requests.filter(r => r.status === 'COMPLETED'), [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const roomNumber = String(r.room?.number || r.roomId || '').toLowerCase();
        const title = (r.title || '').toLowerCase();
        const reporter = (r.reportedBy || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return (
          roomNumber.includes(q) ||
          title.includes(q) ||
          reporter.includes(q) ||
          desc.includes(q)
        );
      });
    }
    if (filterMode === 'MOVE_OUT') {
      list = list.filter((r) => parseMoveOutDescription(r.description).isMoveOut);
    }
    return list;
  }, [requests, filterMode, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  }, [filteredRequests.length, pageSize]);

  useEffect(() => {
    if (loading) return;
    if (filteredRequests.length === 0) return;
    if (page <= totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(totalPages));
    router.replace(`/maintenance?${params.toString()}`);
  }, [loading, page, filteredRequests.length, router, searchParams, totalPages]);

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [page, pageSize, filteredRequests]);

  const currentRangeText = useMemo(() => {
    if (filteredRequests.length === 0) return '0-0 จาก 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, filteredRequests.length);
    return `${start}-${end} จาก ${filteredRequests.length}`;
  }, [page, pageSize, filteredRequests.length]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/maintenance?${params.toString()}`);
  };

  const setNextPageSize = (nextSize: number) => {
    const allowed = [10, 20, 50, 100];
    const size = allowed.includes(nextSize) ? nextSize : 10;
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(size));
    params.set('page', '1');
    router.push(`/maintenance?${params.toString()}`);
  };

  const handleStatusUpdate = async (id: string, newStatus: MaintenanceRequest['status']) => {
    try {
      setActionLoading(true);
      const updated = await api.updateMaintenanceRequest(id, { status: newStatus });
      setRequests(requests.map(r => r.id === id ? updated : r));
      router.refresh();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบรายการแจ้งซ่อมนี้ใช่หรือไม่?')) return;
    
    try {
      setActionLoading(true);
      await api.deleteMaintenanceRequest(id);
      setRequests(requests.filter(r => r.id !== id));
      router.refresh();
    } catch (error) {
      console.error('Failed to delete request:', error);
      alert('Failed to delete request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#8b5a3c]">แจ้งซ่อม</h1>
          <p className="text-slate-500 text-sm mt-1">จัดการรายการแจ้งซ่อมและติดตามสถานะ</p>
        </div>
        <CreateMaintenanceDialog rooms={rooms} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">รอดำเนินการ</p>
          <p className="text-2xl font-bold text-[#f5a987] mt-1">{pendingRequests.length} รายการ</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">กำลังดำเนินการ</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressRequests.length} รายการ</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
          <p className="text-sm text-slate-500">เสร็จสิ้น (เดือนนี้)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedRequests.length} รายการ</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 w-full md:w-80">
          <div className="text-sm text-slate-500">ค้นหา</div>
          <div className="mt-1 relative">
            <input
              type="text"
              placeholder="ค้นหาห้อง, เรื่อง, ผู้แจ้ง หรือรายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">
          {filterMode === 'MOVE_OUT' ? 'กำลังแสดงเฉพาะรายการแจ้งย้ายออก' : 'กำลังแสดงทุกรายการแจ้งซ่อม'}
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-full ${
              filterMode === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('MOVE_OUT')}
            className={`px-3 py-1 rounded-full ${
              filterMode === 'MOVE_OUT'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            แจ้งย้ายออก
          </button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-white/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">ตึก</th>
                    <th className="px-6 py-4">ห้อง</th>
                    <th className="px-6 py-4">เรื่อง</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4">ผู้แจ้ง</th>
                    <th className="px-6 py-4">วันที่แจ้ง</th>
                    <th className="px-6 py-4">วันที่เสร็จงาน</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        กำลังโหลด...
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        ไม่มีรายการแจ้งซ่อม
                      </td>
                    </tr>
                  ) : (
                    pagedRequests.map((request) => {
                      const roomFromList =
                        rooms.find(
                          (r) => r.id === (request.room?.id || request.roomId),
                        ) || request.room;
                      const buildingLabel =
                        roomFromList?.building?.name ||
                        roomFromList?.building?.code ||
                        '-';
                      return (
                        <tr
                          key={request.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-600">
                            {buildingLabel}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {roomFromList?.number || request.roomId}
                          </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{request.title}</div>
                          {request.description && (
                            <div className="text-slate-500 text-xs mt-0.5 truncate max-w-[200px]">
                              {request.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <MaintenanceStatusBadge status={request.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {request.reportedBy || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(request.createdAt || '').toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {request.status === 'COMPLETED' && request.resolvedAt
                            ? new Date(request.resolvedAt).toLocaleDateString('th-TH')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSelectedRequest(request)}
                            >
                              ดู
                            </Button>
                            <select
                              className="text-xs border rounded p-1 bg-white"
                              value={request.status}
                              onChange={(e) =>
                                handleStatusUpdate(
                                  request.id,
                                  e.target.value as MaintenanceRequest['status'],
                                )
                              }
                              disabled={actionLoading}
                            >
                              <option value="PENDING">รอดำเนินการ</option>
                              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                              <option value="COMPLETED">เสร็จสิ้น</option>
                              <option value="CANCELLED">ยกเลิก</option>
                            </select>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleDelete(request.id)}
                              disabled={actionLoading}
                            >
                              ลบ
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
            disabled={loading || filteredRequests.length === 0 || page === 1}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าแรก"
          >
            «
          </button>
          <button
            onClick={() => goToPage(page - 1)}
            disabled={loading || filteredRequests.length === 0 || page === 1}
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
            disabled={loading || filteredRequests.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="ถัดไป"
          >
            ›
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={loading || filteredRequests.length === 0 || page >= totalPages}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            title="หน้าสุดท้าย"
          >
            »
          </button>
        </div>
      </div>

      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRequest &&
            (() => {
              const roomFromList =
                rooms.find(
                  (r) => r.id === (selectedRequest.room?.id || selectedRequest.roomId),
                ) || selectedRequest.room;
              const buildingLabel =
                roomFromList?.building?.name ||
                roomFromList?.building?.code ||
                '';
              const roomLabel = roomFromList?.number || selectedRequest.roomId;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedRequest.title} -{' '}
                      {buildingLabel
                        ? `${buildingLabel} · ห้อง ${roomLabel}`
                        : `ห้อง ${roomLabel}`}
                    </DialogTitle>
                    <div className="text-sm text-slate-500 mt-1">
                      สถานะ:{' '}
                      <span className="font-medium">{selectedRequest.status}</span>{' '}
                      • วันที่แจ้ง:{' '}
                      {selectedRequest.createdAt
                        ? new Date(selectedRequest.createdAt).toLocaleString('th-TH')
                        : '-'}
                      {' • '}วันที่เสร็จงาน:{' '}
                      {selectedRequest.status === 'COMPLETED' && selectedRequest.resolvedAt
                        ? new Date(selectedRequest.resolvedAt).toLocaleString('th-TH')
                        : '-'}
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-1 text-sm">
                      <div className="text-slate-500">ห้อง</div>
                      <div className="font-medium">
                        {buildingLabel
                          ? `${buildingLabel} • ห้อง ${roomLabel}`
                          : `ห้อง ${roomLabel}`}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-slate-500">ผู้แจ้ง</div>
                      <div className="font-medium">
                        {selectedRequest.reportedBy || '-'}
                      </div>
                    </div>
                {(() => {
                  const parsed = parseMoveOutDescription(selectedRequest.description);
                  if (parsed.isMoveOut) {
                    return (
                      <div className="space-y-4">
                        <div className="space-y-1 text-sm">
                          <div className="text-slate-500">ข้อมูล</div>
                          <div className="font-medium">
                            ผู้เช่า: {parsed.tenantName || '-'}
                          </div>
                          <div className="font-medium">
                            เบอร์โทร: {parsed.phone || '-'}
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const roomId = selectedRequest.room?.id || selectedRequest.roomId;
                                if (!roomId) return;
                                router.push(`/contracts?roomId=${roomId}`);
                              }}
                            >
                              เปิดสัญญาเช่าของห้องนี้
                            </Button>
                          </div>
                          {parsed.otherLines.length > 0 && (
                            <div className="mt-2 text-slate-700 whitespace-pre-wrap text-sm">
                              {parsed.otherLines.join('\n')}
                            </div>
                          )}
                        </div>
                        {(parsed.waterImageUrl || parsed.electricImageUrl) && (
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-[#8b5a3c]">
                              รูปมิเตอร์
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {parsed.waterImageUrl && (
                                <a
                                  href={parsed.waterImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block border rounded-lg overflow-hidden bg-slate-50"
                                >
                                  <div className="text-xs font-medium px-3 py-2 text-slate-600">
                                    มิเตอร์น้ำ
                                  </div>
                                  <img
                                    src={parsed.waterImageUrl}
                                    alt="รูปมิเตอร์น้ำ"
                                    className="w-full object-contain max-h-80"
                                  />
                                </a>
                              )}
                              {parsed.electricImageUrl && (
                                <a
                                  href={parsed.electricImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block border rounded-lg overflow-hidden bg-slate-50"
                                >
                                  <div className="text-xs font-medium px-3 py-2 text-slate-600">
                                    มิเตอร์ไฟ
                                  </div>
                                  <img
                                    src={parsed.electricImageUrl}
                                    alt="รูปมิเตอร์ไฟ"
                                    className="w-full object-contain max-h-80"
                                  />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              คลิกที่รูปเพื่อเปิดดูขนาดเต็มในแท็บใหม่
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (selectedRequest.description) {
                    const parsed = parseMaintenanceDescription(
                      selectedRequest.description,
                    );
                    return (
                      <div className="space-y-4 text-sm">
                        <div>
                          <div className="text-slate-500">รายละเอียด</div>
                          <div className="whitespace-pre-wrap text-slate-700">
                            {parsed.textLines.length > 0
                              ? parsed.textLines.join('\n')
                              : selectedRequest.description}
                          </div>
                        </div>
                        {parsed.images.length > 0 && (
                          <div className="space-y-3">
                            <div className="text-sm font-semibold text-[#8b5a3c]">
                              รูปประกอบการแจ้งซ่อม
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {parsed.images.map((url, idx) => (
                                <a
                                  key={`${selectedRequest.id}-img-${idx}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block border rounded-lg overflow-hidden bg-slate-50"
                                >
                                  <img
                                    src={url}
                                    alt={`รูปแจ้งซ่อม ${idx + 1}`}
                                    className="w-full object-contain max-h-80"
                                  />
                                </a>
                              ))}
                            </div>
                            <div className="text-xs text-slate-500">
                              คลิกที่รูปเพื่อเปิดดูขนาดเต็มในแท็บใหม่
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
