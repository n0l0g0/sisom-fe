import { api } from '@/services/api';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card-hover bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🗂️</span>
            <span className="text-xs text-indigo-700 bg-indigo-200 px-2 py-1 rounded-full">ล่าสุด 50 รายการ</span>
          </div>
          <div className="space-y-2">
            {chats.length === 0 ? (
              <p className="text-indigo-700 text-sm">ยังไม่มีรายการแชท</p>
            ) : (
              chats.map((c) => {
                const isRecv = c.type === 'received_text' || c.type === 'received_image';
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
                const when = new Date(c.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 bg-white/70 rounded-xl border border-indigo-200">
                    <div className="text-xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-indigo-900">{label}</span>
                        <span className="text-xs text-indigo-700">{when}</span>
                      </div>
                      <p className="text-indigo-800 text-sm mt-1 break-words">{content}</p>
                      <p className="text-indigo-600 text-xs mt-1">UID: {c.userId}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="card-hover bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📈</span>
            <span className="text-xs text-purple-700 bg-purple-200 px-2 py-1 rounded-full">จำนวนข้อความที่ส่ง</span>
          </div>
          {usage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-900">เดือน {usage.month}</span>
                <span className="text-sm text-purple-900">{usage.percent}%</span>
              </div>
              <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${usage.percent}%` }}
                />
              </div>
              <div className="text-purple-900 text-sm">
                ส่งแล้ว {usage.sent.toLocaleString()} / {usage.limit.toLocaleString()} เหลือ {usage.remaining.toLocaleString()}
              </div>
              <div className="text-purple-800 text-xs">
                รายละเอียด: ข้อความ {usage.breakdown.pushText?.toLocaleString?.() ?? usage.breakdown.pushText} | Flex {usage.breakdown.pushFlex?.toLocaleString?.() ?? usage.breakdown.pushFlex}
              </div>
            </div>
          ) : (
            <p className="text-purple-700 text-sm">ไม่สามารถโหลดข้อมูลการใช้งาน LINE ได้</p>
          )}
        </div>
      </div>
    </div>
  );
}
