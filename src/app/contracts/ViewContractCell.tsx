'use client';

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ViewContractCellProps {
  url?: string | null;
}

export function ViewContractCell({ url }: ViewContractCellProps) {
  if (!url) {
    return <span className="text-slate-400 text-sm">-</span>;
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2 text-slate-600 hover:text-slate-900"
      onClick={() => window.open(url, '_blank')}
    >
      <ExternalLink className="w-4 h-4" />
      ดูสัญญา
    </Button>
  );
}
