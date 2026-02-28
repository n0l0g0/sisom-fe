import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  trend?: string
  trendUp?: boolean
  color?: "amber" | "blue" | "emerald" | "violet" | "rose" | "indigo"
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendUp,
  color = "indigo",
  className,
}: StatCardProps) {
  const colorMap = {
    amber: "border-amber-500 text-amber-600 bg-amber-50",
    blue: "border-blue-500 text-blue-600 bg-blue-50",
    emerald: "border-emerald-500 text-emerald-600 bg-emerald-50",
    violet: "border-violet-500 text-violet-600 bg-violet-50",
    rose: "border-rose-500 text-rose-600 bg-rose-50",
    indigo: "border-indigo-500 text-indigo-600 bg-indigo-50",
  }

  return (
    <Card className={cn("relative overflow-hidden border-t-4 shadow-sm transition-all hover:shadow-md", colorMap[color].split(" ")[0], className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-rose-600")}>
                  {trend}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("rounded-lg p-2.5", colorMap[color].split(" ").slice(1).join(" "))}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
