import { api } from '@/services/api';
import ChatsClient from './ChatsClient';

export const dynamic = 'force-dynamic';

export default async function ChatsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let chats = [] as Awaited<ReturnType<typeof api.getRecentChats>>;
  let usage = null as Awaited<ReturnType<typeof api.getLineUsage>> | null;
  try {
    [chats, usage] = await Promise.all([
      api.getRecentChats(50),
      api.getLineUsage(),
    ]);
  } catch {
    chats = [];
    usage = null;
  }
  const q = typeof searchParams?.q === 'string' ? searchParams?.q.trim() : '';
  const typeParam = typeof searchParams?.type === 'string' ? searchParams?.type.trim() : '';
  const from = typeof searchParams?.from === 'string' ? searchParams?.from.trim() : '';
  const to = typeof searchParams?.to === 'string' ? searchParams?.to.trim() : '';
  const fromD = from ? new Date(from) : undefined;
  const toD = to ? new Date(to) : undefined;
  const filtered = chats.filter((c) => {
    if (typeParam && c.type !== typeParam) return false;
    if (q) {
      const hay = `${c.userId || ''} ${c.text || ''} ${c.altText || ''}`.toLowerCase();
      const needle = q.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (fromD || toD) {
      const t = new Date(c.timestamp).getTime();
      const lo = fromD ? new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate()).getTime() : -Infinity;
      const hi = toD ? new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59, 999).getTime() : Infinity;
      if (t < lo || t > hi) return false;
    }
    return true;
  });
  return (
    <div className="fade-in space-y-8">
      <header className="mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">💬</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-indigo-900">แชทรวม</h2>
            <p className="text-indigo-700">รวมแชทล่าสุดและสรุปจำนวนข้อความที่ส่ง</p>
          </div>
        </div>
      </header>
      <div>
        <ChatsClient chats={filtered} usage={usage} />
      </div>
    </div>
  );
}
