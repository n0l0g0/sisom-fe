import { api, User } from '@/services/api';
import UsersTable from './UsersTable';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  let users: User[] = [];
  try {
    users = await api.getUsers();
  } catch (e) {
    console.error('Failed to fetch users', e);
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <UsersTable initialUsers={users} />
    </div>
  );
}
