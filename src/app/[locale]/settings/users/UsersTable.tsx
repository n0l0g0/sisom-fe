'use client';

import { useEffect, useState } from 'react';
import { User, CreateUserDto, UpdateUserDto, api, LineProfile } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Edit, 
  Shield, 
  User as UserIcon, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import UserDialog from './UserDialog';

interface UsersTableProps {
  initialUsers: User[];
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<{
    month: string;
    sent: number;
    limit: number;
    remaining: number;
    percent: number;
    breakdown: { pushText: number; pushFlex: number };
  } | null>(null);
  const [lineNames, setLineNames] = useState<Record<string, LineProfile>>({});

  // Polling for Usage
  useEffect(() => {
    let stopped = false;
    const run = async () => {
      try {
        const u = await api.getLineUsage();
        if (!stopped) setUsage(u);
      } catch {}
    };
    run();
    const t = setInterval(run, 60000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  // Fetch LINE Profiles
  useEffect(() => {
    const run = async () => {
      try {
        const ids = Array.from(
          new Set(
            (users || [])
              .map((u) => (u.lineUserId || '').trim())
              .filter((s) => s.length > 0),
          ),
        );
        if (ids.length === 0) return;
        const prof = await api.getLineProfiles(ids);
        setLineNames(prof);
      } catch {}
    };
    run();
  }, [users]);

  // Polling for Users
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const list = await api.getUsers();
        if (!stopped) setUsers(list);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  const handleMakeTenant = async (user: User) => {
    try {
      if (!user.lineUserId || user.lineUserId.trim().length === 0) {
        alert('กรุณากรอก LINE User ID ให้ผู้ใช้ก่อน');
        return;
      }
      const allTenants = await api.getTenants({ includeHistory: true });
      const targetName = (user.name || user.username || '').trim().toLowerCase();
      const targetPhone = (user.phone || '').trim();
      const matched = allTenants.find((t) => {
        const name = (t.name || '').trim().toLowerCase();
        const phone = (t.phone || '').trim();
        if (name && targetName && name === targetName) return true;
        if (phone && targetPhone && phone === targetPhone) return true;
        return false;
      });
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
      // Update role to USER and map line role to USER (remove from staff)
      await api.updateUser(user.id, { role: 'USER' });
      await api.mapLineUserRole(user.lineUserId, 'USER');
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
      // Update role to USER and map line role to USER (remove from staff)
      await api.updateUser(user.id, { role: 'USER' });
      await api.mapLineUserRole(user.lineUserId, 'USER');
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
      await api.mapLineUserRole(user.lineUserId, 'STAFF');
      // Update role to STAFF
      await api.updateUser(user.id, { role: 'STAFF' });
      await api.linkRichMenu(user.lineUserId, 'ADMIN');
      alert('ตั้งเป็น Staff และเชื่อม Rich Menu ผู้ดูแลสำเร็จ');
    } catch {
      alert('ทำรายการไม่สำเร็จ');
    }
  };

  const handleCreate = async (data: CreateUserDto) => {
    const username = data.username.trim().toLowerCase();
    const lineId = data.lineUserId?.trim();

    const dupUsername = users.find(
      (u) => u.username.trim().toLowerCase() === username,
    );
    if (dupUsername) {
      alert('ชื่อผู้ใช้งานนี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อผู้ใช้');
      return;
    }

    if (lineId) {
      const dupLine = users.find(
        (u) => u.lineUserId && u.lineUserId.trim() === lineId,
      );
      if (dupLine) {
        alert('LINE User ID นี้ถูกใช้แล้วกับผู้ใช้งานคนอื่น');
        return;
      }
    }

    const newUser = await api.createUser({
      ...data,
      username: data.username.trim(),
      lineUserId: lineId && lineId.length > 0 ? lineId : undefined,
    });
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'; // Indigo/Violet (Primary)
      case 'ADMIN': return 'info'; // Blue
      case 'STAFF': return 'secondary'; // Gray
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members, roles, and permissions.</p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Usage Card */}
      {usage && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium text-foreground">
                  Monthly Message Usage ({usage.month})
                </CardTitle>
                <CardDescription>
                  Messages sent via LINE Official Account
                </CardDescription>
              </div>
              {usage.percent > 90 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Near Limit
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {usage.sent.toLocaleString()} / {usage.limit.toLocaleString()} messages
                </span>
                <span className="font-medium text-foreground">{usage.percent}%</span>
              </div>
              <Progress value={usage.percent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">User</TableHead>
                <TableHead>LINE ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No users found. Invite your first team member.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const lineProfile = user.lineUserId ? lineNames[user.lineUserId] : undefined;
                  const initials = (user.name || user.username || 'U').substring(0, 2).toUpperCase();
                  
                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={lineProfile?.pictureUrl} alt={user.username} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {user.name || lineProfile?.displayName || user.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lineUserId ? (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                            {user.lineUserId}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="font-normal">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {user.permissions?.length || 0} modules
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>LINE Integration</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleMakeTenant(user)}>
                              <UserIcon className="mr-2 h-4 w-4" /> Set as Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMakeStaff(user)}>
                              <Shield className="mr-2 h-4 w-4" /> Set as Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMakeGeneral(user)}>
                              <MessageSquare className="mr-2 h-4 w-4" /> Set as General
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remove User
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
      </Card>

      <UserDialog
        user={editingUser}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingUser ? (data) => handleUpdate(editingUser.id, data as UpdateUserDto) : (data) => handleCreate(data as CreateUserDto)}
      />
    </div>
  );
}
