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

export default function DashboardRoomsList(props: { groups: BuildingGroup[]; totalRooms: number; defaultOpen?: boolean }) {
  const { groups, totalRooms, defaultOpen = false } = props;

  const allBuildingKeys = useMemo(() => groups.map((g) => g.key), [groups]);
  const defaultOpenBuildings = useMemo(() => new Set(allBuildingKeys), [allBuildingKeys]);
  const defaultOpenFloors = useMemo(
    () => new Map(groups.map((g) => [g.key, new Set(g.floors.map((f) => f.floor))])),
    [groups],
  );

  const [openBuildings, setOpenBuildings] = useState<Set<string>>(() => (defaultOpen ? defaultOpenBuildings : new Set()));
  const [openFloors, setOpenFloors] = useState<Map<string, Set<number>>>(() => (defaultOpen ? defaultOpenFloors : new Map()));
  const [hasInteracted, setHasInteracted] = useState(false);

  const buildingIsOpen = (key: string) => {
    if (hasInteracted) return openBuildings.has(key);
    return defaultOpen ? true : openBuildings.has(key);
  };

  const floorIsOpen = (buildingKey: string, floor: number) => {
    if (hasInteracted) return openFloors.get(buildingKey)?.has(floor) ?? false;
    return defaultOpen ? true : openFloors.get(buildingKey)?.has(floor) ?? false;
  };

  const toggleBuilding = (key: string) => {
    setHasInteracted(true);
    setOpenBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFloor = (buildingKey: string, floor: number) => {
    setHasInteracted(true);
    setOpenFloors((prev) => {
      const next = new Map(prev);
      const buildingFloors = new Set(next.get(buildingKey));
      if (buildingFloors.has(floor)) buildingFloors.delete(floor);
      else buildingFloors.add(floor);
      next.set(buildingKey, buildingFloors);
      return next;
    });
  };

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
    setHasInteracted(true);
    setOpenBuildings(new Set(allBuildingKeys));
    setOpenFloors(new Map(groups.map((g) => [g.key, new Set(g.floors.map((f) => f.floor))])));
  };

  const collapseAll = () => {
    setHasInteracted(true);
    setOpenBuildings(new Set());
    setOpenFloors(new Map());
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="font-semibold text-orange-900 flex items-center gap-2"><span className="text-2xl">🚪</span> รายการห้องพัก</h3>
          <div className="text-sm text-orange-700 mt-0.5">{totalRooms} ห้อง</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 transition text-sm"
            onClick={expandAll}
          >
            ขยายทั้งหมด
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 transition text-sm"
            onClick={collapseAll}
          >
            ยุบทั้งหมด
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <details
            key={g.key}
            className="rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200"
            open={buildingIsOpen(g.key)}
          >
            <summary
              className="cursor-pointer select-none px-4 py-3 flex items-center justify-between hover:bg-orange-100/50 transition"
              onClick={(e) => {
                e.preventDefault();
                toggleBuilding(g.key);
              }}
            >
              <div className="font-bold text-orange-900">
                {g.buildingName}
                {g.buildingCode ? ` (${g.buildingCode})` : ''}
              </div>
              <div className="text-sm text-orange-700">{g.totalRooms} ห้อง</div>
            </summary>

            <div className="p-4 space-y-3">
              {g.floors.map((f) => {
                return (
                  <details
                    key={f.floor}
                    className="rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-200"
                    open={floorIsOpen(g.key, f.floor)}
                  >
                    <summary
                      className="cursor-pointer select-none px-4 py-2 flex items-center justify-between hover:bg-orange-100/30 transition"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFloor(g.key, f.floor);
                      }}
                    >
                      <div className="text-sm font-semibold text-orange-900">ชั้น {f.floor}</div>
                      <div className="text-xs text-orange-700">{f.rooms.length} ห้อง</div>
                    </summary>
                    <div className="p-4 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ml-4">
                        {f.rooms.map((room) => (
                          <RoomDetailDialog key={room.id} room={room}>
                            <div className={`room-card ${getStatusColor(room.status)} border-2 rounded-xl p-3`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-lg font-bold text-orange-900">ห้อง {room.number}</span>
                                <span className="text-xs px-2 py-1 rounded-lg">
                                  {getDisplayStatus(room.status)}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-1 text-orange-800">
                                  <span>💵</span>
                                  <span className="font-semibold">
                                    ฿{((room.contracts?.[0]?.currentRent ?? room.pricePerMonth) ?? 0).toLocaleString()}
                                  </span>
                                </div>
                                {room.contracts?.[0]?.tenant?.name ? (
                                  <div className="flex items-center gap-1 text-orange-800 pt-1 border-t border-orange-300">
                                    <span>👤</span>
                                    <span className="truncate">{room.contracts?.[0]?.tenant?.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-green-700 pt-1 border-t border-green-300">
                                    <span>✨</span>
                                    <span>พร้อมเช่า</span>
                                  </div>
                                )}
                              </div>
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
        ))}
      </div>
    </div>
  );
}
