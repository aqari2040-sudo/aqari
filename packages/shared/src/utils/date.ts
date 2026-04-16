export function formatDate(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getPeriodStartDate(period: 'monthly' | 'quarterly' | 'yearly', now?: Date): Date {
  const date = now ?? new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (period) {
    case 'monthly':
      return new Date(year, month, 1);
    case 'quarterly': {
      const quarterStart = Math.floor(month / 3) * 3;
      return new Date(year, quarterStart, 1);
    }
    case 'yearly':
      return new Date(year, 0, 1);
  }
}
