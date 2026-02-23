 'use client';
 
 import { useMemo } from 'react';
 
 export type RoomProgress = { roomLabel: string; status: 'pending' | 'success' | 'failed'; message?: string };
 
 export default function SendAllProgressDialog({
   open,
   onClose,
   progress,
   total,
   completed,
   failed,
   roomStatuses,
 }: {
   open: boolean;
   onClose: () => void;
   progress: number;
   total: number;
   completed: number;
   failed: number;
   roomStatuses: RoomProgress[];
 }) {
   const title = useMemo(() => 'ส่งบิลทั้งหมด', []);
   if (!open) return null;
   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center">
       <div className="absolute inset-0 bg-black/40" />
       <div className="relative bg-white rounded-lg shadow-lg w-[520px] max-w-[92vw] p-4">
         <div className="text-lg font-semibold">{title}</div>
         <div className="text-sm text-slate-600">กำลังส่งบิล {completed}/{total} ใบ</div>
         <div className="w-full h-2 bg-slate-200 rounded my-3 overflow-hidden">
           <div
             className="h-2 bg-[#f5a987] transition-all"
             style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
           />
         </div>
         <div className="flex justify-between text-sm mb-2">
           <div>สำเร็จ: {completed}</div>
           <div>ล้มเหลว: {failed}</div>
           <div>ทั้งหมด: {total}</div>
         </div>
         <div className="max-h-[300px] overflow-y-auto border rounded">
           {roomStatuses.map((item, idx) => (
             <div key={idx} className="flex justify-between items-center px-3 py-2 border-b">
               <div className="font-medium">{item.roomLabel}</div>
               <div
                 className={`text-xs px-2 py-1 rounded ${
                   item.status === 'success'
                     ? 'bg-green-100 text-green-800'
                     : item.status === 'failed'
                     ? 'bg-red-100 text-red-800'
                     : 'bg-slate-100 text-slate-800'
                 }`}
               >
                 {item.status === 'success' ? 'สำเร็จ' : item.status === 'failed' ? 'ล้มเหลว' : 'กำลังส่ง'}
               </div>
             </div>
           ))}
         </div>
         <div className="mt-3 flex justify-end gap-2">
           <button
             onClick={onClose}
             disabled={progress < 100}
             className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:opacity-90 transition shadow-sm disabled:opacity-50"
           >
             ปิด
           </button>
         </div>
       </div>
     </div>
   );
 }
