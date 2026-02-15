import { api, Room } from "@/services/api";
import FloorPlanContent from "./FloorPlanContent";

export const dynamic = 'force-dynamic'

export default async function FloorPlan({ searchParams }: { searchParams?: { building?: string } }) {
  let rooms: Room[] = [];
  let buildings: Awaited<ReturnType<typeof api.getBuildings>> = [];
  try {
    [rooms, buildings] = await Promise.all([api.getRooms(), api.getBuildings()]);
  } catch {
    rooms = [];
    buildings = [];
  }
  return <FloorPlanContent rooms={rooms} buildings={buildings} />;
}
