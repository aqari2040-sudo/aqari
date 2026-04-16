import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyDisplay } from '@/components/shared/currency-display';

// CurrencyDisplay delegates formatting to @aqari/shared's formatCurrency utility.
// Mock the shared package so the unit test is isolated from workspace resolution.
vi.mock('@aqari/shared', () => ({
  formatCurrency: (amount: number, locale: 'en' | 'ar' = 'en') => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return locale === 'ar' ? `${formatted} د.إ` : `AED ${formatted}`;
  },
}));

describe('CurrencyDisplay', () => {
  it('formats amount in English (AED 1,500.00)', () => {
    render(<CurrencyDisplay amount={1500} locale="en" />);
    expect(screen.getByText('AED 1,500.00')).toBeInTheDocument();
  });

  it('formats amount in Arabic (1,500.00 د.إ)', () => {
    render(<CurrencyDisplay amount={1500} locale="ar" />);
    expect(screen.getByText('1,500.00 د.إ')).toBeInTheDocument();
  });

  it('handles zero amount', () => {
    render(<CurrencyDisplay amount={0} locale="en" />);
    expect(screen.getByText('AED 0.00')).toBeInTheDocument();
  });
});
