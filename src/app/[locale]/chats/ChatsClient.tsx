'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { api, RecentChat, LineUsage, LineProfile } from '@/services/api';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  chats: RecentChat[];
  usage: LineUsage | null;
}

export default function ChatsClient({ chats: initialChats, usage: initialUsage }: Props) {
  // State
  const [items, setItems] = useState<RecentChat[]>(initialChats);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [names, setNames] = useState<Record<string, LineProfile>>({});
  const [usageState, setUsageState] = useState<LineUsage | null>(initialUsage);
  const [limit, setLimit] = useState<number>(50);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [userMessages, setUserMessages] = useState<RecentChat[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Select first chat on desktop if none selected
  useEffect(() => {
    if (!isMobileView && !selectedUserId && initialChats.length > 0) {
      setSelectedUserId(initialChats[0].userId);
    }
  }, [initialChats, isMobileView, selectedUserId]);

  // Fetch profiles
  useEffect(() => {
    const run = async () => {
      try {
        const ids = Array.from(new Set(items.map((c) => c.userId)));
        if (ids.length === 0) return;
        const prof = await api.getLineProfiles(ids);
        setNames((prev) => ({ ...prev, ...prof }));
      } catch {}
    };
    run();
  }, [items]);

  // Poll recent chats
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const refreshed = await api.getRecentChats(limit);
        if (stopped) return;
        setItems(refreshed);
      } catch {}
    };
    const t = setInterval(tick, 5000); // 5s polling
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [limit]);

  // Poll user messages when selected
  useEffect(() => {
    if (!selectedUserId) return;
    
    let stopped = false;
    const fetchMsgs = async () => {
      try {
        const msgs = await api.getUserChats(selectedUserId, limit);
        if (stopped) return;
        setUserMessages(msgs.slice().reverse());
      } catch {}
    };

    fetchMsgs(); // Initial fetch
    const t = setInterval(fetchMsgs, 3000); // 3s polling for active chat
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [selectedUserId, limit]);

  // Poll usage stats
  useEffect(() => {
    const tick = async () => {
      try {
        const u = await api.getLineUsage();
        setUsageState(u);
      } catch {}
    };
    const t = setInterval(tick, 60000); // 1m polling
    return () => clearInterval(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userMessages]);

  // Computed conversations list
  const conversations = useMemo(() => {
    const grouped = new Map<string, RecentChat[]>();
    for (const c of items) {
      const arr = grouped.get(c.userId) || [];
      arr.push(c);
      grouped.set(c.userId, arr);
    }
    
    const entries = Array.from(grouped.entries()).map(([uid, arr]) => {
      // Find the most recent message in this group
      const sorted = [...arr].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return {
        userId: uid,
        last: sorted[0],
        count: arr.length,
      };
    }).sort((a, b) => new Date(b.last.timestamp).getTime() - new Date(a.last.timestamp).getTime());

    if (!query) return entries;

    const lowerQuery = query.toLowerCase();
    return entries.filter((e) => 
      e.userId.toLowerCase().includes(lowerQuery) ||
      (names[e.userId]?.displayName || '').toLowerCase().includes(lowerQuery) ||
      (e.last.text || e.last.altText || '').toLowerCase().includes(lowerQuery)
    );
  }, [items, query, names]);

  const handleSend = async () => {
    if (!selectedUserId || !message.trim()) return;
    setSending(true);
    try {
      let actor: string | undefined = undefined;
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('sisom_user') : null;
        if (raw) {
          const u = JSON.parse(raw);
          actor = (u?.username || u?.name || '').trim() || undefined;
        }
      } catch {}
      
      await api.sendLineMessage(selectedUserId, message.trim(), actor);
      setMessage('');
      
      // Optimistic update or immediate fetch could be added here
      const msgs = await api.getUserChats(selectedUserId, limit);
      setUserMessages(msgs.slice().reverse());
    } catch (e) {
      console.error(e);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    // Simulate loading delay or just update limit
    setTimeout(() => {
      setLimit(prev => Math.min(prev + 50, 500));
      setLoadingMore(false);
    }, 500);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return formatTime(iso);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    } catch {
      return '-';
    }
  };

  const getDisplayName = (uid: string) => names[uid]?.displayName || uid;
  const getAvatarUrl = (uid: string) => names[uid]?.pictureUrl;

  // Render Logic
  const showSidebar = !isMobileView || !selectedUserId;
  const showChat = !isMobileView || !!selectedUserId;

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Sidebar List */}
      <div className={cn(
        "flex-col w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden transition-all",
        showSidebar ? "flex" : "hidden md:flex"
      )}>
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาแชท..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">ไม่พบรายการแชท</p>
            </div>
          ) : (
            conversations.map((c) => {
              const active = c.userId === selectedUserId;
              const displayName = getDisplayName(c.userId);
              const avatarUrl = getAvatarUrl(c.userId);
              const lastMsg = c.last.type === 'received_image' ? 'ส่งรูปภาพ' : c.last.text || c.last.altText || 'ข้อความ';
              
              return (
                <button
                  key={c.userId}
                  onClick={() => setSelectedUserId(c.userId)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3",
                    active 
                      ? "bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="relative">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online status indicator could go here */}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn("font-medium truncate text-sm", active ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-white")}>
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
                        {formatDate(c.last.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.last.type === 'received_image' && <ImageIcon className="w-3 h-3 text-slate-400" />}
                      <p className={cn("text-xs truncate", active ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400")}>
                        {lastMsg}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Usage Stats (Bottom of sidebar) */}
        {usageState && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>โควต้าข้อความ (เดือน {usageState.month})</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{usageState.percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500", 
                  usageState.percent > 90 ? "bg-rose-500" : "bg-indigo-500"
                )} 
                style={{ width: `${Math.min(usageState.percent, 100)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>ส่งแล้ว {usageState.sent.toLocaleString()}</span>
              <span>เหลือ {usageState.remaining.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden transition-all",
        showChat ? "flex" : "hidden md:flex"
      )}>
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="relative">
                  {getAvatarUrl(selectedUserId) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getAvatarUrl(selectedUserId)} alt={getDisplayName(selectedUserId)} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                      {getDisplayName(selectedUserId).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                    {getDisplayName(selectedUserId)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Active now</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex justify-center py-2">
                <button 
                  onClick={handleLoadMore}
                  disabled={loadingMore || limit >= 500}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {loadingMore && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {limit >= 500 ? 'โหลดครบแล้ว' : 'โหลดข้อความเก่า'}
                </button>
              </div>

              {userMessages.map((msg, idx) => {
                const isReceived = msg.type === 'received_text' || msg.type === 'received_image';
                const showAvatar = idx === 0 || userMessages[idx - 1].type !== msg.type || (new Date(msg.timestamp).getTime() - new Date(userMessages[idx - 1].timestamp).getTime() > 60000);
                
                return (
                  <div key={msg.id} className={cn("flex w-full gap-2", isReceived ? "justify-start" : "justify-end")}>
                    {isReceived && showAvatar ? (
                       getAvatarUrl(selectedUserId) ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={getAvatarUrl(selectedUserId)} alt="" className="w-8 h-8 rounded-full object-cover self-end mb-1" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 self-end mb-1">
                            {getDisplayName(selectedUserId).charAt(0)}
                         </div>
                       )
                    ) : isReceived ? (
                      <div className="w-8" />
                    ) : null}

                    <div className={cn(
                      "max-w-[75%] md:max-w-[60%] flex flex-col", 
                      isReceived ? "items-start" : "items-end"
                    )}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                        isReceived 
                          ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700" 
                          : "bg-indigo-600 text-white rounded-br-none"
                      )}>
                        {msg.type === 'received_image' ? (
                          <div className="flex items-center gap-2 italic">
                            <ImageIcon className="w-4 h-4" />
                            <span>ส่งรูปภาพ</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text || msg.altText || ''}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatTime(msg.timestamp)}
                        </span>
                        {!isReceived && (
                           <span className="text-[10px] text-slate-400 dark:text-slate-500">
                             • {msg.actor || 'จนท.'}
                           </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-3xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="พิมพ์ข้อความ..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 max-h-32 min-h-[40px] py-2 resize-none text-sm"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className={cn(
                    "p-2 rounded-full transition-all duration-200 flex items-center justify-center",
                    message.trim() && !sending
                      ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                >
                  {sending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </div>
              <div className="text-center mt-2">
                 <p className="text-[10px] text-slate-400 dark:text-slate-500">
                   ข้อความจะถูกส่งผ่าน LINE Official Account
                 </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900 text-slate-400 p-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">ยังไม่ได้เลือกแชท</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              เลือกรายการสนทนาจากด้านซ้ายเพื่อเริ่มพูดคุย หรือตอบกลับข้อความลูกค้า
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
