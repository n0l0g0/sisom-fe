'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Room,
  Invoice,
  MaintenanceRequest,
  Asset,
  RoomContact,
  MeterReading,
  DormConfig,
  api,
} from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractDetailsDialog } from "../contracts/ContractDetailsDialog";

interface Props {
  room: Room;
  children: React.ReactNode;
}

export default function RoomDetailDialog({ room, children }: Props) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(room.number);
  const [saving, setSaving] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingRoom, setMovingRoom] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [movingContractId, setMovingContractId] = useState<string | null>(null);
  const [settleMethod, setSettleMethod] = useState<'DEPOSIT' | 'CASH'>('DEPOSIT');
  const [moveOutDate, setMoveOutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settled, setSettled] = useState<Array<{ id: string; label: string; amount: number; method: 'DEPOSIT' | 'CASH' }>>([]);
  const [moveOutDays, setMoveOutDays] = useState<number>(7);
  const [dormConfig, setDormConfig] = useState<DormConfig | null>(null);
  const [lastMeterReading, setLastMeterReading] = useState<MeterReading | null>(null);
  const [moveOutWaterCurrent, setMoveOutWaterCurrent] = useState('');
  const [moveOutElectricCurrent, setMoveOutElectricCurrent] = useState('');
  const [moveOutOtherDescription, setMoveOutOtherDescription] = useState('');
  const [moveOutOtherAmount, setMoveOutOtherAmount] = useState('');
  const [moveOutDiscount, setMoveOutDiscount] = useState('');
  const [moveOutSaved, setMoveOutSaved] = useState(false);
  const [linkRequests, setLinkRequests] = useState<Array<{ userId: string; phone: string; tenantId: string; createdAt: string }>>([]);
  const [roomContacts, setRoomContacts] = useState<RoomContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  
  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Maintenance Form
  const [maintenanceForm, setMaintenanceForm] = useState({ title: '', description: '' });

  // Asset Form
  const [assetForm, setAssetForm] = useState({ name: '', serialNumber: '' });
  
  // Tenant Form
  const [tenantName, setTenantName] = useState('');
  const [tenantNickname, setTenantNickname] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantIdCard, setTenantIdCard] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [tenantStartDate, setTenantStartDate] = useState('');
  const [tenantRent, setTenantRent] = useState('');
  const [tenantDeposit, setTenantDeposit] = useState('5000');
  const [tenantOccupantCount, setTenantOccupantCount] = useState('1');
  const [occupantCount, setOccupantCount] = useState('1');
  const [savingOccupantCount, setSavingOccupantCount] = useState(false);
  const [editRent, setEditRent] = useState<string>('');
  const [editDeposit, setEditDeposit] = useState<string>('');
  const [savingContractInfo, setSavingContractInfo] = useState(false);

  const computeDepositForRent = (rentValue?: string | number) => {
    const r = Number(rentValue ?? tenantRent);
    if (!Number.isFinite(r) || r <= 0) return;
    if (r === 3000) setTenantDeposit('3000');
    else setTenantDeposit('1000');
  };

  const outstandingInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
  const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  useEffect(() => {
    if (tenantDialogOpen) {
      setTenantName('');
      setTenantNickname('');
      setTenantPhone('');
      setTenantIdCard('');
      setTenantAddress('');
      setTenantStartDate(new Date().toISOString().split('T')[0]);
      setTenantRent(room.pricePerMonth !== undefined ? String(room.pricePerMonth) : '');
      computeDepositForRent(room.pricePerMonth);
      setTenantOccupantCount('1');
    }
  }, [tenantDialogOpen, room.id, room.pricePerMonth]);

  useEffect(() => {
    computeDepositForRent(tenantRent);
  }, [tenantRent]);

  const activeContract = room.contracts?.find(c => c.isActive);

  const depositInitial = Math.max(0, Number(activeContract?.deposit ?? 0));
  const depositUsed = settled
    .filter((s) => s.method === 'DEPOSIT')
    .reduce((sum, s) => sum + s.amount, 0);
  const depositBaseRefund = Math.max(0, depositInitial - depositUsed);

  const waterPrev = lastMeterReading ? Number(lastMeterReading.waterReading ?? 0) : 0;
  const electricPrev = lastMeterReading ? Number(lastMeterReading.electricReading ?? 0) : 0;
  const waterNow = Number(moveOutWaterCurrent || 0);
  const electricNow = Number(moveOutElectricCurrent || 0);
  const waterUsage = Math.max(0, waterNow - waterPrev);
  const electricUsage = Math.max(0, electricNow - electricPrev);
  const waterUnitPrice = dormConfig ? Number(dormConfig.waterUnitPrice ?? 0) : 0;
  const electricUnitPrice = dormConfig ? Number(dormConfig.electricUnitPrice ?? 0) : 0;
  const waterCharge = waterUsage * waterUnitPrice;
  const electricCharge = electricUsage * electricUnitPrice;
  const otherCharge = Math.max(0, Number(moveOutOtherAmount || 0));
  const discountAmount = Math.max(0, Number(moveOutDiscount || 0));
  const moveOutSubTotal = waterCharge + electricCharge + otherCharge;
  const moveOutTotal = Math.max(0, moveOutSubTotal - discountAmount);

  const expectedDepositRefund =
    settleMethod === 'DEPOSIT'
      ? Math.max(0, depositBaseRefund - moveOutTotal)
      : depositBaseRefund;

  const additionalCashNeeded =
    settleMethod === 'DEPOSIT'
      ? Math.max(0, moveOutTotal - depositBaseRefund)
      : moveOutTotal;

  useEffect(() => {
    if (open) {
      setOccupantCount(String(activeContract?.occupantCount ?? 1));
      const initialRent =
        activeContract?.currentRent !== undefined
          ? Number(activeContract.currentRent)
          : room.pricePerMonth !== undefined
            ? Number(room.pricePerMonth)
            : undefined;
      setEditRent(initialRent !== undefined ? String(initialRent) : '');
      setEditDeposit(activeContract?.deposit !== undefined ? String(Number(activeContract.deposit)) : '');
    }
  }, [open, activeContract?.id, activeContract?.occupantCount]);

  const handleSaveRoomName = async () => {
    if (saving || !newName.trim()) return;
    try {
      setSaving(true);
      await api.updateRoom(room.id, { number: newName.trim() });
      setEditingName(false);
      setSaving(false);
      window.location.reload();
    } catch {
      setSaving(false);
      alert('แก้ไขชื่อห้องไม่สำเร็จ');
    }
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const data = await api.getInvoices({ roomId: room.id });
      setInvoices(data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoadingInvoices(false);
    }
  }, [room.id]);

  const fetchMaintenance = useCallback(async () => {
    try {
      setLoadingMaintenance(true);
      const data = await api.getMaintenanceRequests(room.id);
      setMaintenanceRequests(data);
    } catch (error) {
      console.error('Failed to fetch maintenance requests', error);
    } finally {
      setLoadingMaintenance(false);
    }
  }, [room.id]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoadingAssets(true);
      const data = await api.getAssets(room.id);
      setAssets(data);
    } catch (error) {
      console.error('Failed to fetch assets', error);
    } finally {
      setLoadingAssets(false);
    }
  }, [room.id]);

  const fetchDormConfig = useCallback(async () => {
    try {
      const cfg = await api.getDormConfig();
      setDormConfig(cfg);
    } catch (error) {
      console.error('Failed to fetch dorm config', error);
    }
  }, []);

  const fetchLastMeter = useCallback(async () => {
    try {
      const readings = await api.getMeterReadings(room.id);
      if (readings.length > 0) {
        const sorted = [...readings].sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          if (a.year !== b.year) return a.year - b.year;
          if (a.month !== b.month) return a.month - b.month;
          return aTime - bTime;
        });
        setLastMeterReading(sorted[sorted.length - 1]);
      } else {
        setLastMeterReading(null);
      }
    } catch (error) {
      console.error('Failed to fetch last meter reading', error);
    }
  }, [room.id]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const data = await api.getRooms();
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      (async () => {
        await fetchInvoices();
        await fetchMaintenance();
        await fetchAssets();
        await fetchDormConfig();
        await fetchLastMeter();
        const tenantId = activeContract?.tenantId;
        if (tenantId) {
          try {
            const state = await api.getMoveoutState(tenantId);
            if (state?.requestedAt) {
              setMoveOutDate(new Date(state.requestedAt).toISOString().split('T')[0]);
            }
            if (typeof state?.days === 'number') {
              setMoveOutDays(state.days);
            }
          } catch {}
        }
        try {
          const reqs = await api.getLinkRequests(room.id);
          setLinkRequests(reqs);
        } catch {}
        try {
          setLoadingContacts(true);
          const contacts = await api.getRoomContacts(room.id);
          setRoomContacts(contacts);
        } catch {}
        setLoadingContacts(false);
      })();
    }
  }, [open, fetchInvoices, fetchMaintenance, fetchAssets, fetchDormConfig, fetchLastMeter]);

  useEffect(() => {
    if (moveDialogOpen) {
      (async () => {
        await fetchRooms();
        setTargetRoomId('');
      })();
    }
  }, [moveDialogOpen, fetchRooms]);

  const handleCreateAsset = async () => {
    if (!assetForm.name) return;
    try {
      await api.createAsset({
        roomId: room.id,
        name: assetForm.name,
        serialNumber: assetForm.serialNumber,
      });
      setAssetForm({ name: '', serialNumber: '' });
      await fetchAssets();
    } catch {
      alert('Failed to create asset');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('ยืนยันการลบ?')) return;
    try {
      await api.deleteAsset(id);
      await fetchAssets();
    } catch {
      alert('Failed to delete asset');
    }
  };

  const handleCreateMaintenance = async () => {
    if (!maintenanceForm.title) return;
    try {
      await api.createMaintenanceRequest({
        title: maintenanceForm.title,
        description: maintenanceForm.description,
        roomId: room.id,
      });
      setMaintenanceForm({ title: '', description: '' });
      await fetchMaintenance();
    } catch {
      alert('Failed to create maintenance request');
    }
  };

  const handleCreateRoomContact = async () => {
    if (savingContact) return;
    const name = newContactName.trim();
    const phone = newContactPhone.trim();
    if (!phone) return;
    try {
      setSavingContact(true);
      const contacts = await api.createRoomContact(room.id, { name, phone });
      setRoomContacts(contacts);
      setNewContactName('');
      setNewContactPhone('');
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'ไม่สามารถเพิ่มข้อมูลผู้ติดต่อ/ผู้เข้าพักได้',
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleClearRoomContactLine = async (contactId: string) => {
    if (!window.confirm('ยืนยันการตัดการเชื่อมต่อ LINE สำหรับคนนี้?')) return;
    const contact = roomContacts.find((c) => c.id === contactId);
    const lineUserId = contact?.lineUserId;
    try {
      const contacts = await api.clearRoomContactLine(room.id, contactId);
      setRoomContacts(contacts);
      if (lineUserId) {
        await api.unlinkRichMenu(lineUserId, 'GENERAL');
      }
    } catch {
      alert('ตัดการเชื่อมต่อไม่สำเร็จ');
    }
  };

  const handleDeleteRoomContact = async (contactId: string) => {
    if (!window.confirm('ยืนยันการลบข้อมูลคนนี้ออกจากห้อง?')) return;
    try {
      const contacts = await api.deleteRoomContact(room.id, contactId);
      setRoomContacts(contacts);
    } catch {
      alert('ลบข้อมูลไม่สำเร็จ');
    }
  };

  const handleCreateTenant = async () => {
    if (activeContract) return;
    if (!tenantName || !tenantPhone || !tenantStartDate || !tenantRent || !tenantDeposit) return;
    try {
      setCreatingTenant(true);
      const tenant = await api.createTenant({
        name: tenantName,
        nickname: tenantNickname || undefined,
        phone: tenantPhone,
        idCard: tenantIdCard || undefined,
        address: tenantAddress || undefined,
        lineUserId: '',
      });
      await api.createContract({
        tenantId: tenant.id,
        roomId: room.id,
        startDate: tenantStartDate,
        deposit: Number(tenantDeposit),
        currentRent: Number(tenantRent),
        occupantCount: Math.max(1, Number(tenantOccupantCount || 1)),
      });
      try {
        await api.createRoomContact(room.id, {
          name: tenantName,
          phone: tenantPhone,
        });
      } catch (e) {
        void e;
      }
      setTenantDialogOpen(false);
      window.location.reload();
    } catch {
      alert('เพิ่มผู้เช่าไม่สำเร็จ');
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleRemoveTenant = async (contractId: string, tenantId?: string) => {
    if (!confirm('ยืนยันการลบผู้เช่า? ระบบจะสิ้นสุดสัญญาและทำให้ห้องว่างทันที')) return;
    try {
      await api.updateContract(contractId, { 
        isActive: false, 
        endDate: new Date().toISOString(),
      });
      if (tenantId) {
        await api.updateTenant(tenantId, { status: 'MOVED_OUT' });
      }
      window.location.reload();
    } catch {
      alert('ลบผู้เช่าไม่สำเร็จ');
    }
  };

  const handleMoveRoom = async () => {
    if (!movingContractId || !targetRoomId) return;
    try {
      setMovingRoom(true);
      await api.updateContract(movingContractId, { roomId: targetRoomId });
      setMoveDialogOpen(false);
      setMovingContractId(null);
      setTargetRoomId('');
      window.location.reload();
    } catch {
      alert('ย้ายห้องไม่สำเร็จ');
    } finally {
      setMovingRoom(false);
    }
  };

  const handleSaveOccupantCount = async () => {
    if (!activeContract || savingOccupantCount) return;
    const nextValue = Math.max(1, Number(occupantCount || 1));
    try {
      setSavingOccupantCount(true);
      await api.updateContract(activeContract.id, { occupantCount: nextValue });
      window.location.reload();
    } catch {
      alert('บันทึกจำนวนผู้เช่าไม่สำเร็จ');
    } finally {
      setSavingOccupantCount(false);
    }
  };

  const applyDepositRule = () => {
    const r = Number(editRent || activeContract?.currentRent || 0);
    if (!Number.isFinite(r) || r <= 0) return;
    if (r === 3000) setEditDeposit('3000');
    else if (r === 2100 || r === 2500) setEditDeposit('1000');
  };

  const handleSaveContractInfo = async () => {
    if (!activeContract || savingContractInfo) return;
    const rentVal = Number(editRent);
    const depositVal = Number(editDeposit);
    const payload: Partial<{ currentRent: number; deposit: number }> = {};
    if (Number.isFinite(rentVal) && rentVal > 0) payload.currentRent = rentVal as any;
    if (Number.isFinite(depositVal) && depositVal >= 0) payload.deposit = depositVal as any;
    if (Object.keys(payload).length === 0) return;
    try {
      setSavingContractInfo(true);
      await api.updateContract(activeContract.id, payload as any);
      window.location.reload();
    } catch {
      alert('บันทึกข้อมูลสัญญาเช่าไม่สำเร็จ');
    } finally {
      setSavingContractInfo(false);
    }
  };

  const handleMoveOut = async () => {
    if (!activeContract) return;
    if (outstandingInvoices.length > 0) {
      alert('ยังมีบิลค้างชำระ กรุณาเคลียร์บิลก่อนย้ายออก');
      return;
    }
    if (!confirm('ยืนยันการแจ้งย้ายออก? สัญญาจะถูกยกเลิกและห้องจะว่างทันที')) return;

    try {
      await api.updateContract(activeContract.id, { 
        isActive: false, 
        endDate: new Date().toISOString() 
      });
      alert('แจ้งย้ายออกเรียบร้อยแล้ว');
      window.location.reload();
    } catch (error) {
      console.error('Failed to move out', error);
      alert('เกิดข้อผิดพลาดในการแจ้งย้ายออก');
    }
  };

  const handleSettleOutstanding = async () => {
    if (!activeContract) return;
    if (outstandingInvoices.length === 0) return;
    if (settleMethod === 'DEPOSIT') {
      const deposit = Math.max(0, Number(activeContract.deposit || 0));
      if (deposit < outstandingTotal) {
        alert('เงินประกันไม่พอ กรุณาเลือกชำระเงินสดหรือปรับยอดให้พอ');
        return;
      }
    }
    try {
      for (const inv of outstandingInvoices) {
        await api.settleInvoice(inv.id, settleMethod);
        setSettled((prev) => [
          ...prev,
          {
            id: inv.id,
            label: `บิลค่าเช่า ${new Date(inv.year, inv.month - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`,
            amount: Number(inv.totalAmount || 0),
            method: settleMethod,
          },
        ]);
      }
      await fetchInvoices();
      alert('เคลียร์บิลค้างชำระเรียบร้อย');
    } catch (e) {
      console.error(e);
      alert('เคลียร์บิลค้างชำระไม่สำเร็จ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[900px] lg:max-w-[1100px] max-h-[85vh] p-0 bg-white gap-0">
        <div className="bg-[#f5a987] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            {!editingName ? (
              <>
                <h2 className="text-xl font-bold">ห้อง {room.number}</h2>
                <Badge
                  variant="secondary"
                  className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500 cursor-pointer"
                  onClick={() => setEditingName(true)}
                >
                  แก้ไขชื่อห้อง
                </Badge>
                <button
                  className="ml-2 px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-600 text-white text-xs flex items-center gap-1"
                  onClick={async () => {
                    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบห้องนี้? ข้อมูลสัญญาและประวัติทั้งหมดจะถูกลบไปด้วย')) {
                      try {
                        await api.deleteRoom(room.id);
                        window.location.reload();
                      } catch (e) {
                        alert('ลบห้องไม่สำเร็จ: ' + (e instanceof Error ? e.message : 'Unknown error'));
                      }
                    }
                  }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  ลบห้อง
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className="rounded px-2 py-1 text-slate-900"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if ((e.nativeEvent as KeyboardEvent).isComposing) return;
                    e.preventDefault();
                    handleSaveRoomName();
                  }}
                />
                <button
                  className="px-2 py-1 rounded bg-white text-[#8b5a3c]"
                  disabled={saving || !newName.trim()}
                  onClick={handleSaveRoomName}
                >
                  บันทึก
                </button>
                <button
                  className="px-2 py-1 rounded bg-white/20 text-white"
                  onClick={() => {
                    setEditingName(false);
                    setNewName(room.number);
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
          {/* Close button is handled by DialogPrimitive, but we can add custom close if needed */}
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-64px)]">
          <Tabs defaultValue="tenant" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-6 gap-6 overflow-x-auto">
              <TabsTrigger 
                value="tenant" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ผู้เช่า
              </TabsTrigger>
              <TabsTrigger 
                value="contract"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                สัญญาเช่า
              </TabsTrigger>
              <TabsTrigger 
                value="payment"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ชำระเงิน
              </TabsTrigger>
              <TabsTrigger 
                value="asset"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                รายการทรัพย์สิน
              </TabsTrigger>
              <TabsTrigger 
                value="moveout"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                ย้ายออก
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20h6M6 8a4 4 0 118 0 4 4 0 01-8 0zM3 18v-1a4 4 0 013-3.87"
                  />
                </svg>
                บัญชี LINE / ผู้เข้าพัก
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#f5a987] data-[state=active]:text-[#f5a987] rounded-none px-0 py-2 text-slate-500 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                การแจ้ง
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tenant" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">ผู้เช่าที่เชื่อมต่อแล้ว</h3>
                
                {room.contracts && room.contracts.length > 0 ? (
                  <div className="space-y-3">
                    {room.contracts.map(contract => (
                      <div key={contract.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-lg text-slate-800">
                              {contract.tenant?.name} <span className="text-slate-500 font-normal text-sm">({contract.tenant?.nickname || '-'})</span>
                            </div>
                            <div className="text-blue-500 flex items-center gap-1 text-sm mt-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              {contract.tenant?.phone}
                              <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="text-slate-500 text-xs mt-1">
                              เข้าพักเมื่อ {new Date(contract.startDate).toLocaleDateString('th-TH')}
                            </div>
                            <div className="mt-2">
                              <ContractDetailsDialog contract={contract} triggerLabel="ดูข้อมูลผู้เช่า" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" onClick={() => handleRemoveTenant(contract.id, contract.tenant?.id)}>
                            ลบผู้เช่า
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                            onClick={() => {
                              setMovingContractId(contract.id);
                              setMoveDialogOpen(true);
                            }}
                          >
                            ย้ายห้อง
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                    ไม่มีผู้เช่าในขณะนี้
                  </div>
                )}

                <div className="flex justify-center mt-6">
                  <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-2" disabled={!!activeContract}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        เพิ่มข้อมูลผู้เช่า
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>เพิ่มผู้เช่า</DialogTitle>
                        <DialogDescription>
                          กรอกข้อมูลผู้เช่าและรายละเอียดสัญญา
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">ข้อมูลผู้เช่า</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>ชื่อ-นามสกุล</Label>
                              <Input value={tenantName} onChange={e => setTenantName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>ชื่อเล่น</Label>
                              <Input value={tenantNickname} onChange={e => setTenantNickname(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>เบอร์โทรศัพท์</Label>
                              <Input value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>เลขบัตรประชาชน</Label>
                              <Input value={tenantIdCard} onChange={e => setTenantIdCard(e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-2">
                              <Label>ที่อยู่ตามทะเบียนบ้าน</Label>
                              <Input value={tenantAddress} onChange={e => setTenantAddress(e.target.value)} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-[#8b5a3c] border-b pb-2">รายละเอียดสัญญา</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>วันเริ่มสัญญา</Label>
                              <Input type="date" value={tenantStartDate} onChange={e => setTenantStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>ค่าเช่า (บาท/เดือน)</Label>
                              <Input type="number" value={tenantRent} onChange={e => setTenantRent(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>เงินประกัน (บาท)</Label>
                              <Input type="number" value={tenantDeposit} onChange={e => setTenantDeposit(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>จำนวนผู้เช่า (คน)</Label>
                              <Input type="number" min={1} value={tenantOccupantCount} onChange={e => setTenantOccupantCount(e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          onClick={handleCreateTenant}
                          disabled={
                            creatingTenant ||
                            !tenantName ||
                            !tenantPhone ||
                            !tenantStartDate ||
                            !tenantRent ||
                            !tenantDeposit
                          }
                          className="bg-blue-500 hover:bg-blue-600 w-full"
                        >
                          {creatingTenant ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้เช่า'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Dialog
                  open={moveDialogOpen}
                  onOpenChange={(value) => {
                    setMoveDialogOpen(value);
                    if (!value) {
                      setMovingContractId(null);
                      setTargetRoomId('');
                    }
                  }}
                >
                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>ย้ายห้อง</DialogTitle>
                      <DialogDescription>เลือกห้องว่างปลายทาง</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {loadingRooms ? (
                        <div className="text-center py-6 text-slate-500">กำลังโหลด...</div>
                      ) : (
                        <div className="space-y-2">
                          <Label>ห้องปลายทาง</Label>
                          <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกห้องว่าง" />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms
                                .filter((r) => r.status === 'VACANT' && r.id !== room.id)
                                .map((r) => {
                                  const buildingLabel = r.building?.name || r.building?.code || 'ไม่ทราบตึก';
                                  return (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.number} (ชั้น {r.floor}, {buildingLabel})
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!loadingRooms && rooms.filter((r) => r.status === 'VACANT' && r.id !== room.id).length === 0 && (
                        <div className="text-center text-slate-500">ไม่มีห้องว่างให้ย้าย</div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleMoveRoom}
                        disabled={movingRoom || !targetRoomId || loadingRooms}
                        className="bg-orange-500 hover:bg-orange-600 w-full"
                      >
                        {movingRoom ? 'กำลังย้ายห้อง...' : 'ยืนยันการย้ายห้อง'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
            
            <TabsContent value="contract">
              {activeContract ? (
                <Card>
                  <CardHeader>
                    <CardTitle>สัญญาเช่าปัจจุบัน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>วันที่เริ่มสัญญา</Label>
                        <div className="font-medium">{new Date(activeContract.startDate).toLocaleDateString('th-TH')}</div>
                      </div>
                      <div>
                        <Label>ค่าเช่า</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={editRent} 
                            onChange={(e) => setEditRent(e.target.value)} 
                            className="max-w-[160px]" 
                          />
                          <span className="text-slate-500 text-sm">บาท</span>
                        </div>
                      </div>
                      <div>
                        <Label>เงินประกัน</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={editDeposit} 
                            onChange={(e) => setEditDeposit(e.target.value)} 
                            className="max-w-[160px]" 
                          />
                          <span className="text-slate-500 text-sm">บาท</span>
                          <Button variant="outline" size="sm" onClick={applyDepositRule} className="border-slate-200">
                            ตามกติกา
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>จำนวนผู้เช่า (คน)</Label>
                        <div className="flex gap-2">
                          <Input type="number" min={1} value={occupantCount} onChange={(e) => setOccupantCount(e.target.value)} />
                          <Button
                            size="sm"
                            onClick={handleSaveOccupantCount}
                            disabled={savingOccupantCount}
                            className="bg-[#f5a987] hover:bg-[#e09b7d] text-white"
                          >
                            {savingOccupantCount ? 'กำลังบันทึก...' : 'บันทึก'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleSaveContractInfo} 
                        disabled={savingContractInfo} 
                        className="bg-[#f5a987] hover:bg-[#e09b7d] text-white"
                      >
                        {savingContractInfo ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสัญญา'}
                      </Button>
                    </div>
                    {activeContract.contractImageUrl ? (
                      <div className="space-y-2">
                        <Label>รูปสัญญา</Label>
                        <a href={activeContract.contractImageUrl} target="_blank" rel="noreferrer" className="block border rounded-lg p-2">
                          <img src={activeContract.contractImageUrl} alt="รูปสัญญาเช่า" className="max-h-64 w-full object-contain" />
                        </a>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-10 text-slate-500">ไม่มีสัญญาเช่าที่ใช้งานอยู่</div>
              )}
            </TabsContent>

            <TabsContent value="payment">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">ประวัติการชำระเงิน</h3>
                </div>
                {loadingInvoices ? (
                  <div className="text-center py-4">กำลังโหลด...</div>
                ) : invoices.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left">เดือน/ปี</th>
                          <th className="px-4 py-2 text-right">ยอดรวม</th>
                          <th className="px-4 py-2 text-center">สถานะ</th>
                          <th className="px-4 py-2 text-center">วันที่ครบกำหนด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="px-4 py-2">{inv.month}/{inv.year}</td>
                            <td className="px-4 py-2 text-right">{Number(inv.totalAmount).toLocaleString()}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant={inv.status === 'PAID' ? 'default' : 'destructive'}>
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-center">{new Date(inv.dueDate).toLocaleDateString('th-TH')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500">ไม่มีประวัติการชำระเงิน</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="asset">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>เพิ่มทรัพย์สิน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>ชื่อทรัพย์สิน</Label>
                      <Input 
                        value={assetForm.name} 
                        onChange={e => setAssetForm({...assetForm, name: e.target.value})}
                        placeholder="เช่น เตียง, ตู้เย็น"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>หมายเลขเครื่อง/Serial Number</Label>
                      <Input 
                        value={assetForm.serialNumber}
                        onChange={e => setAssetForm({...assetForm, serialNumber: e.target.value})}
                        placeholder="(ถ้ามี)"
                      />
                    </div>
                    <Button onClick={handleCreateAsset} disabled={!assetForm.name}>บันทึก</Button>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-lg font-semibold mb-4">รายการทรัพย์สิน</h3>
                  {loadingAssets ? (
                    <div className="text-center">กำลังโหลด...</div>
                  ) : assets.length > 0 ? (
                    <div className="space-y-3">
                      {assets.map(asset => (
                        <Card key={asset.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <div className="font-semibold">{asset.name}</div>
                              {asset.serialNumber && (
                                <div className="text-sm text-slate-500">S/N: {asset.serialNumber}</div>
                              )}
                              <div className="text-xs text-slate-400 mt-1">
                                สถานะ: {asset.status}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAsset(asset.id)} className="text-red-500">
                              ลบ
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500">ไม่มีรายการทรัพย์สิน</div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="moveout">
               <div className="py-6 text-slate-600">
                 {activeContract ? (
                   <div className="space-y-6">
                     <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                       <div className="font-semibold text-yellow-800">ขั้นตอนเคลียร์บิลค้างชำระก่อนย้ายออก</div>
                       <div className="mt-2 text-sm">
                         เงินประกันคงเหลือ: ฿{Number(activeContract.deposit || 0).toLocaleString()}
                       </div>
                       <div className="mt-1 text-sm">
                         ยอดบิลค้างชำระ: ฿{Number(outstandingTotal).toLocaleString()}
                       </div>
                       {outstandingInvoices.length > 0 ? (
                         <div className="mt-3 flex items-center gap-2">
                           <select
                             value={settleMethod}
                             onChange={(e) => setSettleMethod(e.target.value === 'DEPOSIT' ? 'DEPOSIT' : 'CASH')}
                             className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200 bg-white"
                           >
                             <option value="DEPOSIT">หักจากเงินประกัน</option>
                             <option value="CASH">จ่ายเงินสด</option>
                           </select>
                           <Button onClick={handleSettleOutstanding} className="bg-orange-500 hover:bg-orange-600 text-white">
                             เคลียร์บิลค้างชำระ
                           </Button>
                         </div>
                       ) : (
                         <div className="mt-3 text-sm text-green-700">ไม่มีบิลค้างชำระ</div>
                       )}
                     </div>
                     <div className="text-center">
                       <Button
                         variant="destructive"
                         onClick={handleMoveOut}
                         disabled={outstandingInvoices.length > 0}
                       >
                         แจ้งย้ายออก / สิ้นสุดสัญญา
                       </Button>
                       {outstandingInvoices.length > 0 && (
                         <div className="mt-2 text-xs text-red-500">ต้องเคลียร์บิลค้างชำระก่อน</div>
                       )}
                     </div>
                   </div>
                 ) : (
                   <div className="text-center py-10 text-slate-500">ไม่มีสัญญาเช่าที่ใช้งานอยู่</div>
                 )}
               </div>

               {activeContract && (
                 <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4">
                   <div className="flex items-center justify-between mb-4">
                     <div className="text-[#8b5a3c] font-bold text-lg">สรุปการย้ายออก</div>
                     <div className="flex items-center gap-2">
                       <span className="text-sm text-slate-600">กรุณาเลือกวันย้ายออก *</span>
                       <input
                         type="date"
                         value={moveOutDate}
                         onChange={(e) => setMoveOutDate(e.target.value)}
                         className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a987] border-slate-200"
                       />
                       <div className="text-xs text-slate-500 ml-2">
                         โอนคืนเงินประกันภายใน <span className="font-semibold">{moveOutDays}</span> วัน
                       </div>
                     </div>
                   </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="font-semibold text-slate-700 mb-2">คำนวณค่าน้ำ/ไฟ ล่าสุด</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-slate-500">เลขน้ำครั้งก่อน</div>
                            <div className="font-mono">
                              {lastMeterReading ? Number(lastMeterReading.waterReading).toLocaleString() : '-'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">เลขน้ำครั้งล่าสุด</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={moveOutWaterCurrent}
                              onChange={(e) => {
                                setMoveOutWaterCurrent(e.target.value);
                                setMoveOutSaved(false);
                              }}
                            />
                          </div>
                          <div>
                            <div className="mt-2 text-slate-500">เลขไฟครั้งก่อน</div>
                            <div className="font-mono">
                              {lastMeterReading ? Number(lastMeterReading.electricReading).toLocaleString() : '-'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">เลขไฟครั้งล่าสุด</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={moveOutElectricCurrent}
                              onChange={(e) => {
                                setMoveOutElectricCurrent(e.target.value);
                                setMoveOutSaved(false);
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 space-y-1">
                          <div>
                            ใช้น้ำ {waterUsage.toLocaleString()} หน่วย x ฿{waterUnitPrice.toLocaleString()} = ฿
                            {waterCharge.toLocaleString()}
                          </div>
                          <div>
                            ใช้ไฟ {electricUsage.toLocaleString()} หน่วย x ฿{electricUnitPrice.toLocaleString()} = ฿
                            {electricCharge.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3 space-y-2">
                        <div className="font-semibold text-slate-700 mb-2">รายการอื่นๆ / ส่วนลด</div>
                        <div className="space-y-2">
                          <Input
                            placeholder="รายละเอียดค่าใช้จ่ายอื่นๆ (ถ้ามี)"
                            value={moveOutOtherDescription}
                            onChange={(e) => {
                              setMoveOutOtherDescription(e.target.value);
                              setMoveOutSaved(false);
                            }}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-slate-600">จำนวนเงินค่าใช้จ่ายอื่นๆ</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={moveOutOtherAmount}
                                onChange={(e) => {
                                  setMoveOutOtherAmount(e.target.value);
                                  setMoveOutSaved(false);
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">ส่วนลด</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={moveOutDiscount}
                                onChange={(e) => {
                                  setMoveOutDiscount(e.target.value);
                                  setMoveOutSaved(false);
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-slate-700">
                            ยอดใบเสร็จย้ายออก: ฿{moveOutTotal.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setMoveOutSaved(true)}
                              disabled={moveOutTotal <= 0}
                            >
                              บันทึกใบเสร็จ
                            </Button>
                            {moveOutSaved && (
                              <span className="text-xs text-green-600">บันทึกแล้ว (ใช้สำหรับสรุปในหน้านี้)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="border rounded-lg p-3">
                       <div className="font-semibold text-slate-700 mb-2">รายการชำระสำเร็จ</div>
                       {settled.filter((s) => s.method === 'CASH').length === 0 ? (
                         <div className="text-center text-slate-500 text-sm py-4">ไม่มีรายการชำระบิล</div>
                       ) : (
                         <div className="space-y-2">
                           {settled
                             .filter((s) => s.method === 'CASH')
                             .map((s) => (
                               <div key={s.id} className="flex items-center justify-between text-sm">
                                 <div className="text-slate-600">{s.label}</div>
                                 <div className="font-mono">฿{s.amount.toLocaleString()}</div>
                               </div>
                             ))}
                         </div>
                       )}
                     </div>

                     <div className="border rounded-lg p-3">
                       <div className="font-semibold text-slate-700 mb-2">รายการหักจากเงินประกัน</div>
                       {settled.filter((s) => s.method === 'DEPOSIT').length === 0 ? (
                         <div className="text-center text-slate-500 text-sm py-4">ไม่มีรายการหักจากเงินประกัน</div>
                       ) : (
                         <div className="space-y-2">
                           {settled
                             .filter((s) => s.method === 'DEPOSIT')
                             .map((s) => (
                               <div key={s.id} className="flex items-center justify-between text-sm">
                                 <div className="text-slate-600">{s.label}</div>
                                 <div className="font-mono">฿{s.amount.toLocaleString()}</div>
                               </div>
                             ))}
                         </div>
                       )}
                     </div>
                   </div>

                    <div className="mt-4 space-y-2">
                      <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 inline-flex items-center">
                        <span className="mr-2">ยอดเงินประกันคืนผู้เช่า</span>
                        <span className="font-bold">
                          ฿{expectedDepositRefund.toLocaleString()}
                        </span>
                      </div>
                      {additionalCashNeeded > 0 && (
                        <div className="text-sm text-red-600">
                          ต้องเก็บเงินจากผู้เช่าเพิ่ม ฿{additionalCashNeeded.toLocaleString()}
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>แจ้งซ่อมใหม่</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>หัวข้อ</Label>
                      <Input 
                        value={maintenanceForm.title} 
                        onChange={e => setMaintenanceForm({...maintenanceForm, title: e.target.value})}
                        placeholder="เช่น แอร์ไม่เย็น, น้ำรั่ว"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>รายละเอียด</Label>
                      <Textarea 
                        value={maintenanceForm.description}
                        onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                        placeholder="รายละเอียดเพิ่มเติม..."
                      />
                    </div>
                    <Button onClick={handleCreateMaintenance} disabled={!maintenanceForm.title}>บันทึกแจ้งซ่อม</Button>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-lg font-semibold mb-4">ประวัติการแจ้งซ่อม</h3>
                  {loadingMaintenance ? (
                    <div className="text-center">กำลังโหลด...</div>
                  ) : maintenanceRequests.length > 0 ? (
                    <div className="space-y-3">
                      {maintenanceRequests.map(req => (
                        <Card key={req.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold">{req.title}</div>
                                <div className="text-sm text-slate-500">{req.description}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                  แจ้งเมื่อ {new Date(req.createdAt).toLocaleDateString('th-TH')}
                                </div>
                              </div>
                              <Badge variant={req.status === 'PENDING' ? 'secondary' : 'default'}>
                                {req.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500">ไม่มีประวัติการแจ้งซ่อม</div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contacts">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  การเชื่อมบัญชี LINE สำหรับห้องนี้
                </h3>
                <p className="text-sm text-slate-600">
                  เพิ่มรายชื่อคนที่อยู่ในห้อง พร้อมเบอร์โทร จากนั้นให้ผู้เข้าพักพิมพ์
                  REGISTER &lt;เบอร์โทร&gt; ใน LINE เพื่อเชื่อมบัญชีเองได้
                </p>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="contactName">ชื่อผู้เข้าพัก/ผู้ติดต่อ</Label>
                    <Input
                      id="contactName"
                      placeholder="เช่น คุณเอ, คุณบี (ไม่บังคับ)"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="contactPhone">เบอร์โทร</Label>
                    <Input
                      id="contactPhone"
                      placeholder="เช่น 0812345678"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                    />
                  </div>
                  <Button
                    className="whitespace-nowrap"
                    disabled={savingContact || !newContactPhone.trim()}
                    onClick={handleCreateRoomContact}
                  >
                    {savingContact ? 'กำลังบันทึก...' : 'เพิ่มรายชื่อ'}
                  </Button>
                </div>
                <div className="mt-4 border rounded-lg divide-y">
                  {loadingContacts ? (
                    <div className="p-4 text-sm text-slate-500">
                      กำลังโหลดรายชื่อ...
                    </div>
                  ) : roomContacts.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      ยังไม่มีการตั้งค่าผู้เข้าพัก/บัญชี LINE สำหรับห้องนี้
                    </div>
                  ) : (
                    roomContacts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-medium text-slate-800">
                            {c.name || c.phone}
                          </div>
                          <div className="text-sm text-slate-600">
                            เบอร์: {c.phone}
                          </div>
                          <div className="text-xs mt-1">
                            {c.lineUserId
                              ? 'เชื่อมกับบัญชี LINE แล้ว'
                              : 'ยังไม่เชื่อมกับบัญชี LINE'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {c.lineUserId && (
                            <Button
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleClearRoomContactLine(c.id)}
                            >
                              ตัดการเชื่อมต่อ
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteRoomContact(c.id)}
                          >
                            ลบออก
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
