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
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
       <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 text-white">
         <h3 className="text-xl font-bold mb-1">{title}</h3>
         <div className="text-sm text-slate-400 mb-4">กำลังดำเนินการส่งบิล {completed} จาก {total} รายการ</div>
         
         <div className="w-full h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
           <div
             className="h-full bg-indigo-500 transition-all duration-300 ease-out"
             style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
           />
         </div>
         
         <div className="grid grid-cols-3 gap-4 mb-4 text-center">
           <div className="bg-slate-700/50 rounded-lg p-3">
             <div className="text-2xl font-bold text-emerald-400">{completed}</div>
             <div className="text-xs text-slate-400">สำเร็จ</div>
           </div>
           <div className="bg-slate-700/50 rounded-lg p-3">
             <div className="text-2xl font-bold text-rose-400">{failed}</div>
             <div className="text-xs text-slate-400">ล้มเหลว</div>
           </div>
           <div className="bg-slate-700/50 rounded-lg p-3">
             <div className="text-2xl font-bold text-slate-200">{total}</div>
             <div className="text-xs text-slate-400">ทั้งหมด</div>
           </div>
         </div>

         <div className="max-h-[300px] overflow-y-auto border border-slate-700 rounded-xl bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700">
           {roomStatuses.map((item, idx) => (
             <div key={idx} className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 last:border-0">
               <div className="font-medium text-slate-300">{item.roomLabel}</div>
               <div className="flex items-center gap-2">
                 {item.status === 'failed' && item.message && (
                   <span className="text-xs text-rose-400 max-w-[150px] truncate" title={item.message}>{item.message}</span>
                 )}
                 <div
                   className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                     item.status === 'success'
                       ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                       : item.status === 'failed'
                       ? 'bg-rose-900/30 text-rose-400 border border-rose-800'
                       : 'bg-slate-800 text-slate-400 border border-slate-700'
                   }`}
                 >
                   {item.status === 'success' ? 'สำเร็จ' : item.status === 'failed' ? 'ล้มเหลว' : 'กำลังส่ง...'}
                 </div>
               </div>
             </div>
           ))}
         </div>
         
         <div className="mt-6 flex justify-end">
           <button
             onClick={onClose}
             disabled={progress < 100}
             className="px-6 py-2.5 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
             ปิดหน้าต่าง
           </button>
         </div>
       </div>
     </div>
   );
 }
