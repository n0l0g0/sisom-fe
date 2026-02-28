import { cn } from "@/lib/utils";

interface FinancialSnapshotProps {
  totalInvoices: number;
  paid: number;
  pending: number;
  overdue: number;
  className?: string;
  labels?: {
    title: string;
    total: string;
    paid: string;
    pending: string;
    overdue: string;
  };
}

export function FinancialSnapshot({
  totalInvoices,
  paid,
  pending,
  overdue,
  className,
  labels = {
    title: "Financial Snapshot",
    total: "Total Invoices",
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
  },
}: FinancialSnapshotProps) {
  const items = [
    { label: labels.paid, value: paid, color: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-400" },
    { label: labels.pending, value: pending, color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
    { label: labels.overdue, value: overdue, color: "bg-rose-500", textColor: "text-rose-700 dark:text-rose-400" },
  ];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none", className)}>
      <h3 className="mb-6 text-base font-semibold text-slate-900 dark:text-white">{labels.title}</h3>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">{labels.total}</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">{totalInvoices}</span>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-slate-200 hover:bg-slate-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
              <div className="flex items-center space-x-3">
                <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <span className={cn("text-sm font-bold", item.textColor)}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          {totalInvoices > 0 && items.map((item) => (
            <div
              key={item.label}
              style={{ width: `${(item.value / totalInvoices) * 100}%` }}
              className={cn("h-full", item.color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
