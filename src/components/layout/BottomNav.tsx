import { useLocation, Link } from '@tanstack/react-router';
import { Package, FileText, AlertCircle, LayoutDashboard, User, Inbox } from 'lucide-react';
import type { UserRole } from '@/types/database';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SELLER_NAV: NavItem[] = [
  { to: '/seller/dispatch', label: 'Dispatch', icon: Package },
  { to: '/seller/receipts', label: 'Receipts', icon: FileText },
  { to: '/seller/complaints', label: 'Issues', icon: AlertCircle },
  { to: '/seller/profile', label: 'Profile', icon: User },
];

const PAP_STAFF_NAV: NavItem[] = [
  { to: '/pap/queue', label: 'Queue', icon: Inbox },
  { to: '/pap/dispatch', label: 'Dispatch', icon: Package },
  { to: '/pap/receipts', label: 'Receipts', icon: FileText },
  { to: '/pap/profile', label: 'Profile', icon: User },
];

const PAP_ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/parcels', label: 'Parcels', icon: Package },
  { to: '/admin/sellers', label: 'Sellers', icon: User },
  { to: '/admin/complaints', label: 'Issues', icon: AlertCircle },
];

function getNavItems(role: UserRole | null): NavItem[] {
  switch (role) {
    case 'seller':
      return SELLER_NAV;
    case 'pap_staff':
      return PAP_STAFF_NAV;
    case 'pap_admin':
      return PAP_ADMIN_NAV;
    default:
      return [];
  }
}

interface BottomNavProps {
  role: UserRole | null;
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const navItems = getNavItems(role);

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background safe-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-t bg-secondary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
