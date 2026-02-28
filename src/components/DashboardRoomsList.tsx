'use client';

import { useMemo, useState } from 'react';
import { Room } from '@/services/api';
import RoomDetailDialog from '@/app/[locale]/floor-plan/RoomDetailDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Building, Layers } from 'lucide-react';

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'info'; // Blue/Indigo
      case 'VACANT':
        return 'success'; // Green
      case 'MAINTENANCE':
        return 'warning'; // Amber
      case 'OVERDUE':
        return 'destructive'; // Red
      default:
        return 'neutral';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'OCCUPIED': return 'มีผู้เช่า';
      case 'VACANT': return 'ว่าง';
      case 'MAINTENANCE': return 'แจ้งซ่อม';
      case 'OVERDUE': return 'ค้างชำระ';
      default: return status;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" /> 
            รายการห้อง
          </h3>
          <p className="text-sm text-muted-foreground">ทั้งหมด {totalRooms} ห้อง</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>ขยายทั้งหมด</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>ยุบทั้งหมด</Button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((g) => {
          const isOpen = buildingIsOpen(g.key);
          return (
            <div key={g.key} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div
                className="cursor-pointer select-none px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                onClick={() => toggleBuilding(g.key)}
              >
                <div className="flex items-center gap-2 font-medium text-foreground">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  {g.buildingName}
                  {g.buildingCode && <span className="text-muted-foreground text-sm font-normal">({g.buildingCode})</span>}
                </div>
                <Badge variant="secondary" className="font-normal">{g.totalRooms} ห้อง</Badge>
              </div>

              {isOpen && (
                <div className="p-4 pt-0 space-y-4 border-t">
                  {g.floors.map((f) => {
                    const isFloorOpen = floorIsOpen(g.key, f.floor);
                    return (
                      <div key={f.floor} className="mt-4">
                        <div
                          className="flex items-center gap-2 mb-3 cursor-pointer select-none text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleFloor(g.key, f.floor)}
                        >
                          {isFloorOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <Layers className="h-3 w-3" />
                          ชั้น {f.floor}
                        </div>
                        
                        {isFloorOpen && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4 border-l-2 border-muted ml-1.5">
                            {f.rooms.map((room) => (
                              <RoomDetailDialog key={room.id} room={room}>
                                <div className="group cursor-pointer rounded-lg border bg-background p-4 transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-lg text-foreground">{room.number}</span>
                                    <Badge variant={getStatusVariant(room.status) as any}>
                                      {getDisplayStatus(room.status)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">ราคา</span>
                                      <span className="font-medium">฿{((room.contracts?.[0]?.currentRent ?? room.pricePerMonth) ?? 0).toLocaleString()}</span>
                                    </div>
                                    
                                    {room.contracts?.[0]?.tenant?.name ? (
                                      <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                                        <span className="text-muted-foreground">ผู้เช่า</span>
                                        <span className="font-medium truncate max-w-[100px]">{room.contracts?.[0]?.tenant?.name}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-emerald-600 text-xs pt-2 border-t mt-2 font-medium">
                                        ว่างให้เช่า
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Status Indicator Bar */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    room.status === 'OCCUPIED' ? 'bg-blue-500' : 
                                    room.status === 'VACANT' ? 'bg-emerald-500' : 
                                    room.status === 'OVERDUE' ? 'bg-red-500' : 'bg-amber-500'
                                  }`} />
                                </div>
                              </RoomDetailDialog>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
