import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: { date: string; value: number }[];
  className?: string;
}

export function ChartCard({ title, subtitle, data, className }: ChartCardProps) {
  const padding = 24;
  const width = 800;
  const height = 300;
  const maxVal = Math.max(...data.map((d) => d.value), 100) * 1.1; // Add 10% headroom
  const minVal = 0;

  // Generate SVG path for smooth curve
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - ((d.value - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding;
    return { x, y };
  });

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map((p, i) => {
        // Simple smoothing: using previous point as control
        // For better smoothing we'd use Catmull-Rom or Bezier control points calculation
        // but simple line `L` is cleaner for financial data usually. 
        // Let's try a simple L for clarity or a quadratic curve.
        return `L ${p.x} ${p.y}`;
      }).join(" ")
    : "";

  const areaD = points.length > 1
    ? `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`
    : "";

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[300px] w-full"
          preserveAspectRatio="none"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = height - padding - tick * (height - padding * 2);
            return (
              <line
                key={tick}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-indigo-500 stroke-white stroke-[3px] transition-all duration-200 hover:r-6 hover:fill-indigo-600"
            />
          ))}
        </svg>

        {/* X-Axis Labels */}
        <div className="mt-2 flex justify-between px-2 text-xs font-medium text-slate-400">
          {data.map((d, i) => (
            <span key={i}>{d.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
