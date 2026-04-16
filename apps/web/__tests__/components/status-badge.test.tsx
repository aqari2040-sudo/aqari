import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/shared/status-badge';

// StatusBadge renders a Badge with the correct label and variant based on status + locale.
// Component source: src/components/shared/status-badge.tsx

describe('StatusBadge', () => {
  it('renders correct label for "occupied" status', () => {
    render(<StatusBadge status="occupied" />);
    expect(screen.getByText('Occupied')).toBeInTheDocument();
  });

  it('renders correct label for "overdue" status', () => {
    render(<StatusBadge status="overdue" />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('renders with default styling for unknown status', () => {
    const unknownStatus = 'unknown_xyz_status';
    render(<StatusBadge status={unknownStatus} />);
    // Falls back to displaying the raw status string
    expect(screen.getByText(unknownStatus)).toBeInTheDocument();
    // The wrapping div should carry the 'outline' variant class (no background color)
    const badge = screen.getByText(unknownStatus);
    expect(badge.className).toMatch(/text-foreground/);
  });

  it('renders Arabic label when locale is "ar"', () => {
    render(<StatusBadge status="occupied" locale="ar" />);
    // Arabic label for 'occupied' is 'مشغول'
    expect(screen.getByText('مشغول')).toBeInTheDocument();
    // English label should NOT be present
    expect(screen.queryByText('Occupied')).not.toBeInTheDocument();
  });

  it('applies correct variant color class for "overdue" (destructive)', () => {
    render(<StatusBadge status="overdue" />);
    const badge = screen.getByText('Overdue');
    // The 'destructive' variant maps to bg-destructive in the Badge component
    expect(badge.className).toMatch(/bg-destructive/);
  });
});
