 'use client';
 
 import { useMemo } from 'react';
 import Link from 'next/link';
 import { useSearchParams } from 'next/navigation';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import RoomDetailDialog from './RoomDetailDialog';
 import CreateRoomDialog from './CreateRoomDialog';
 import RoomsDebugLogger from './RoomsDebugLogger';
 import type { Room, Building } from '@/services/api';
 
 export default function FloorPlanContent({ rooms, buildings }: { rooms: Room[]; buildings: Building[] }) {
   const searchParams = useSearchParams();
   const selectedBuilding = searchParams.get('building') || undefined;
 
   const filteredRooms = useMemo(
     () =>
       selectedBuilding
         ? rooms.filter((r: Room & { buildingId?: string }) => r.buildingId === selectedBuilding)
         : rooms,
     [rooms, selectedBuilding],
   );
   const currentBuilding = useMemo(
     () => (selectedBuilding ? buildings.find((b) => b.id === selectedBuilding) : undefined),
     [buildings, selectedBuilding],
   );
 
   const roomsByFloor = useMemo(() => {
     return filteredRooms.reduce((acc: Record<number, Room[]>, room: Room) => {
       const floor = room.floor;
       if (!acc[floor]) acc[floor] = [];
       acc[floor].push(room);
       return acc;
     }, {});
   }, [filteredRooms]);
 
   const floors = useMemo(() => Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b), [roomsByFloor]);
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'OCCUPIED': return 'bg-blue-50 text-blue-700 border-blue-200';
       case 'VACANT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
       case 'MAINTENANCE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
       case 'OVERDUE': return 'bg-red-50 text-red-700 border-red-200';
       default: return 'bg-gray-100';
     }
   };
 
   const getDisplayStatus = (status: string) => {
     switch (status) {
       case 'OCCUPIED': return 'อยู่แล้ว';
       case 'VACANT': return 'ว่าง';
       case 'MAINTENANCE': return 'แจ้งซ่อม';
       case 'OVERDUE': return 'ค้างชำระ';
       default: return status;
     }
   };
 
   if (!selectedBuilding) {
     return (
       <div className="space-y-8 fade-in">
         <div className="flex items-center justify-between mb-6">
           <h1 className="text-2xl font-bold text-[#8b5a3c]">เลือกตึก</h1>
           <CreateRoomDialog>
             <button className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition flex items-center gap-2 bg-[#f5a987]">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
               </svg>
               เพิ่มห้อง
             </button>
           </CreateRoomDialog>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {buildings.map((b) => {
             const count = rooms.filter((r: Room & { buildingId?: string }) => r.buildingId === b.id).length;
             return (
               <Link key={b.id} href={`/floor-plan?building=${encodeURIComponent(b.id)}`}>
                 <Card className="shadow-sm border-none bg-white hover:shadow-md transition">
                   <CardHeader className="pb-2 border-b border-slate-100">
                     <CardTitle className="text-lg text-slate-700">{b.name}</CardTitle>
                   </CardHeader>
                   <CardContent className="pt-4">
                     <div className="text-slate-600">จำนวนห้อง {count}</div>
                   </CardContent>
                 </Card>
               </Link>
             );
           })}
         </div>
       </div>
     );
   }
 
   return (
     <div className="space-y-8 fade-in">
       <RoomsDebugLogger rooms={filteredRooms} />
       <div className="flex items-center justify-between mb-6">
           <div>
             <h1 className="text-2xl font-bold text-[#8b5a3c]">ผังหอพัก</h1>
             <div className="text-sm text-slate-500 mt-1">
               ตึก: {currentBuilding ? `${currentBuilding.name}${currentBuilding.code ? ` (${currentBuilding.code})` : ''}` : selectedBuilding}
             </div>
           </div>
           <Link
             href="/floor-plan"
             className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
           >
             เลือกตึกอื่น
           </Link>
       </div>
 
       <div className="flex items-center justify-between mb-6">
         <div className="flex gap-4">
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div>
           <span className="text-sm text-slate-600">ว่าง</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
           <span className="text-sm text-slate-600">อยู่แล้ว</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
             <span className="text-sm text-slate-600">แจ้งซ่อม</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
           <span className="text-sm text-slate-600">ค้างชำระ</span>
         </div>
         </div>
       </div>
       
       {floors.map(floor => (
         <Card key={floor} className="shadow-sm border-none bg-white">
           <CardHeader className="pb-2 border-b border-slate-100">
             <CardTitle className="text-lg text-slate-700">ชั้น {floor}</CardTitle>
           </CardHeader>
           <CardContent className="pt-6">
             <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
               {roomsByFloor[floor]
                 .sort((a, b) => {
                   const aIsBannoi = a.number.includes('บ้านน้อย');
                   const bIsBannoi = b.number.includes('บ้านน้อย');
                   if (aIsBannoi !== bIsBannoi) {
                     return aIsBannoi ? 1 : -1;
                   }
                   const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
                   const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
                   return numA - numB;
                 })
                 .map((room: Room) => (
                 <RoomDetailDialog key={room.id} room={room}>
                   <div 
                     className={`
                       p-4 rounded-xl border text-center cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 min-w-[100px]
                       ${getStatusColor(room.status)}
                     `}
                   >
                     <div className="text-xl font-bold mb-1">{room.number}</div>
                     <div className="text-xs opacity-80">
                       {getDisplayStatus(room.status)}
                     </div>
                     {room.contracts?.[0]?.tenant && (
                       <div className="mt-2 text-xs truncate font-medium">
                         {room.contracts[0].tenant.nickname || room.contracts[0].tenant.name}
                       </div>
                     )}
                   </div>
                 </RoomDetailDialog>
               ))}
             </div>
           </CardContent>
         </Card>
       ))}
     </div>
   );
 }
