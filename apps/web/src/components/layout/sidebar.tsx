'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  Wrench,
  BarChart3,
  ScrollText,
  Settings,
  Bell,
} from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'employee'] },
  { key: 'properties', href: '/properties', icon: Building2, roles: ['owner', 'employee'] },
  { key: 'units', href: '/units', icon: DoorOpen, roles: ['owner', 'employee'] },
  { key: 'tenants', href: '/tenants', icon: Users, roles: ['owner', 'employee'] },
  { key: 'contracts', href: '/contracts', icon: FileText, roles: ['owner', 'employee'] },
  { key: 'payments', href: '/payments', icon: CreditCard, roles: ['owner', 'employee'] },
  { key: 'maintenance', href: '/maintenance', icon: Wrench, roles: ['owner', 'employee'] },
  { key: 'notifications', href: '/notifications', icon: Bell, roles: ['owner', 'employee', 'tenant'] },
  { key: 'reports', href: '/reports', icon: BarChart3, roles: ['owner'] },
  { key: 'audit_log', href: '/audit', icon: ScrollText, roles: ['owner'] },
  { key: 'settings', href: '/settings', icon: Settings, roles: ['owner'] },
];

export function Sidebar({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const filteredItems = navItems.filter(
    (item) => !user?.role || item.roles.includes(user.role),
  );

  return (
    <aside className="flex h-screen w-60 flex-col bg-sheen-black">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-white/10 px-4">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
          <img src="/logo.png" alt="Aqari" className="h-10 w-10 brightness-0 invert" />
          <div>
            <span className="font-display text-xl font-bold text-sheen-gold">Aqari</span>
            <span className="block text-xs text-sheen-cream/50">عقاري</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname.includes(item.href);
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <Link
                  href={`/${locale}${item.href}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sheen-gold/15 text-sheen-gold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-sheen-cream',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-body">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sheen-gold/20">
              <span className="text-sm font-bold text-sheen-gold">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-sheen-cream">{user.name || user.email}</div>
              <div className="text-xs capitalize text-gray-500">{user.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
