import { Package } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Package className="h-7 w-7 text-secondary" />
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-primary-foreground">
              Pata Parcel
            </span>
            <span className="text-[10px] leading-tight text-secondary font-medium">
              Delivering Trust, Every Time
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
