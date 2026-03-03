'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, MaintenanceRequest, Room } from "@/services/api";
import MaintenanceStatusBadge from '../maintenance/MaintenanceStatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  CheckCircle2, 
  Clock, 
  MoreHorizontal, 
  Search, 
  Filter, 
  Trash2,
  Eye,
  Wrench,
  Timer,
  LogOut
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    if (line.toUpperCase() === 'TYPE: MOVE_OUT' || line.includes('แจ้งย้ายออก')) {
      result.isMoveOut = true;
      continue;
    }
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

export default function MoveOutPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-8 fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Move Out Requests</h1>
              <p className="text-muted-foreground mt-1">Manage and track tenant move-outs</p>
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border h-96 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      }
    >
      <MoveOutPageContent />
    </Suspense>
  );
}

function MoveOutPageContent() {
  const t = useTranslations('MoveOut');
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number(searchParams.get('page') || '1');
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const pageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') || '10');
    const allowed = [10, 20, 30, 40, 50, 100];
    return allowed.includes(raw) ? raw : 10;
  }, [searchParams]);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
        setError((e as Error).message || 'Failed to load data');
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

  const filteredRequests = useMemo(() => {
    let list = requests.filter((r) => {
        const parsed = parseMoveOutDescription(r.description);
        return parsed.isMoveOut || r.title?.includes('ย้ายออก');
    });

    const q = searchQuery.trim().toLowerCase();
    
    // Search Filter
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

    // Status Filter
    if (statusFilter !== 'ALL') {
      list = list.filter(r => r.status === statusFilter);
    }

    return list;
  }, [requests, searchQuery, statusFilter]);

  const pendingRequests = useMemo(() => filteredRequests.filter(r => r.status === 'PENDING'), [filteredRequests]);
  const inProgressRequests = useMemo(() => filteredRequests.filter(r => r.status === 'IN_PROGRESS'), [filteredRequests]);
  const completedRequests = useMemo(() => filteredRequests.filter(r => r.status === 'COMPLETED'), [filteredRequests]);
  
  const avgResolutionTime = useMemo(() => {
    const resolved = filteredRequests.filter(r => r.status === 'COMPLETED' && r.resolvedAt && r.createdAt);
    if (resolved.length === 0) return '0h';
    return '24h'; 
  }, [filteredRequests]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  }, [filteredRequests.length, pageSize]);

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [page, pageSize, filteredRequests]);

  const goToPage = (nextPage: number) => {
    const p = Math.max(1, Math.min(totalPages, Math.floor(nextPage)));
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/move-out?${params.toString()}`);
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
    if (!confirm('Are you sure you want to delete this request?')) return;
    
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

  const getBorderColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'border-l-amber-500';
      case 'IN_PROGRESS': return 'border-l-blue-500';
      case 'COMPLETED': return 'border-l-emerald-500';
      default: return 'border-l-transparent';
    }
  };

  return (
    <div className="p-8 space-y-8 fade-in bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="รอดำเนินการ" 
          value={pendingRequests.length} 
          icon={Clock}
          color="amber"
          description="รอตรวจสอบ"
        />
        <StatCard 
          title="กำลังดำเนินการ" 
          value={inProgressRequests.length} 
          icon={LogOut}
          color="blue"
          description="กำลังตรวจสอบ"
        />
        <StatCard 
          title="เสร็จสิ้น" 
          value={completedRequests.length} 
          icon={CheckCircle2}
          color="emerald"
          description="ย้ายออกสำเร็จ"
        />
        <StatCard 
          title="เวลาเฉลี่ย" 
          value={avgResolutionTime} 
          icon={Timer}
          color="violet"
          description="เวลาในการดำเนินการ"
        />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">ตัวกรอง:</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทุกสถานะ</SelectItem>
              <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
              <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
              <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ค้นหารายการ..." 
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Requests Table */}
      <Card className="border shadow-sm overflow-hidden bg-transparent border-0 shadow-none md:bg-card md:border md:shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <Table>
              <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[80px]">รหัส</TableHead>
                <TableHead className="w-[120px]">ตึก/อาคาร</TableHead>
                <TableHead className="w-[100px]">ห้อง</TableHead>
                <TableHead className="w-[300px]">ผู้เช่า</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>วันที่แจ้ง</TableHead>
                <TableHead>วันที่เสร็จ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64">
                    <EmptyState 
                      icon={LogOut}
                      title="ไม่พบรายการแจ้งย้ายออก"
                      description="ยังไม่มีการแจ้งย้ายออกเข้ามา"
                      actionLabel=""
                      onAction={() => {}}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedRequests.map((request) => {
                  const roomFromList = rooms.find((r) => r.id === (request.room?.id || request.roomId)) || request.room;
                  const roomLabel = roomFromList?.number || request.roomId;
                  const buildingLabel = roomFromList?.building?.name || roomFromList?.building?.code || '-';
                  const parsed = parseMoveOutDescription(request.description);
                  
                  return (
                    <TableRow 
                      key={request.id} 
                      className={`group hover:bg-muted/30 border-l-4 ${getBorderColor(request.status)}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{request.id.substring(0, 6)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{buildingLabel}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background">
                          {roomLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 max-w-[300px]">
                          <span className="font-medium text-foreground truncate">{parsed.tenantName || request.reportedBy || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MaintenanceStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                            {parsed.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {request.resolvedAt ? new Date(request.resolvedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                              <Eye className="mr-2 h-4 w-4" /> ดูรายละเอียด
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>เปลี่ยนสถานะ</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(request.id, 'PENDING')}>
                              <Clock className="mr-2 h-4 w-4" /> รอดำเนินการ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(request.id, 'IN_PROGRESS')}>
                              <LogOut className="mr-2 h-4 w-4" /> กำลังตรวจสอบ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(request.id, 'COMPLETED')}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> เสร็จสิ้น
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(request.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> ลบรายการ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        {filteredRequests.length > 0 && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              แสดง {((page - 1) * pageSize) + 1} ถึง {Math.min(page * pageSize, filteredRequests.length)} จาก {filteredRequests.length} รายการ
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('pageSize', v);
                params.set('page', '1');
                router.push(`/move-out?${params.toString()}`);
              }}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="แสดง/หน้า" />
                </SelectTrigger>
                <SelectContent>
                  {[10,20,30,40,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} รายการ/หน้า</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
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
              const parsed = parseMoveOutDescription(selectedRequest.description);

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      รายละเอียดการแจ้งย้ายออก
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <MaintenanceStatusBadge status={selectedRequest.status} />
                      <span className="text-sm text-muted-foreground">
                        {buildingLabel ? `${buildingLabel} · ห้อง ${roomLabel}` : `ห้อง ${roomLabel}`}
                      </span>
                    </div>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/10">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">ผู้เช่า</div>
                        <div className="font-medium text-sm">{parsed.tenantName || selectedRequest.reportedBy || 'ไม่ระบุ'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">เบอร์โทร</div>
                        <div className="font-medium text-sm">{parsed.phone || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">วันที่แจ้ง</div>
                        <div className="font-medium text-sm">
                          {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">วันที่เสร็จ</div>
                        <div className="font-medium text-sm">
                          {selectedRequest.resolvedAt ? new Date(selectedRequest.resolvedAt).toLocaleString() : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Description & Content */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">ข้อมูลมิเตอร์ & อื่นๆ</h3>
                      <div className="space-y-4">
                          {parsed.otherLines.length > 0 && (
                            <div className="text-sm text-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                              {parsed.otherLines.join('\n')}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const roomId = selectedRequest.room?.id || selectedRequest.roomId;
                                if (!roomId) return;
                                router.push(`/contracts?roomId=${roomId}`);
                              }}
                            >
                              ดูสัญญาเช่า
                            </Button>
                          </div>

                          {(parsed.waterImageUrl || parsed.electricImageUrl) && (
                            <div className="space-y-3">
                              <div className="text-sm font-medium">รูปมิเตอร์</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parsed.waterImageUrl && (
                                  <a href={parsed.waterImageUrl} target="_blank" rel="noreferrer" className="block border rounded-lg overflow-hidden bg-muted/20 hover:opacity-90 transition-opacity">
                                    <div className="text-xs font-medium px-3 py-2 text-muted-foreground border-b bg-muted/10">มิเตอร์น้ำ</div>
                                    <img src={parsed.waterImageUrl} alt="Water Meter" className="w-full object-contain max-h-60" />
                                  </a>
                                )}
                                {parsed.electricImageUrl && (
                                  <a href={parsed.electricImageUrl} target="_blank" rel="noreferrer" className="block border rounded-lg overflow-hidden bg-muted/20 hover:opacity-90 transition-opacity">
                                    <div className="text-xs font-medium px-3 py-2 text-muted-foreground border-b bg-muted/10">มิเตอร์ไฟ</div>
                                    <img src={parsed.electricImageUrl} alt="Electric Meter" className="w-full object-contain max-h-60" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}