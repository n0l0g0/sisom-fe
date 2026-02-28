import { api } from "@/services/api"
import { RentSettingsTable } from "./RentSettingsTable"

export const dynamic = 'force-dynamic';

export default async function RentSettingsPage() {
  let rooms: Awaited<ReturnType<typeof api.getRooms>> = [];
  try {
    rooms = await api.getRooms();
  } catch {
    rooms = [];
  }
  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#8b5a3c]">ค่าเช่ารายเดือน</h1>
           <p className="text-slate-500 text-sm mt-1">ปรับราคาเฉพาะรายห้อง (แต่ละห้องราคาไม่เท่ากัน)</p>
        </div>
      </div>
      <RentSettingsTable rooms={rooms} />
    </div>
  )
}
