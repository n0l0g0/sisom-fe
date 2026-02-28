import React from 'react';
import { MaintenanceRequest } from '@/services/api';
import { Badge } from '@/components/ui/badge';

interface Props {
  status: MaintenanceRequest['status'];
}

export default function MaintenanceStatusBadge({ status }: Props) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'รอดำเนินการ';
      case 'IN_PROGRESS':
        return 'กำลังดำเนินการ';
      case 'COMPLETED':
        return 'เสร็จสิ้น';
      case 'CANCELLED':
        return 'ยกเลิก';
      default:
        return status;
    }
  };

  return (
    <Badge variant={getStatusVariant(status) as any} className="font-medium shadow-none">
      {getStatusLabel(status)}
    </Badge>
  );
}
