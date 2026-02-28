import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface RevenueChartProps {
  data: { date: string; value: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="col-span-2 h-full">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue trends</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </CardContent>
      </Card>
    )
  }

  const padding = 20
  const width = 600
  const height = 200
  const maxVal = Math.max(...data.map(d => d.value)) || 100
  const minVal = 0 // Always start at 0 for revenue

  // Normalize points
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding
    const y = height - ((d.value - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding
    return `${x},${y}`
  }).join(' ')

  // Simple line for now (could be curve)
  return (
    <Card className="col-span-2 h-full">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>
          Monthly revenue trends (Last 6 months)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1" />
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Area gradient */}
            <defs>
              <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M${padding},${height-padding} L${points.replace(/ /g, ' L')} L${width-padding},${height-padding} Z`}
              fill="url(#gradient)"
            />
            
            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Dots */}
            {data.map((d, i) => {
               const x = (i / (data.length - 1)) * (width - padding * 2) + padding
               const y = height - ((d.value - minVal) / (maxVal - minVal)) * (height - padding * 2) - padding
               return (
                 <circle key={i} cx={x} cy={y} r="3" fill="#4F46E5" stroke="white" strokeWidth="1.5" />
               )
            })}
          </svg>
          
          {/* Tooltips or Labels could be added here overlaying absolute */}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
            {data.map((d, i) => (
              <span key={i}>{d.date}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
