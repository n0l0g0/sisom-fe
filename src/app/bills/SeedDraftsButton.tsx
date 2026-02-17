'use client';

import { Room } from '@/services/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/services/api';

export default function SeedDraftsButton({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const handleSeed = async () => {
    if (loading) return;
    setLoading(true);
    setProgress('เริ่มสร้างบิลร่าง...');
    let created = 0;
    for (const room of rooms) {
      if (created >= 20) break;
      const mr = (room.meterReadings || [])[0];
      if (!mr) continue;
      try {
        setProgress(`กำลังสร้าง ${created + 1}/20 ห้อง ${room.number}`);
        await api.generateInvoice({
          roomId: room.id,
          month: mr.month,
          year: mr.year,
        });
        created += 1;
        // หน่วงเล็กน้อยให้ backend คำนวณและ DB เขียนเสร็จ
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        // ข้ามห้องที่สร้างไม่ได้ (เช่น ไม่มีมิเตอร์ของเดือนนั้น)
        continue;
      }
    }
    setProgress(`เสร็จสิ้น สร้างได้ ${created} ใบ`);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleSeed}
      className="px-3 py-2 rounded-md text-xs font-medium bg-purple-700 text-white hover:bg-purple-800"
      title="ทดลองสร้างบิลร่าง 20 บิลจากมิเตอร์ล่าสุดของแต่ละห้อง"
      disabled={loading}
    >
      {loading ? progress || 'กำลังสร้าง...' : 'สร้างบิลร่าง 20 ใบ'}
    </button>
  );
}

