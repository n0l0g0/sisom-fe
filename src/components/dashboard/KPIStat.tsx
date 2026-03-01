import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface KPIStatProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  accentColor?: "indigo" | "emerald" | "rose" | "blue" | "cyan" | "amber";
  className?: string;
}

export function KPIStat({
  label,
  value,
  trend,
  trendLabel, // Added back to satisfy prop types if used elsewhere, though not used in component currently
  accentColor = "indigo",
  className,
}: KPIStatProps) {
  const progressColorMap = {
    indigo: "bg-indigo-500 dark:bg-indigo-400",
    emerald: "bg-emerald-500 dark:bg-emerald-400",
    rose: "bg-rose-500 dark:bg-rose-400",
    blue: "bg-blue-500 dark:bg-blue-400",
    cyan: "bg-cyan-500 dark:bg-cyan-400",
    amber: "bg-amber-500 dark:bg-amber-400",
  };

  const trendColor = trend
    ? trend > 0
      ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400"
      : trend < 0
      ? "text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400"
      : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400"
    : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400";

  const TrendIcon = trend
    ? trend > 0
      ? ArrowUpRight
      : trend < 0
      ? ArrowDownRight
      : Minus
    : Minus;

  const progressWidth = "75%";

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800",
        className
      )}
    >
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
            {trend !== undefined && (
            <div className="flex items-center space-x-1">
                <div
                className={cn(
                    "flex items-center space-x-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    trendColor
                )}
                >
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend)}%</span>
                </div>
            </div>
            )}
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
            <div 
                className={cn("h-full rounded-full transition-all duration-1000", progressColorMap[accentColor])} 
                style={{ width: progressWidth }}
            />
        </div>
      </div>
    </div>
  );
}
