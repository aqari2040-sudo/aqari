'use client';

import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.replace(segments.join('/'));
  };

  const otherLocale = locales.find((l) => l !== currentLocale) as Locale;

  return (
    <button
      onClick={() => switchLocale(otherLocale)}
      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
    >
      {localeNames[otherLocale]}
    </button>
  );
}
