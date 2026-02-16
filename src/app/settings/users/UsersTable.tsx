'use client';

import { useState } from 'react';
import { User, CreateUserDto, UpdateUserDto, api } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UserDialog from './UserDialog';

interface UsersTableProps {
  initialUsers: User[];
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleMakeTenant = async (user: User) => {
    try {
      if (!user.lineUserId || user.lineUserId.trim().length === 0) {
        alert('กรุณากรอก LINE User ID ให้ผู้ใช้ก่อน');
        return;
      }
      const allTenants = await api.getTenants({ includeHistory: true });
      const targetName = (user.name || user.username || '').trim().toLowerCase();
      const matched = allTenants.find(t => t.name.trim().toLowerCase() === targetName);
      if (matched) {
        await api.updateTenant(matched.id, { lineUserId: user.lineUserId });
      } else {
        const phone = (user.phone && user.phone.trim().length > 0) ? user.phone.trim() : `NA-${Date.now()}-${Math.random()}`;
        await api.createTenant({
          name: user.name || user.username,
          phone,
          lineUserId: user.lineUserId,
        });
      }
      await api.linkRichMenu(user.lineUserId, 'TENANT');
      alert('ตั้งเป็นผู้เช่าและเชื่อม Rich Menu ผู้เช่าสำเร็จ');
    } catch (e) {
      alert('ทำรายการไม่สำเร็จ');
    }
  };

  const handleMakeGeneral = async (user: User) => {
    try {
      if (!user.lineUserId || user.lineUserId.trim().length === 0) {
        alert('กรุณากรอก LINE User ID ให้ผู้ใช้ก่อน');
        return;
      }
      await api.linkRichMenu(user.lineUserId, 'GENERAL');
      alert('ตั้งเป็นบุคคลทั่วไปและเชื่อม Rich Menu บุคคลทั่วไปสำเร็จ');
    } catch {
      alert('ทำรายการไม่สำเร็จ');
    }
  };

  const handleMakeStaff = async (user: User) => {
    try {
      if (!user.lineUserId || user.lineUserId.trim().length === 0) {
        alert('กรุณากรอก LINE User ID ให้ผู้ใช้ก่อน');
        return;
      }
      await api.mapLineUserRole(user.id, 'STAFF');
      await api.linkRichMenu(user.lineUserId, 'ADMIN');
      alert('ตั้งเป็น Staff และเชื่อม Rich Menu ผู้ดูแลสำเร็จ');
    } catch {
      alert('ทำรายการไม่สำเร็จ');
    }
  };

  const handleCreate = async (data: CreateUserDto) => {
    const newUser = await api.createUser(data);
    setUsers([...users, newUser]);
    setIsDialogOpen(false);
  };

  const handleUpdate = async (id: string, data: UpdateUserDto) => {
    const updatedUser = await api.updateUser(id, data);
    setUsers(users.map(u => u.id === id ? updatedUser : u));
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบผู้ใช้งานนี้?')) return;
    await api.deleteUser(id);
    setUsers(users.filter(u => u.id !== id));
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button 
          onClick={openCreateDialog}
          className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition flex items-center gap-2 bg-[#f5a987]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ชื่อผู้ใช้</th>
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">LINE User ID</th>
                  <th className="px-6 py-4 text-center">บทบาท</th>
                  <th className="px-6 py-4 text-center">สิทธิ์การเข้าถึง</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                    <td className="px-6 py-4 text-slate-600">{user.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{user.lineUserId || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={user.role === 'OWNER' ? 'bg-purple-100 text-purple-700 border-none' : 'bg-blue-100 text-blue-700 border-none'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="text-slate-500 text-xs">
                         {user.permissions?.length ? `${user.permissions.length} เมนู` : 'ไม่มีสิทธิ์'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openEditDialog(user)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMakeGeneral(user)}
                          className="px-3 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition text-xs"
                          title="ตั้งเป็นบุคคลทั่วไปและเชื่อม Rich Menu บุคคลทั่วไป"
                        >
                          ตั้งเป็นบุคคลทั่วไป
                        </button>
                        <button
                          onClick={() => handleMakeTenant(user)}
                          className="px-3 py-2 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition text-xs"
                          title="ตั้งเป็นผู้เช่าและเชื่อม Rich Menu ผู้เช่า"
                        >
                          ตั้งเป็นผู้เช่า
                        </button>
                        <button
                          onClick={() => handleMakeStaff(user)}
                          className="px-3 py-2 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition text-xs"
                          title="ตั้งเป็น Staff และเชื่อม Rich Menu ผู้ดูแล"
                        >
                          ตั้งเป็น Staff
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isDialogOpen && (
        <UserDialog 
          user={editingUser} 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
          onSubmit={editingUser ? (data: CreateUserDto | UpdateUserDto) => handleUpdate(editingUser.id, data as UpdateUserDto) : (data: CreateUserDto | UpdateUserDto) => handleCreate(data as CreateUserDto)}
        />
      )}
    </>
  );
}
