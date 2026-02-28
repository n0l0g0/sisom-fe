'use client';
import { api, DormConfig, DormExtra, RoomGalleryItem } from '@/services/api';
import { useEffect, useState } from 'react';

export default function GalleryPage() {
  const defaultItems: RoomGalleryItem[] = [
    { filename: 'LINE_ALBUM_15226_260215_1.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_1.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_2.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_2.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_3.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_3.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_4.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_4.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_5.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_5.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_6.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_6.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_7.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_7.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_8.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_8.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_9.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_9.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_10.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_10.jpg' },
    { filename: 'LINE_ALBUM_15226_260215_11.jpg', url: 'https://line-sisom.washqueue.com/api/media/LINE_ALBUM_15226_260215_11.jpg' },
  ];

  const [items, setItems] = useState<RoomGalleryItem[]>(defaultItems);
  const [dormConfig, setDormConfig] = useState<DormConfig | null>(null);
  const [dormExtra, setDormExtra] = useState<DormExtra>({});
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [gallery, config, extra] = await Promise.all([
          api.getRoomGallery(),
          api.getDormConfig(),
          api.getDormExtra(),
        ]);
        if (!cancelled) {
          setItems(gallery && gallery.length > 0 ? gallery : defaultItems);
          setDormConfig(config);
          setDormExtra(extra);
        }
      } catch {
        // fallback already set
      }
    })();
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, items.length]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-center gap-4">
          {dormExtra?.logoUrl ? (
            <img
              src={dormExtra.logoUrl}
              alt="logo"
              className="w-12 h-12 rounded-xl object-cover border border-orange-200 shadow-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏠</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-orange-900">
              รูปห้องพัก
            </h1>
            <p className="text-sm text-orange-700">
              {dormConfig?.dormName || 'หอพัก'} · ตัวอย่างรูปห้องพักสำหรับผู้เช่า
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <p className="text-slate-600">
            ยังไม่มีรูปห้องพักที่อัพโหลด
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item, idx) => (
              <button
                key={item.filename}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200 text-left"
                onClick={() => { setIndex(idx); setOpen(true); }}
              >
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-40 object-cover"
                />
                <div className="px-3 py-2 text-xs text-slate-600 truncate">
                  {item.filename}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && items[index] && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <button
            className="absolute top-4 right-4 bg-white/80 text-slate-800 px-3 py-2 rounded-lg"
            onClick={() => setOpen(false)}
          >
            ปิด
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 text-slate-800 w-10 h-10 rounded-full"
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            aria-label="ก่อนหน้า"
          >
            ‹
          </button>
          <img
            src={items[index].url}
            alt={items[index].filename}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl"
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 text-slate-800 w-10 h-10 rounded-full"
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            aria-label="ถัดไป"
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
}
