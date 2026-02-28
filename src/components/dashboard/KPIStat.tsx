import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface KPIStatProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  accentColor?: "indigo" | "emerald" | "rose" | "blue";
  className?: string;
}

export function KPIStat({
  label,
  value,
  trend,
  trendLabel = "vs last month",
  accentColor = "indigo",
  className,
}: KPIStatProps) {
  const colorMap = {
    indigo: "bg-indigo-500 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    emerald: "bg-emerald-500 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    rose: "bg-rose-500 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    blue: "bg-blue-500 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  };

  const trendColor = trend
    ? trend > 0
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
      : trend < 0
      ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
      : "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400"
    : "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400";

  const TrendIcon = trend
    ? trend > 0
      ? ArrowUpRight
      : trend < 0
      ? ArrowDownRight
      : Minus
    : Minus;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:shadow-none",
        className
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-1 w-full opacity-80",
          colorMap[accentColor].split(" ")[0]
        )}
      />
      <div className="flex flex-col space-y-4">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </span>
        </div>
        {trend !== undefined && (
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trendColor
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend)}%</span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
