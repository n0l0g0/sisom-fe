'use client';

import { useState, useEffect } from 'react';
import { api, User } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Lock, Save, Loader2, ShieldCheck, Mail, Phone, Hash } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.getProfile();
      setUser(profile);
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        username: profile.username || '',
        email: profile.email || '',
        phone: profile.phone || '',
      }));
    } catch (e) {
      console.error('Failed to fetch profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || undefined,
      });
      alert('บันทึกข้อมูลสำเร็จ');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      fetchProfile();
    } catch (e) {
      console.error(e);
      alert('บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-muted p-4">
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold">ไม่พบข้อมูลผู้ใช้</h3>
          <p className="text-muted-foreground">กรุณาลองใหม่อีกครั้ง</p>
        </div>
        <Button onClick={fetchProfile}>ลองใหม่</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <UserIcon className="w-8 h-8" />
          </div>
          ข้อมูลส่วนตัว
        </h1>
        <p className="text-muted-foreground mt-2 ml-14">
          จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[300px_1fr]">
        <Card className="h-fit border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle>รูปโปรไฟล์</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative h-32 w-32 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
              <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                {user.name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
              </span>
              <div className="absolute bottom-0 right-0 p-2 bg-green-500 rounded-full border-4 border-white dark:border-slate-900" title="Online"></div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">{user.name || user.username}</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user.role}
              </p>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>ข้อมูลทั่วไป</CardTitle>
              <CardDescription>แก้ไขข้อมูลพื้นฐานของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">ชื่อผู้ใช้ (Username)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={formData.username}
                      disabled
                      className="pl-9 bg-muted/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-9"
                      placeholder="ระบุชื่อ-นามสกุล"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-9"
                      placeholder="example@domain.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                         const val = e.target.value.replace(/\D/g, '');
                         if (val.length <= 10) setFormData(prev => ({ ...prev, phone: val }));
                      }}
                      className="pl-9"
                      placeholder="08xxxxxxxx"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
              <CardDescription>เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่านใหม่</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => fetchProfile()}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
