import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '@/components/shared/data-table';

// DataTable uses next-intl's useTranslations hook — mock it so tests run outside Next.js.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      loading: 'Loading...',
      no_results: 'No results found',
    };
    return map[key] ?? key;
  },
}));

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: Column<Row>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

const sampleData: Row[] = [
  { id: '1', name: 'Tower A', status: 'occupied' },
  { id: '2', name: 'Villa B', status: 'vacant' },
];

describe('DataTable', () => {
  it('renders headers from columns config', () => {
    render(<DataTable columns={columns} data={sampleData} />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={sampleData} />);

    expect(screen.getByText('Tower A')).toBeInTheDocument();
    expect(screen.getByText('Villa B')).toBeInTheDocument();
    expect(screen.getByText('occupied')).toBeInTheDocument();
    expect(screen.getByText('vacant')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(
      <DataTable columns={columns} data={[]} emptyMessage="No properties found" />,
    );

    expect(screen.getByText('No properties found')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable columns={columns} data={[]} loading={true} />);

    // When loading=true the table body renders a single cell with the loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Data rows must not render while loading
    expect(screen.queryByText('Tower A')).not.toBeInTheDocument();
  });

  it('handles page change callback', () => {
    const onPageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        data={sampleData}
        total={60}
        page={1}
        limit={20}
        onPageChange={onPageChange}
      />,
    );

    // With total=60 and limit=20 there are 3 pages → pagination renders
    // The "next page" button (ChevronRight) should be enabled on page 1
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1]; // last button is "next page"
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
