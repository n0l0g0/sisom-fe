'use client';

import { Suspense, useCallback, useEffect, useState } from "react";
import { api, Room } from "@/services/api";
import FloorPlanContent from "./FloorPlanContent";

export default function FloorPlan() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Awaited<ReturnType<typeof api.getBuildings>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [r, b] = await Promise.all([api.getRooms(), api.getBuildings()]);
      setRooms(r);
      setBuildings(b);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRooms = useCallback(async () => {
    try {
      const r = await api.getRooms();
      setRooms(r);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 text-sm">กำลังโหลดข้อมูลห้อง...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-slate-500 text-sm">ไม่สามารถโหลดข้อมูลห้องได้</div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div />}>
      <FloorPlanContent rooms={rooms} buildings={buildings} onRoomChange={refreshRooms} />
    </Suspense>
  );
}
