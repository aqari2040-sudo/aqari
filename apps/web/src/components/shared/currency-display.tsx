'use client';

import { formatCurrency } from '@aqari/shared';

interface CurrencyDisplayProps {
  amount: number;
  locale?: 'en' | 'ar';
  className?: string;
}

export function CurrencyDisplay({ amount, locale = 'en', className }: CurrencyDisplayProps) {
  return <span className={className}>{formatCurrency(amount, locale)}</span>;
}
