import { api } from '@/services/api';
import UsersTable from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await api.getUsers();

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#8b5a3c]">จัดการผู้ใช้</h1>
          <p className="text-slate-500 text-sm mt-1">เพิ่ม ลบ แก้ไข ผู้ใช้งาน และกำหนดสิทธิ์ในแต่ละเมนู</p>
        </div>
      </div>

      <UsersTable initialUsers={users} />
    </div>
  );
}
