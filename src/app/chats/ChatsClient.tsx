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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card-hover bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">📚</span>
          <span className="text-xs text-indigo-700 bg-indigo-200 px-2 py-1 rounded-full">แชท</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา UID/ข้อความ"
            className="flex-1 border rounded px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {conversations.map((c) => {
            const active = c.userId === selectedUserId;
            const isRecv =
              c.last.type === 'received_text' || c.last.type === 'received_image';
            const icon = isRecv ? '📩' : '📤';
            const preview =
              c.last.type === 'received_image'
                ? 'รูปภาพ'
                : c.last.text || c.last.altText || 'ข้อความ';
            return (
              <button
                key={c.userId}
                onClick={() => setSelectedUserId(c.userId)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  active ? 'border-indigo-400 bg-white' : 'border-indigo-200 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className="font-semibold text-indigo-900 text-sm">
                      {names[c.userId]?.displayName || c.userId}
                    </span>
                  </div>
                  <span className="text-xs text-indigo-700">{c.count} รายการ</span>
                </div>
                <div className="text-xs text-indigo-700 mt-1 break-words">{preview}</div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <p className="text-indigo-700 text-sm">ไม่พบรายการ</p>
          )}
        </div>
      </div>
      <div className="md:col-span-2 card-hover bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <span className="text-sm text-indigo-900 font-semibold">
              {selectedUserId ? (names[selectedUserId]?.displayName || selectedUserId) : 'เลือกผู้ใช้เพื่อดูบทสนทนา'}
            </span>
          </div>
          <span className="text-xs text-indigo-700 bg-indigo-200 px-2 py-1 rounded-full">
            ล่าสุด 50 รายการ
          </span>
        </div>
        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
          {currentMessages.length === 0 ? (
            <p className="text-indigo-700 text-sm">ยังไม่มีรายการแชท</p>
          ) : (
            currentMessages.map((c) => {
              const isRecv =
                c.type === 'received_text' || c.type === 'received_image';
              const icon = isRecv ? '📩' : '📤';
              const label = isRecv ? 'รับ' : 'ส่ง';
              const content =
                c.type === 'received_image'
                  ? 'รูปภาพ'
                  : c.text
                  ? c.text
                  : c.altText
                  ? c.altText
                  : 'ข้อความ';
              const when = new Date(c.timestamp).toLocaleString('th-TH', {
                timeZone: 'Asia/Bangkok',
              });
              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    isRecv
                      ? 'bg-white/70 border-indigo-200'
                      : 'bg-orange-100 border-orange-200'
                  }`}
                >
                  <div className="text-xl">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          isRecv ? 'text-indigo-900' : 'text-orange-900'
                        }`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-xs ${
                          isRecv ? 'text-indigo-700' : 'text-orange-700'
                        }`}
                      >
                        {when}
                      </span>
                    </div>
                    <p
                      className={`text-sm mt-1 break-words ${
                        isRecv ? 'text-indigo-800' : 'text-orange-800'
                      }`}
                    >
                      {content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="พิมพ์ข้อความเพื่อส่ง"
            className="flex-1 border rounded px-3 py-2 text-sm bg-white"
            disabled={!selectedUserId || sending}
          />
          <button
            onClick={send}
            disabled={!selectedUserId || sending || !message.trim()}
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
            title={selectedUserId ? `ส่งหา ${selectedUserId}` : 'เลือกผู้ใช้ก่อน'}
          >
            {sending ? 'กำลังส่ง...' : 'ส่ง'}
          </button>
        </div>
        {usage && (
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-indigo-900">เดือน {usage.month}</span>
              <span className="text-sm text-indigo-900">{usage.percent}%</span>
            </div>
            <div className="w-full h-3 bg-indigo-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${usage.percent}%` }}
              />
            </div>
            <div className="text-indigo-900 text-sm mt-2">
              ส่งแล้ว {usage.sent.toLocaleString()} / {usage.limit.toLocaleString()} เหลือ {usage.remaining.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
