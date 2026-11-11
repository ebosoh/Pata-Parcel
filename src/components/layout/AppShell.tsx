import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/database';

interface AppShellProps {
  children: ReactNode;
  role: UserRole | null;
  showNav?: boolean;
}

const ADMIN_AREAS = [
  { to: '/admin/dashboard', prefix: '/admin', label: 'Admin' },
  { to: '/pap/queue', prefix: '/pap', label: 'Staff' },
  { to: '/seller/dispatch', prefix: '/seller', label: 'Seller' },
] as const;

/** Super admins can jump between the admin, staff and seller areas. */
function AdminAreaSwitcher() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  if (profile?.role !== 'pap_admin') return null;
  return (
    <div className="mb-4 flex items-center gap-2" role="navigation" aria-label="Switch area">
      <span className="text-xs text-muted-foreground">View as:</span>
      <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
        {ADMIN_AREAS.map((a) => {
          const active = pathname.startsWith(a.prefix);
          return (
            <Link
              key={a.to}
              to={a.to}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppShell({ children, role, showNav = true }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <AdminAreaSwitcher />
          {children}
        </div>
      </main>
      {showNav && <BottomNav role={role} />}
    </div>
  );
}
