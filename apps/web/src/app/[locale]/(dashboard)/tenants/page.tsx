'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Plus, Phone, Mail } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { usePagination } from '@/hooks/use-pagination';

export default function TenantsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('tenants');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, handleSearch, queryParams } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', queryParams],
    queryFn: async () => {
      const res = await apiClient.get('/tenants', { params: queryParams });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'full_name',
      header: t('full_name'),
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{locale === 'ar' ? item.full_name_ar : item.full_name}</div>
          <div className="text-xs text-muted-foreground">{locale === 'ar' ? item.full_name : item.full_name_ar}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: t('phone'),
      render: (item) => (
        <div className="flex items-center gap-1.5" dir="ltr">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          {item.phone}
        </div>
      ),
    },
    {
      key: 'email',
      header: t('email'),
      render: (item) =>
        item.email ? (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {item.email}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'id_type',
      header: t('id_type'),
      render: (item) => (
        <span className="capitalize">
          {item.id_type === 'emirates_id' ? t('emirates_id') : t('passport')}
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (item) => {
        const activeContract = item.contracts?.find((c: any) => c.status === 'active');
        return activeContract?.unit?.unit_number || <span className="text-muted-foreground">—</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/tenants/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="mb-4">
        <div className="w-72">
          <SearchInput onSearch={handleSearch} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={isLoading}
        onPageChange={setPage}
        onSort={handleSort}
        onRowClick={(item) => router.push(`/${locale}/tenants/${item.id}`)}
      />
    </div>
  );
}
