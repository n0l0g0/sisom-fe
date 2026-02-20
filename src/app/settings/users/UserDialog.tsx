'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, CreateUserDto, UpdateUserDto, api } from '@/services/api';

interface UserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
}

const MENUS = [
  { id: 'dashboard', label: 'แดชบอร์ด' },
  { id: 'floor_plan', label: 'ผังหอพัก' },
  { id: 'meter', label: 'จดมิเตอร์' },
  { id: 'bills', label: 'บิลค่าเช่า' },
  { id: 'payments', label: 'จ่ายบิล' },
  { id: 'contracts', label: 'สัญญาเช่า' },
  { id: 'reports', label: 'รายงานสรุป' },
  { id: 'maintenance', label: 'แจ้งซ่อม' },
  { id: 'former_tenants', label: 'ผู้เช่าเก่า' },
  { id: 'settings_dorm', label: 'ตั้งค่า: ข้อมูลหอพัก' },
  { id: 'settings_rent', label: 'ตั้งค่า: ค่าเช่ารายเดือน' },
  { id: 'settings_users', label: 'ตั้งค่า: จัดการผู้ใช้' },
];

export default function UserDialog({ user, open, onOpenChange, onSubmit }: UserDialogProps) {
  const [formData, setFormData] = useState<{
    username: string;
    passwordHash: string;
    name: string;
    phone: string;
    role: 'ADMIN' | 'OWNER';
    permissions: string[];
    lineUserId?: string;
  }>({
    username: '',
    passwordHash: '',
    name: '',
    phone: '',
    role: 'ADMIN',
    permissions: [],
    lineUserId: '',
  });
  const [loading, setLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        passwordHash: '',
        name: user.name || '',
        phone: user.phone || '',
        role: user.role,
        permissions: user.permissions || [],
        lineUserId: user.lineUserId || '',
      });
      setVerifyCode(user.verifyCode || '');
    } else {
      setFormData({
        username: '',
        passwordHash: '',
        name: '',
        phone: '',
        role: 'ADMIN',
        permissions: [],
        lineUserId: '',
      });
      setVerifyCode('');
    }
    setPasswordConfirm('');
    setShowPassword(false);
    setShowPasswordConfirm(false);
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (!formData.passwordHash || !passwordConfirm) {
        alert('กรุณากรอกรหัสผ่านและยืนยันรหัสผ่าน');
        return;
      }
    }
    if (
      (formData.passwordHash || passwordConfirm) &&
      formData.passwordHash !== passwordConfirm
    ) {
      alert('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...rest } = formData;
      const data = formData.passwordHash ? formData : rest;
      await onSubmit(data as CreateUserDto);
      if (formData.lineUserId && formData.role) {
        await api.mapLineUserRole(formData.lineUserId, formData.role === 'OWNER' ? 'OWNER' : 'ADMIN');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาด: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (menuId: string) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(menuId)
        ? prev.permissions.filter(p => p !== menuId)
        : [...prev.permissions, menuId];
      return { ...prev, permissions };
    });
  };
  const isLineNotifyEnabled = formData.permissions.includes('line_notifications');
  const toggleLineNotify = () => {
    setFormData(prev => {
      const has = prev.permissions.includes('line_notifications');
      const permissions = has
        ? prev.permissions.filter(p => p !== 'line_notifications')
        : [...prev.permissions, 'line_notifications'];
      return { ...prev, permissions };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">ชื่อผู้ใช้ (Username)</Label>
            <Input 
              id="username" 
              value={formData.username} 
              onChange={e => setFormData({...formData, username: e.target.value})}
              disabled={!!user}
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน {user && '(เว้นว่างหากไม่ต้องการเปลี่ยน)'}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.passwordHash}
                onChange={e => setFormData({ ...formData, passwordHash: e.target.value })}
                required={!user}
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs text-slate-500"
              >
                {showPassword ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">ยืนยันรหัสผ่าน</Label>
            <div className="relative">
              <Input
                id="passwordConfirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs text-slate-500"
              >
                {showPasswordConfirm ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>

          {(!formData.lineUserId) && (
            <div className="space-y-2">
              <Label htmlFor="verifyCode">รหัสยืนยัน 6 หลัก</Label>
              <div className="flex gap-2">
                <Input
                  id="verifyCode"
                  value={verifyCode}
                  readOnly
                  placeholder="กดสร้างรหัส"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const updated = await api.updateUser(user.id, { verifyCode: 'GENERATE' });
                      setVerifyCode(updated.verifyCode || '');
                    } catch (e) {
                      alert('สร้างรหัสไม่สำเร็จ');
                    }
                  }}
                >
                  สร้างรหัส
                </Button>
              </div>
              <div className="text-xs text-slate-500">รหัสจะหายไปเมื่อเชื่อมต่อ LINE สำเร็จ</div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">ชื่อ-นามสกุล</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input 
              id="phone" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="08xxxxxxxx"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lineUserId">LINE User ID</Label>
            <Input 
              id="lineUserId" 
              value={formData.lineUserId || ''} 
              onChange={e => {
                const raw = e.target.value.trim();
                const normalized = raw
                  ? raw.startsWith('U') || raw.startsWith('u')
                    ? `U${raw.slice(1)}`
                    : `U${raw}`
                  : raw;
                setFormData({...formData, lineUserId: normalized});
              }}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <div className="text-xs text-slate-500">วาง LINE userId เพื่อยืนยันสิทธิเป็น staff/admin หรือ OWNER</div>
          </div>

          <div className="space-y-2">
            <Label>การแจ้งเตือนผ่าน LINE</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="perm-line-notify"
                checked={isLineNotifyEnabled}
                onChange={toggleLineNotify}
                className="h-4 w-4 rounded border-gray-300 text-[#f5a987] focus:ring-[#f5a987]"
              />
              <Label htmlFor="perm-line-notify" className="text-sm font-normal cursor-pointer">
                รับการแจ้งเตือนทุก flow (ชำระเงิน, แจ้งซ่อม ฯลฯ)
              </Label>
            </div>
            <div className="text-xs text-slate-500">
              หากไม่ติ๊ก จะไม่ได้รับการแจ้งเตือนใดๆ ผ่าน LINE
            </div>
          </div>

          <div className="space-y-2">
            <Label>สิทธิ์การเข้าถึงเมนู</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 max-h-[200px] overflow-y-auto">
              {MENUS.map(menu => (
                <div key={menu.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`perm-${menu.id}`}
                    checked={formData.permissions.includes(menu.id)}
                    onChange={() => togglePermission(menu.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#f5a987] focus:ring-[#f5a987]"
                  />
                  <Label htmlFor={`perm-${menu.id}`} className="text-sm font-normal cursor-pointer">
                    {menu.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={loading} className="bg-[#f5a987] hover:bg-[#e09b7d]">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
