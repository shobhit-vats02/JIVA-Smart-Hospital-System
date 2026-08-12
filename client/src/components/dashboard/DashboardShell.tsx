'use client';

import { type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, type LucideIcon, Bell, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  milestone?: string;
}

/**
 * Role-aware dashboard shell. Responsive: full sidebar on desktop, slide-out
 * drawer with hamburger toggle on mobile. Controlled by the parent page.
 */
export function DashboardShell({
  navItems,
  userRoleLabel,
  active,
  onNavigate,
  children,
  unreadCount = 0,
}: {
  navItems: NavItem[];
  userRoleLabel: string;
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  unreadCount?: number;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast('info', 'Logged out', 'See you soon.');
    router.push('/login');
  };

  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const activeItem = navItems.find((i) => i.id === active);

  const SidebarInner = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo size="sm" />
        <button className="rounded-lg p-2 text-ink-3 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-ink-3">{userRoleLabel}</p>
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-primary-soft hover:text-primary'
                )}
              >
                <ItemIcon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
                {item.milestone && (
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">{item.milestone}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary-soft/40 p-3">
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-royal text-sm font-bold text-white">
              {initials(user?.name || '?')}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-ink-3">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn-glass flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl lg:flex">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card/90 backdrop-blur-xl lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {SidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-nav-bg/70 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold">{activeItem?.label || 'Dashboard'}</h1>
              <p className="text-xs text-ink-3">{userRoleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">
                <Bell className="h-3.5 w-3.5" /> {unreadCount} new
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>
        <motion.main
          id="main-content"
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="p-4 sm:p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
