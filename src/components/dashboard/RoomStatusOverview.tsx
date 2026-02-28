import { cn } from "@/lib/utils";

interface RoomStatusOverviewProps {
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  className?: string;
  labels?: {
    title: string;
    total: string;
    occupied: string;
    vacant: string;
    maintenance: string;
  };
}

export function RoomStatusOverview({
  total,
  occupied,
  vacant,
  maintenance,
  className,
  labels = {
    title: "Room Status Overview",
    total: "Total Rooms",
    occupied: "Occupied",
    vacant: "Vacant",
    maintenance: "Maintenance",
  },
}: RoomStatusOverviewProps) {
  const stats = [
    { label: labels.occupied, value: occupied, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { label: labels.vacant, value: vacant, color: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
    { label: labels.maintenance, value: maintenance, color: "bg-slate-400", text: "text-slate-600 dark:text-slate-400" },
  ];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none", className)}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{labels.title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {total} {labels.total}
        </span>
      </div>

      <div className="mb-6 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
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
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
