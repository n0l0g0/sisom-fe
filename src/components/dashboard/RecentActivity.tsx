import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ActivityItem {
  id: string
  user: {
    name: string
    avatar?: string
    initials: string
  }
  action: string
  target?: string
  timestamp: Date | string
}

interface RecentActivityProps {
  items: ActivityItem[]
}

function timeAgo(date: Date | string) {
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000 // seconds

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <Card className="col-span-1 h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest actions and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {items.length === 0 ? (
             <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={item.user.avatar} alt={item.user.name} />
                  <AvatarFallback>{item.user.initials}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{item.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.action} {item.target && <span className="font-medium text-foreground">{item.target}</span>}
                  </p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">
                  {timeAgo(item.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
