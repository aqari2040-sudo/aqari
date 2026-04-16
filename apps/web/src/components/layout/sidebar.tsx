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
    <aside className="flex h-screen w-64 flex-col border-e bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b">
        <Link href={`/${locale}/dashboard`} className="text-2xl font-bold text-primary">
          Aqari
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname.includes(item.href);
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <Link
                  href={`/${locale}${item.href}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t p-4">
          <div className="text-sm font-medium">{user.name || user.email}</div>
          <div className="text-xs capitalize text-muted-foreground">{user.role}</div>
        </div>
      )}
    </aside>
  );
}
