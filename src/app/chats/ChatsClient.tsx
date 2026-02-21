'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, RecentChat, LineUsage, LineProfile } from '@/services/api';

interface Props {
  chats: RecentChat[];
  usage: LineUsage | null;
}

export default function ChatsClient({ chats, usage }: Props) {
  const [items, setItems] = useState<RecentChat[]>(chats);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    chats[0]?.userId || null,
  );
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [names, setNames] = useState<Record<string, LineProfile>>({});
  const [usageState, setUsageState] = useState<LineUsage | null>(usage);

  useEffect(() => {
    setItems(chats);
    if (!selectedUserId && chats.length > 0) {
      setSelectedUserId(chats[0].userId);
    }
    const run = async () => {
      try {
        const ids = Array.from(new Set(chats.map((c) => c.userId)));
        const prof = await api.getLineProfiles(ids);
        setNames(prof);
      } catch {}
    };
    run();
  }, [chats]);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const refreshed = await api.getRecentChats(50);
        if (stopped) return;
        setItems(refreshed);
        const ids = Array.from(new Set(refreshed.map((c) => c.userId)));
        const prof = await api.getLineProfiles(ids);
        if (stopped) return;
        setNames(prof);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const u = await api.getLineUsage();
        if (stopped) return;
        setUsageState(u);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  const conversations = useMemo(() => {
    const grouped = new Map<string, RecentChat[]>();
    for (const c of items) {
      const arr = grouped.get(c.userId) || [];
      arr.push(c);
      grouped.set(c.userId, arr);
    }
    const entries = Array.from(grouped.entries()).map(([uid, arr]) => ({
      userId: uid,
      last: arr[0],
      count: arr.length,
    }));
    const filtered = query
      ? entries.filter(
          (e) =>
            e.userId.toLowerCase().includes(query.toLowerCase()) ||
            (names[e.userId]?.displayName || '')
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            (e.last.text || e.last.altText || '')
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
      : entries;
    return filtered;
  }, [items, query, names]);

  const currentMessages = useMemo(() => {
    if (!selectedUserId) return [];
    return items.filter((c) => c.userId === selectedUserId);
  }, [items, selectedUserId]);

  const send = async () => {
    if (!selectedUserId || !message.trim()) return;
    setSending(true);
    try {
      await api.sendLineMessage(selectedUserId, message.trim());
      setMessage('');
      const refreshed = await api.getRecentChats(50);
      setItems(refreshed);
    } catch {
    } finally {
      setSending(false);
    }
  };

  const isOnline = useMemo(() => {
    const last = currentMessages[0];
    if (!last) return false;
    const diff = Date.now() - new Date(last.timestamp).getTime();
    return diff < 5 * 60 * 1000;
  }, [currentMessages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const getInitial = (uid: string) => {
    const name = names[uid]?.displayName || uid;
    const t = (name || '').trim();
    return t[0] || '?';
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-4 bg-white border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 border rounded px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {conversations.map((c) => {
            const active = c.userId === selectedUserId;
            const preview =
              c.last.type === 'received_image'
                ? 'รูปภาพ'
                : c.last.text || c.last.altText || 'ข้อความ';
            return (
              <button
                key={c.userId}
                onClick={() => setSelectedUserId(c.userId)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  active ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-semibold">
                    {getInitial(c.userId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 truncate">
                        {names[c.userId]?.displayName || c.userId}
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(c.last.timestamp)}</span>
                    </div>
                    <div className="text-xs text-slate-600 truncate">{preview}</div>
                  </div>
                </div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <p className="text-slate-700 text-sm">ไม่พบรายการ</p>
          )}
        </div>
      </div>

      <div className="col-span-12 md:col-span-8 bg-white border rounded-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-semibold">
              {selectedUserId ? getInitial(selectedUserId) : '?'}
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {selectedUserId ? (names[selectedUserId]?.displayName || selectedUserId) : 'เลือกผู้ใช้'}
              </div>
              <div className={`text-xs ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">ล่าสุด 50 รายการ</div>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {currentMessages.length === 0 ? (
            <p className="text-slate-700 text-sm">ยังไม่มีรายการแชท</p>
          ) : (
            currentMessages.map((c) => {
              const isRecv =
                c.type === 'received_text' || c.type === 'received_image';
              const content =
                c.type === 'received_image'
                  ? 'รูปภาพ'
                  : c.text
                  ? c.text
                  : c.altText
                  ? c.altText
                  : 'ข้อความ';
              return (
                <div
                  key={c.id}
                  className={`w-full flex ${isRecv ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-2xl ${
                      isRecv ? 'bg-slate-100 text-slate-900 rounded-tl-none' : 'bg-orange-100 text-orange-900 rounded-tr-none'
                    }`}
                  >
                    <div className="text-sm break-words">{content}</div>
                    <div className={`text-[11px] mt-1 ${isRecv ? 'text-slate-500' : 'text-orange-700'} text-right`}>
                      {formatTime(c.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 border-t pt-3 flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 text-sm bg-white"
            disabled={!selectedUserId || sending}
          />
          <button
            onClick={send}
            disabled={!selectedUserId || sending || !message.trim()}
            className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm disabled:opacity-60"
            title={selectedUserId ? `ส่งหา ${selectedUserId}` : 'เลือกผู้ใช้ก่อน'}
          >
            {sending ? 'กำลังส่ง...' : 'ส่ง'}
          </button>
        </div>

        {usageState && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-900">เดือน {usageState.month}</span>
              <span className="text-sm text-slate-900">{usageState.percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${usageState.percent}%` }}
              />
            </div>
            <div className="text-slate-900 text-sm mt-2">
              ส่งแล้ว {usageState.sent.toLocaleString()} / {usageState.limit.toLocaleString()} เหลือ {usageState.remaining.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
