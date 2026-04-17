'use client';

import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'; label: string; label_ar: string }> = {
  occupied: { variant: 'success', label: 'Occupied', label_ar: 'مؤجرة' },
  vacant: { variant: 'warning', label: 'Vacant', label_ar: 'غير مؤجرة' },
  under_maintenance: { variant: 'destructive', label: 'Under Maintenance', label_ar: 'تحت الصيانة' },
  active: { variant: 'success', label: 'Active', label_ar: 'نشط' },
  expired: { variant: 'secondary', label: 'Expired', label_ar: 'منتهي' },
  terminated: { variant: 'destructive', label: 'Terminated', label_ar: 'ملغي' },
  pending: { variant: 'warning', label: 'Pending', label_ar: 'قيد الانتظار' },
  partial: { variant: 'warning', label: 'Partial', label_ar: 'جزئي' },
  paid: { variant: 'success', label: 'Paid', label_ar: 'مدفوع' },
  overdue: { variant: 'destructive', label: 'Overdue', label_ar: 'متأخر' },
  pending_review: { variant: 'warning', label: 'Pending Review', label_ar: 'بانتظار المراجعة' },
  confirmed: { variant: 'success', label: 'Confirmed', label_ar: 'مؤكد' },
  rejected: { variant: 'destructive', label: 'Rejected', label_ar: 'مرفوض' },
  submitted: { variant: 'default', label: 'Submitted', label_ar: 'مقدم' },
  in_progress: { variant: 'default', label: 'In Progress', label_ar: 'قيد التنفيذ' },
  approved: { variant: 'success', label: 'Approved', label_ar: 'موافق عليه' },
  completed: { variant: 'success', label: 'Completed', label_ar: 'مكتمل' },
  blocked_duplicate: { variant: 'destructive', label: 'Blocked (Duplicate)', label_ar: 'محظور (مكرر)' },
  cancelled: { variant: 'secondary', label: 'Cancelled', label_ar: 'ملغي' },
};

interface StatusBadgeProps {
  status: string;
  locale?: string;
}

export function StatusBadge({ status, locale = 'en' }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: 'outline' as const, label: status, label_ar: status };
  return (
    <Badge variant={config.variant}>
      {locale === 'ar' ? config.label_ar : config.label}
    </Badge>
  );
}
