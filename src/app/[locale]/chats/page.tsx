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

  // Basic filtering on server side if needed, though client side handles most of it now
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
    <div className="space-y-6 fade-in pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">แชทรวม</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">รวมแชทล่าสุดและสรุปจำนวนข้อความที่ส่ง</p>
        </div>
      </div>
      
      <ChatsClient chats={filtered} usage={usage} />
    </div>
  );
}
