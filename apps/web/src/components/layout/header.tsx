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

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher currentLocale={locale} />

        {/* Notifications bell */}
        <NotificationBell locale={locale} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
}
