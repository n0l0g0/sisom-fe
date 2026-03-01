import React from 'react';
import { Room } from '@/services/api';

interface RoomTypeStats {
  price: number;
  total: number;
  vacant: number;
  occupied: number;
  occupancyRate: number;
  potentialRevenue: number;
}

export function RoomTypeIntelligence({ rooms }: { rooms: Room[] }) {
  // Group rooms by price
  // Pre-populate with expected price tiers
  const statsMap = new Map<number, RoomTypeStats>();
  [2100, 2500, 3000].forEach(price => {
    statsMap.set(price, {
      price,
      total: 0,
      vacant: 0,
      occupied: 0,
      occupancyRate: 0,
      potentialRevenue: 0
    });
  });

  rooms.forEach(room => {
    // If price is missing, use 0 or skip. 
    // We'll skip if no price to avoid clutter, assuming clean data for "Room Types"
    const price = room.pricePerMonth;
    if (!price) return;

    // Filter only focused prices
    if (![2100, 2500, 3000].includes(price)) return;

    if (!statsMap.has(price)) {
      statsMap.set(price, {
        price,
        total: 0,
        vacant: 0,
        occupied: 0,
        occupancyRate: 0,
        potentialRevenue: 0
      });
    }

    const stat = statsMap.get(price)!;
    stat.total++;
    
    // Status Logic
    // OCCUPIED, OVERDUE -> Occupied
    // VACANT -> Vacant
    // MAINTENANCE -> Neither (will show as gap in bar)
    if (room.status === 'OCCUPIED' || room.status === 'OVERDUE') {
      stat.occupied++;
    } else if (room.status === 'VACANT') {
      stat.vacant++;
    }
    
    // Recalculate potential revenue based on total rooms found so far
    // Note: If we pre-populated, total starts at 0, so this is correct.
    // However, for pre-populated items that have no rooms, total is 0, potential is 0.
    // If we want to show potential based on *capacity*, we need capacity data.
    // But we only have `rooms` list. So "Total rooms" implies "Existing rooms in DB".
    // So if DB has 0 rooms of type 2100, Total is 0.
    stat.potentialRevenue = stat.total * stat.price;
  });

  // Calculate rates
  statsMap.forEach(stat => {
    stat.occupancyRate = stat.total > 0 ? Math.round((stat.occupied / stat.total) * 100) : 0;
  });

  // Convert to array and sort by price ascending
  const stats = Array.from(statsMap.values()).sort((a, b) => a.price - b.price);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 mb-8">
       {/* Section Header */}
       <div className="mb-4">
         <h2 className="text-lg font-semibold text-slate-900 dark:text-white">ภาพรวมตามประเภทห้อง</h2>
         <p className="text-sm text-slate-500 dark:text-slate-400">วิเคราะห์จำนวนห้องว่างและการเข้าพักตามระดับราคา</p>
       </div>

       {/* Grid Layout */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {stats.map((stat) => {
           const occupiedPct = stat.total > 0 ? (stat.occupied / stat.total) * 100 : 0;
           const vacantPct = stat.total > 0 ? (stat.vacant / stat.total) * 100 : 0;

           return (
             <div 
                key={stat.price} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
             >
               {/* Top Row: Price & Occupancy Badge */}
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <div className="text-lg font-bold text-slate-900 dark:text-white">
                     {stat.price.toLocaleString()} 
                   </div>
                   <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">บาท / เดือน</div>
                 </div>
                 <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                   stat.occupancyRate > 80 
                     ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                     : stat.occupancyRate >= 50
                     ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                     : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                 }`}>
                   {stat.occupancyRate}%
                 </div>
               </div>

               {/* Middle Stats: Total, Vacant, Occupied */}
               <div className="mb-4">
                 <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.total}</div>
                 <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">จำนวนห้องทั้งหมด</div>
                 
                 <div className="flex justify-between text-sm">
                   <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                     ว่าง {stat.vacant}
                   </div>
                   <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                     ไม่ว่าง {stat.occupied}
                   </div>
                 </div>
               </div>

               {/* Occupancy Bar */}
               <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex mb-3">
                 <div 
                   className="bg-indigo-500 h-full transition-all duration-700 ease-out" 
                   style={{ width: `${occupiedPct}%` }}
                 />
                 <div 
                   className="bg-emerald-400 h-full transition-all duration-700 ease-out"
                   style={{ width: `${vacantPct}%` }}
                 />
               </div>

               {/* Revenue Potential */}
               <div className="text-sm text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                 <span>รายได้เต็มศักยภาพ</span>
                 <span className="font-semibold text-slate-900 dark:text-white">฿{stat.potentialRevenue.toLocaleString()}</span>
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
}
