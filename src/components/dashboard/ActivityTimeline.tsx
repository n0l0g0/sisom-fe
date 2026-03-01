import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  action: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
  className?: string;
  labels?: {
    title: string;
    empty: string;
  };
}

export function ActivityTimeline({ 
  items, 
  className,
  labels = {
    title: "Recent Activity",
    empty: "No recent activity",
  }
}: ActivityTimelineProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none", className)}>
      <h3 className="mb-6 text-base font-semibold text-slate-900 dark:text-white">{labels.title}</h3>
      
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-5 top-2 h-[calc(100%-24px)] w-[2px] bg-slate-100 dark:bg-slate-700" />

        {items.map((item, index) => (
          <div key={item.id} className="group relative flex items-start space-x-4 py-3 first:pt-0 last:pb-0">
            <div className="relative z-10 flex-shrink-0">
              <Avatar className="h-10 w-10 border-2 border-white bg-slate-50 ring-2 ring-slate-100 transition-transform duration-200 group-hover:scale-110 group-hover:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800 dark:group-hover:ring-indigo-900">
                <AvatarImage src={item.user.avatar} />
                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-bold dark:bg-indigo-900/50 dark:text-indigo-300">
                  {item.user.initials}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900 truncate pr-4 dark:text-slate-200">
                  {item.user.name}
                </p>
                <span className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap dark:text-slate-500">
                  {new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{item.action}</p>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {labels.empty}
          </div>
        )}
      </div>
    </div>
  );
}
