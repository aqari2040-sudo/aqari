'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { LanguageSwitcher } from './language-switcher';
import { NotificationBell } from './notification-bell';

interface HeaderProps {
  locale: string;
  onMenuClick?: () => void;
}

export function Header({ locale, onMenuClick }: HeaderProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}/login`);
  };

  const today = new Date().toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sheen-cream bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-sheen-muted hover:bg-sheen-cream lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden text-sm text-sheen-muted md:block">{today}</span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher currentLocale={locale} />

        {/* Notifications bell */}
        <NotificationBell locale={locale} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-sheen-muted hover:bg-sheen-cream hover:text-sheen-black transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
}
