import { cn } from "@/lib/utils";

interface RoomStatusOverviewProps {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  className?: string;
}

export function RoomStatusOverview({
  total,
  occupied,
  vacant,
  maintenance,
  className,
}: RoomStatusOverviewProps) {
  const stats = [
    { label: "Occupied", value: occupied, color: "bg-emerald-500", text: "text-emerald-600" },
    { label: "Vacant", value: vacant, color: "bg-indigo-500", text: "text-indigo-600" },
    { label: "Maintenance", value: maintenance, color: "bg-slate-400", text: "text-slate-600" },
  ];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Room Status Overview</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {total} Total Rooms
        </span>
      </div>

      <div className="mb-6 flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 && stats.map((stat) => (
          <div
            key={stat.label}
            style={{ width: `${(stat.value / total) * 100}%` }}
            className={cn("h-full border-r border-white/20 last:border-0", stat.color)}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={cn("mb-1 text-2xl font-bold", stat.text)}>{stat.value}</div>
            <div className="flex items-center justify-center space-x-1.5">
              <div className={cn("h-2 w-2 rounded-full", stat.color)} />
              <span className="text-xs font-medium text-slate-500">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
