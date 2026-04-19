'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Plus, Paperclip, FileText, X, ExternalLink } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { usePagination } from '@/hooks/use-pagination';

export default function PropertiesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('properties');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, handleSearch, queryParams } = usePagination();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; file_url: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', queryParams, typeFilter],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient.get('/properties', { params });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: t('name'),
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{locale === 'ar' ? item.name_ar : item.name}</div>
          <div className="text-xs text-muted-foreground">{locale === 'ar' ? item.name : item.name_ar}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('type'),
      render: (item) => (
        <span className="capitalize">{item.type === 'tower' ? t('tower') : t('house_group')}</span>
      ),
    },
    {
      key: 'address',
      header: t('address'),
      render: (item) => locale === 'ar' ? item.address_ar : item.address,
    },
    {
      key: 'unit_count',
      header: t('unit_count'),
      sortable: true,
      render: (item) => (
        <span className="font-medium">{item._count?.units ?? item.unit_count ?? 0}</span>
      ),
    },
    {
      key: 'documents',
      header: locale === 'ar' ? 'المستندات' : 'Documents',
      render: (item) => (
        <DocumentsBadge
          docs={(item.documents || []) as { id: string; name: string; file_url: string }[]}
          locale={locale}
          onPreview={(d) => setPreviewDoc(d)}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/properties/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput onSearch={handleSearch} />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{tc('filter')}: {t('type')}</option>
          <option value="tower">{t('tower')}</option>
          <option value="house_group">{t('house_group')}</option>
        </select>
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
        onRowClick={(item) => router.push(`/${locale}/properties/${item.id}`)}
      />

      {previewDoc && (
        <FilePreviewModal
          name={previewDoc.name}
          fileUrl={previewDoc.file_url}
          locale={locale}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

function DocumentsBadge({
  docs,
  locale,
  onPreview,
}: {
  docs: { id: string; name: string; file_url: string }[];
  locale: string;
  onPreview: (d: { name: string; file_url: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isAr = locale === 'ar';

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const popWidth = 240;
      const top = rect.bottom + 4;
      const left = isAr
        ? Math.max(8, rect.right - popWidth)
        : Math.min(window.innerWidth - popWidth - 8, rect.left);
      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, isAr]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (docs.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors',
          open ? 'bg-sheen-gold/15 text-sheen-gold' : 'text-sheen-gold hover:bg-sheen-gold/10',
        )}
      >
        <Paperclip className="h-3.5 w-3.5" />
        <span>{docs.length}</span>
      </button>
      {open && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: 240,
            }}
            className="z-[100] rounded-md border bg-white p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              {isAr ? 'الملفات المرفقة' : 'Attached files'}
            </div>
            <ul className="space-y-0.5 max-h-[300px] overflow-auto">
              {docs.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-sheen-cream text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onPreview({ name: d.name, file_url: d.file_url });
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-sheen-gold" />
                    <span className="truncate">{d.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

function FilePreviewModal({
  name,
  fileUrl,
  locale,
  onClose,
}: {
  name: string;
  fileUrl: string;
  locale: string;
  onClose: () => void;
}) {
  const isAr = locale === 'ar';
  const lower = fileUrl.toLowerCase();
  const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(lower);
  const isPdf = /\.pdf(\?|$)/.test(lower);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-sheen-black shadow-2xl"
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-sheen-gold" />
            <h3 className="truncate text-sm font-semibold text-sheen-cream">{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-sheen-gold/40 px-3 py-1.5 text-xs text-sheen-gold hover:bg-sheen-gold/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isAr ? 'فتح في نافذة جديدة' : 'Open in new tab'}
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-sheen-cream"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-black/40">
          {isImage ? (
            <img
              src={fileUrl}
              alt={name}
              className="max-h-full max-w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={name}
              className="h-full w-full"
            />
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">
              {isAr
                ? 'لا يمكن معاينة هذا النوع من الملفات. افتحه في نافذة جديدة.'
                : 'Preview not available for this file type. Open it in a new tab.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
