'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

interface SearchInputProps {
  value?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({ value = '', onSearch, placeholder, debounceMs = 300 }: SearchInputProps) {
  const t = useTranslations('common');
  const [internal, setInternal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(internal);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [internal, debounceMs, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        placeholder={placeholder || t('search')}
        className="ps-9"
      />
    </div>
  );
}
