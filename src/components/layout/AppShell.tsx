import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import type { UserRole } from '@/types/database';

interface AppShellProps {
  children: ReactNode;
  role: UserRole | null;
  showNav?: boolean;
}

export function AppShell({ children, role, showNav = true }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {children}
        </div>
      </main>
      {showNav && <BottomNav role={role} />}
    </div>
  );
}
