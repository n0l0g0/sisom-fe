import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Invoice } from "@/services/api"
import { FileText } from "lucide-react"

interface RecentInvoicesProps {
  invoices: Invoice[]
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  // Take last 5 invoices
  const recent = invoices.slice(0, 5)

  return (
    <Card className="col-span-1 h-full">
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>
          Latest billing statements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recent.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
               <FileText className="h-8 w-8 mb-2 opacity-20" />
               <span className="text-sm">No recent invoices</span>
             </div>
          ) : (
            recent.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Room {inv.contract?.room?.number || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.month}/{inv.year}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    ฿{Number(inv.totalAmount).toLocaleString()}
                  </div>
                  <Badge 
                    variant={
                      inv.status === 'PAID' ? 'success' : 
                      inv.status === 'OVERDUE' ? 'destructive' : 
                      inv.status === 'SENT' ? 'warning' : 'neutral'
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
