export function formatCurrency(amount: number, locale: 'en' | 'ar' = 'en'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (locale === 'ar') {
    return `${formatted} د.إ`;
  }
  return `AED ${formatted}`;
}

export function parseCurrencyAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
}
