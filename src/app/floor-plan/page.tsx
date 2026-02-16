 'use client';
 
 import { useEffect, useState } from "react";
 import { api, Room } from "@/services/api";
 import FloorPlanContent from "./FloorPlanContent";
 
 export default function FloorPlan() {
   const [rooms, setRooms] = useState<Room[]>([]);
   const [buildings, setBuildings] = useState<Awaited<ReturnType<typeof api.getBuildings>>>([]);
 
   useEffect(() => {
     let cancelled = false;
     (async () => {
       try {
         const [r, b] = await Promise.all([api.getRooms(), api.getBuildings()]);
         if (!cancelled) {
           setRooms(r);
           setBuildings(b);
         }
       } catch {
         if (!cancelled) {
           setRooms([]);
           setBuildings([]);
         }
       }
     })();
     return () => {
       cancelled = true;
     };
   }, []);
 
   return <FloorPlanContent rooms={rooms} buildings={buildings} />;
 }
