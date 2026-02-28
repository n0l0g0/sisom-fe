'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  { id: 'chats', label: 'แชทรวม' },
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{user ? 'Edit User' : 'Add User'}</SheetTitle>
          <SheetDescription>
            {user ? 'Update user details and permissions.' : 'Create a new user account.'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Account Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Account Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  disabled={!!user}
                  required 
                  className="h-9"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password {user && '(Optional)'}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.passwordHash}
                      onChange={e => setFormData({ ...formData, passwordHash: e.target.value })}
                      required={!user}
                      className="h-9 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      className="h-9 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(v => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPasswordConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {(!formData.lineUserId) && (
                <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                  <Label htmlFor="verifyCode" className="text-xs">One-time Verify Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verifyCode"
                      value={verifyCode}
                      readOnly
                      placeholder="Click Generate"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          const updated = await api.updateUser(user.id, { verifyCode: 'GENERATE' });
                          setVerifyCode(updated.verifyCode || '');
                        } catch (e) {
                          alert('Failed to generate code');
                        }
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Code expires after LINE connection.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Personal Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="08xxxxxxxx"
                  className="h-9"
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
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Required for LINE Rich Menu integration.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Permissions & Access</h3>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <Checkbox
                    id="perm-line-notify"
                    checked={isLineNotifyEnabled}
                    onCheckedChange={toggleLineNotify}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="perm-line-notify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      LINE Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive automated system alerts via LINE.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Menu Access</Label>
                <div className="grid grid-cols-1 gap-2 border rounded-lg p-4 bg-muted/10">
                  {MENUS.map(menu => (
                    <div key={menu.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${menu.id}`}
                        checked={formData.permissions.includes(menu.id)}
                        onCheckedChange={() => togglePermission(menu.id)}
                      />
                      <Label htmlFor={`perm-${menu.id}`} className="text-sm font-normal cursor-pointer">
                        {menu.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <SheetFooter className="px-6 py-4 border-t mt-auto">
          <div className="flex gap-2 w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="user-form" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? 'Saving...' : 'Save User'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
