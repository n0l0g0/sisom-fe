'use client';

import { useState } from 'react';
import { api, Invoice } from '@/services/api';
import { useRouter } from 'next/navigation';
import SendAllProgressDialog, { RoomProgress } from './SendAllProgressDialog';
import { Download, Send, FileText, Printer, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface BillsHeaderActionsProps {
  selectedMonthKey: string | null;
  invoices: Invoice[];
}

export default function BillsHeaderActions({ selectedMonthKey, invoices }: BillsHeaderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [roomStatuses, setRoomStatuses] = useState<RoomProgress[]>([]);

  const handlePrintAll = () => {
    if (!selectedMonthKey) return;
    const [y, m] = selectedMonthKey.split('-');
    const year = Number(y);
    const month = Number(m);

    // Filter invoices for the selected month
    const targets = invoices
      .filter((inv) => inv.year === year && inv.month === month && inv.status !== 'CANCELLED')
      .map((inv) => inv.id);

    if (targets.length === 0) {
      alert('ไม่พบบิลในเดือนที่เลือก');
      return;
    }

    const key = `print_ids_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(targets));
    
    const url = `/bills/print-all?key=${key}`;
    window.open(url, '_blank');
  };

  const handlePrintByBuilding = (buildingId: string | null) => {
    if (!selectedMonthKey) return;
    const [y, m] = selectedMonthKey.split('-');
    const year = Number(y);
    const month = Number(m);

    const targets = invoices
      .filter((inv) => {
        if (inv.year !== year || inv.month !== month || inv.status === 'CANCELLED') return false;
        const bId = inv.contract?.room?.building?.id || null;
        return bId === buildingId;
      })
      .map((inv) => inv.id);

    if (targets.length === 0) {
      alert('ไม่พบบิลในตึกที่เลือก');
      return;
    }

    const key = `print_ids_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(targets));
    
    const url = `/bills/print-all?key=${key}`;
    window.open(url, '_blank');
  };

  // Extract buildings for the selected month
  const buildings = (() => {
    if (!selectedMonthKey) return [];
    const [y, m] = selectedMonthKey.split('-');
    const year = Number(y);
    const month = Number(m);
    
    const map = new Map<string, { id: string; name: string }>();
    const hasNoBuilding = false; // logic to check if there are rooms without building
    
    invoices.forEach(inv => {
      if (inv.year === year && inv.month === month && inv.status !== 'CANCELLED') {
        const b = inv.contract?.room?.building;
        if (b) {
          map.set(b.id, { id: b.id, name: b.name || b.code || 'ไม่ระบุชื่อ' });
        }
      }
    });
    
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const sendAll = async () => {
    if (!selectedMonthKey || loading) return;
    const [y, m] = selectedMonthKey.split('-');
    const year = Number(y);
    const month = Number(m);
    
    // Find targets for this month
    const targets = invoices
      .filter((inv) => inv.year === year && inv.month === month)
      .map((inv) => ({
        roomId: inv.contract?.room?.id || '',
        roomLabel:
          (inv.contract?.room?.building?.code ||
            inv.contract?.room?.building?.name ||
            '') +
          '/' +
          String((inv.contract?.room?.number || '').replace(/^\s*B\s*/i, '').trim() || '-'),
      }))
      .filter((t) => t.roomId.length > 0);
      
    if (targets.length === 0) {
      alert('ไม่พบบิลในเดือนที่เลือก');
      return;
    }
    
    if (!confirm(`ยืนยันการส่งบิลทั้งหมด ${targets.length} รายการ?`)) return;

    try {
      setLoading(true);
      setOpen(true);
      setCompleted(0);
      setFailed(0);
      setProgress(0);
      setRoomStatuses(
        targets.map<RoomProgress>((t) => ({
          roomLabel: t.roomLabel,
          status: 'pending',
        })),
      );
      
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        try {
          await api.sendRoomInvoice(t.roomId, month, year);
          setRoomStatuses((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'success' };
            return next;
          });
          setCompleted((c) => c + 1);
        } catch (e: any) {
          setRoomStatuses((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], status: 'failed', message: e?.message };
            return next;
          });
          setFailed((f) => f + 1);
        } finally {
          const pct = Math.round(((i + 1) / targets.length) * 100);
          setProgress(pct);
        }
      }
      router.refresh();
    } catch (e) {
      alert((e as Error).message || 'ส่งบิลทั้งหมดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedMonthKey || exporting) return;
    const [y, m] = selectedMonthKey.split('-');
    try {
      setExporting(true);
      await api.exportInvoices(Number(m), Number(y));
    } catch (e) {
      alert((e as Error).message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={!selectedMonthKey}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              <Printer className="w-4 h-4" />
              พิมพ์แยกหอ
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>เลือกตึกที่จะพิมพ์</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {buildings.length === 0 ? (
              <DropdownMenuItem disabled>ไม่พบข้อมูลตึกในเดือนนี้</DropdownMenuItem>
            ) : (
              buildings.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => handlePrintByBuilding(b.id)}>
                  {b.name}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrintAll}>
              <span className="font-semibold">พิมพ์ทั้งหมด</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={handleExport}
          disabled={!selectedMonthKey || exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
        >
          {exporting ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Excel
        </button>
        
        <button
          onClick={sendAll}
          disabled={!selectedMonthKey || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
        >
          {loading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Send className="w-4 h-4" />
          )}
          ส่งทั้งหมด
        </button>
      </div>

      <SendAllProgressDialog
        open={open}
        onClose={() => setOpen(false)}
        progress={progress}
        total={roomStatuses.length}
        completed={completed}
        failed={failed}
        roomStatuses={roomStatuses}
      />
    </>
  );
}
