'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DualDateHeader } from '@/components/dual-date-header';
import { ThemeToggle } from '@/components/theme-provider';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  PackageOpen,
  Receipt,
  ScrollText,
  Settings,
  LogOut,
  ShieldCheck,
  Building2,
  Boxes,
  Megaphone,
} from 'lucide-react';
import { logout } from '@/lib/api/auth';
import { toast } from 'sonner';

interface NavItem {
  href: string;
  labelKey: string;
  icon: ReactNode;
}

const STAFF_NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/beneficiaries', labelKey: 'nav.beneficiaries', icon: <Users className="h-4 w-4" /> },
  { href: '/donations', labelKey: 'nav.donations', icon: <HandCoins className="h-4 w-4" /> },
  { href: '/distributions', labelKey: 'nav.distributions', icon: <PackageOpen className="h-4 w-4" /> },
  { href: '/inventory', labelKey: 'nav.inventory', icon: <Boxes className="h-4 w-4" /> },
  { href: '/campaigns', labelKey: 'nav.campaigns', icon: <Megaphone className="h-4 w-4" /> },
  { href: '/bills', labelKey: 'nav.bills', icon: <Receipt className="h-4 w-4" /> },
  { href: '/audit', labelKey: 'nav.audit', icon: <ScrollText className="h-4 w-4" /> },
  { href: '/settings', labelKey: 'nav.settings', icon: <Settings className="h-4 w-4" /> },
];

const DONOR_NAV: NavItem[] = [
  { href: '/me/donations', labelKey: 'nav.myDonations', icon: <HandCoins className="h-4 w-4" /> },
  { href: '/me/receipts', labelKey: 'nav.myReceipts', icon: <Receipt className="h-4 w-4" /> },
  { href: '/me/profile', labelKey: 'nav.myProfile', icon: <Settings className="h-4 w-4" /> },
];

const PLATFORM_NAV: NavItem[] = [
  { href: '/platform/organizations', labelKey: 'nav.platformOrgs', icon: <Building2 className="h-4 w-4" /> },
  { href: '/audit', labelKey: 'nav.audit', icon: <ScrollText className="h-4 w-4" /> },
];

export function AppShell({
  kind,
  user,
  children,
  isPlatformAdmin = false,
}: {
  kind: 'staff' | 'donor';
  user: { fullName: string; email: string };
  children: ReactNode;
  isPlatformAdmin?: boolean;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const nav = isPlatformAdmin ? PLATFORM_NAV : kind === 'staff' ? STAFF_NAV : DONOR_NAV;

  async function onLogout() {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 flex-shrink-0 border-e border-border bg-background md:flex md:flex-col">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-lg font-bold">{t('app.name')}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{user.fullName}</div>
            <div>{user.email}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-primary">{t('app.name')}</span>
          </div>
          <DualDateHeader className="mx-auto flex-1 md:mx-0" />
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="md:hidden" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
