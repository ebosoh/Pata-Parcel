import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from '@tanstack/react-router';
import { BarChart3, Package, FileText, AlertCircle, LayoutDashboard, User, Inbox, Menu, X, Banknote } from 'lucide-react';
import type { UserRole } from '@/types/database';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ── Seller: 4 items — fits without hamburger ────────────────────────────────
const SELLER_MAIN: NavItem[] = [
  { to: '/seller/dispatch',    label: 'Dispatch',  icon: Package    },
  { to: '/seller/receipts',    label: 'Receipts',  icon: FileText   },
  { to: '/seller/complaints',  label: 'Issues',    icon: AlertCircle},
  { to: '/seller/profile',     label: 'Profile',   icon: User       },
];
const SELLER_OVERFLOW: NavItem[] = [];

// ── PAP Staff: Queue, Dispatch, Receipts visible; Issues + Profile in menu ──
const PAP_STAFF_MAIN: NavItem[] = [
  { to: '/pap/queue',    label: 'Queue',    icon: Inbox      },
  { to: '/pap/dispatch', label: 'Dispatch', icon: Package    },
  { to: '/pap/receipts', label: 'Receipts', icon: FileText   },
];
const PAP_STAFF_OVERFLOW: NavItem[] = [
  { to: '/pap/issues',   label: 'Issues',   icon: AlertCircle},
  { to: '/pap/profile',  label: 'Profile',  icon: User       },
];

// ── PAP Admin: Queue, Dispatch, Receipts visible; Stats, Staff, Issues in menu
const PAP_ADMIN_MAIN: NavItem[] = [
  { to: '/pap/queue',    label: 'Queue',    icon: Inbox      },
  { to: '/pap/dispatch', label: 'Dispatch', icon: Package    },
  { to: '/pap/receipts', label: 'Receipts', icon: FileText   },
];
const PAP_ADMIN_OVERFLOW: NavItem[] = [
  { to: '/admin/stats',      label: 'Stats',    icon: BarChart3      },
  { to: '/admin/dashboard',  label: 'Staff',    icon: LayoutDashboard},
  { to: '/admin/payments',   label: 'Payments', icon: Banknote       },
  { to: '/pap/issues',       label: 'Issues',   icon: AlertCircle    },
];

function getNav(role: UserRole | null): { main: NavItem[]; overflow: NavItem[] } {
  switch (role) {
    case 'seller':    return { main: SELLER_MAIN,    overflow: SELLER_OVERFLOW    };
    case 'pap_staff': return { main: PAP_STAFF_MAIN, overflow: PAP_STAFF_OVERFLOW };
    case 'pap_admin': return { main: PAP_ADMIN_MAIN, overflow: PAP_ADMIN_OVERFLOW };
    default:          return { main: [],              overflow: []                 };
  }
}

interface BottomNavProps {
  role: UserRole | null;
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { main, overflow } = getNav(role);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (main.length === 0 && overflow.length === 0) return null;

  const anyOverflowActive = overflow.some(item => location.pathname.startsWith(item.to));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-secondary bg-primary safe-bottom" ref={menuRef}>
      {/* ── Hamburger overflow panel ──────────────────────────────────────── */}
      {overflow.length > 0 && menuOpen && (
        <div className="absolute bottom-full left-0 right-0 mx-auto max-w-lg pb-1">
          <div className="mx-4 mb-2 overflow-hidden rounded-xl border border-secondary/30 bg-primary shadow-lg shadow-black/30">
            {overflow.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-colors border-b border-secondary/10 last:border-0 ${
                    isActive
                      ? 'text-secondary bg-white/5'
                      : 'text-primary-foreground hover:text-secondary hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-secondary' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {/* Main nav items */}
        {main.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-1 px-2 py-2 text-xs font-semibold transition-colors ${
                isActive ? 'text-secondary' : 'text-primary-foreground hover:text-secondary'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-secondary' : ''}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-t bg-secondary" />
              )}
            </Link>
          );
        })}

        {/* Hamburger button (only when there are overflow items) */}
        {overflow.length > 0 && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'More options'}
            aria-expanded={menuOpen}
            className={`relative flex flex-col items-center gap-1 px-2 py-2 text-xs font-semibold transition-colors ${
              menuOpen || anyOverflowActive ? 'text-secondary' : 'text-primary-foreground hover:text-secondary'
            }`}
          >
            {menuOpen
              ? <X className="h-5 w-5" />
              : <Menu className="h-5 w-5" />
            }
            <span>More</span>
            {anyOverflowActive && !menuOpen && (
              <span className="absolute bottom-0 h-0.5 w-8 rounded-t bg-secondary" />
            )}
          </button>
        )}
      </div>
    </nav>
  );
}
