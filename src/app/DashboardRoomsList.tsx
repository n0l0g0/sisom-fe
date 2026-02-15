'use client';

import { useMemo, useState } from 'react';
import { Room } from '@/services/api';
import RoomDetailDialog from './floor-plan/RoomDetailDialog';

type FloorGroup = {
  floor: number;
  rooms: Room[];
};

type BuildingGroup = {
  key: string;
  buildingId?: string;
  buildingName: string;
  buildingCode?: string;
  totalRooms: number;
  floors: FloorGroup[];
};

export default function DashboardRoomsList(props: { groups: BuildingGroup[]; totalRooms: number }) {
  const { groups, totalRooms } = props;

  const allBuildingKeys = useMemo(() => groups.map((g) => g.key), [groups]);

  const [openBuildings, setOpenBuildings] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.key))
  );
  const [openFloors, setOpenFloors] = useState<Map<string, Set<number>>>(() => {
    return new Map(
      groups.map((g) => [
        g.key,
        new Set(g.floors.map((f) => f.floor)),
      ])
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'VACANT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MAINTENANCE':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-100';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'อยู่แล้ว';
      case 'VACANT':
        return 'ว่าง';
      case 'MAINTENANCE':
        return 'แจ้งซ่อม';
      case 'OVERDUE':
        return 'ค้างชำระ';
      default:
        return status;
    }
  };

  const expandAll = () => {
    setOpenBuildings(new Set(allBuildingKeys));
    setOpenFloors(
      new Map(
        groups.map((g) => [
          g.key,
          new Set(g.floors.map((f) => f.floor)),
        ])
      )
    );
  };

  const collapseAll = () => {
    setOpenBuildings(new Set());
    setOpenFloors(new Map());
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="font-semibold text-[#8b5a3c]">รายการห้องทั้งหมด</h3>
          <div className="text-sm text-slate-500 mt-0.5">{totalRooms} ห้อง</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-sm"
            onClick={expandAll}
          >
            ขยายทั้งหมด
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-sm"
            onClick={collapseAll}
          >
            ยุบทั้งหมด
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((g) => {
          const buildingOpen = openBuildings.has(g.key);
          return (
            <details
              key={g.key}
              className="rounded-xl border border-slate-100 bg-slate-50/40 overflow-hidden"
              open={buildingOpen}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setOpenBuildings((prev) => {
                  const next = new Set(prev);
                  if (isOpen) next.add(g.key);
                  else next.delete(g.key);
                  return next;
                });
                if (!isOpen) {
                  setOpenFloors((prev) => {
                    const next = new Map(prev);
                    next.delete(g.key);
                    return next;
                  });
                }
              }}
            >
              <summary className="cursor-pointer select-none px-4 py-3 bg-white flex items-center justify-between">
                <div className="font-semibold text-slate-700">
                  {g.buildingName}
                  {g.buildingCode ? ` (${g.buildingCode})` : ''}
                </div>
                <div className="text-sm text-slate-500">{g.totalRooms} ห้อง</div>
              </summary>

              <div className="p-4 space-y-3">
                {g.floors.map((f) => {
                  const floorOpen = openFloors.get(g.key)?.has(f.floor) || false;
                  return (
                    <details
                      key={f.floor}
                      className="rounded-lg border border-slate-200 bg-white/70 overflow-hidden"
                      open={floorOpen}
                      onToggle={(e) => {
                        const isOpen = e.currentTarget.open;
                        setOpenFloors((prev) => {
                          const next = new Map(prev);
                          const existing = next.get(g.key) ? new Set(next.get(g.key)) : new Set<number>();
                          if (isOpen) existing.add(f.floor);
                          else existing.delete(f.floor);
                          next.set(g.key, existing);
                          return next;
                        });
                      }}
                    >
                      <summary className="cursor-pointer select-none px-4 py-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-700">ชั้น {f.floor}</div>
                        <div className="text-xs text-slate-500">{f.rooms.length} ห้อง</div>
                      </summary>
                      <div className="p-4 pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
                          {f.rooms.map((room) => (
                            <RoomDetailDialog key={room.id} room={room}>
                              <div
                                className={`p-3 rounded-xl border text-center min-w-[90px] cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${getStatusColor(room.status)}`}
                              >
                                <div className="text-base font-bold mb-0.5">{room.number}</div>
                                <div className="text-[11px] opacity-80">{getDisplayStatus(room.status)}</div>
                              </div>
                            </RoomDetailDialog>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
