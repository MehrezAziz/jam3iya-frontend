'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  Menu,
  X,
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

function SidebarNav({
  nav,
  pathname,
  t,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string | null;
  t: (key: string) => string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {nav.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export function AppShell({
  kind,
  user,
  children,
  isPlatformAdmin = false,
  brandTitle,
}: {
  kind: 'staff' | 'donor';
  user: { fullName: string; email: string };
  children: ReactNode;
  isPlatformAdmin?: boolean;
  /** When set (e.g. organization legal name), shown in the shell header instead of the app name. */
  brandTitle?: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const nav = isPlatformAdmin ? PLATFORM_NAV : kind === 'staff' ? STAFF_NAV : DONOR_NAV;
  const headerTitle = brandTitle?.trim() || t('app.name');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  async function onLogout() {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const sidebarFooter = (
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
  );

  return (
    <div className="min-h-screen md:ps-64">
      {/* Desktop sidebar — fixed, does not scroll with main content */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-background md:flex">
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="truncate text-lg font-bold" title={headerTitle}>
              {headerTitle}
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav nav={nav} pathname={pathname} t={t} />
        </div>
        <div className="shrink-0">{sidebarFooter}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label={t('common.close')}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-border bg-background shadow-lg transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="truncate text-lg font-bold" title={headerTitle}>
              {headerTitle}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('common.close')}
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <SidebarNav nav={nav} pathname={pathname} t={t} onNavigate={() => setMobileOpen(false)} />
        {sidebarFooter}
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={t('nav.menu')}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-primary" title={headerTitle}>
              {headerTitle}
            </span>
          </div>
          <DualDateHeader className="mx-auto hidden flex-1 md:block md:mx-0" />
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
