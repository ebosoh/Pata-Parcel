import { Link } from '@tanstack/react-router';
import { Package } from 'lucide-react';

const LINK_CLASS =
  'inline-flex items-center rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground underline decoration-secondary decoration-2 underline-offset-4 transition-colors hover:bg-primary-foreground/20 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary';

interface FooterProps {
  /** Extra bottom spacing so the fixed bottom nav never covers the footer. */
  className?: string;
}

/**
 * Footer banner in the same colour as the header (primary).
 * Links sit on their own light chip with a yellow underline so they stay
 * readable against the green background instead of blending in.
 */
export function Footer({ className = '' }: FooterProps) {
  return (
    <footer
      className={`border-t-2 border-secondary bg-primary text-primary-foreground ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-secondary" />
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-base font-bold leading-tight text-primary-foreground">
                Pata Parcel
              </span>
              <span className="text-[10px] font-medium leading-tight text-secondary">
                Delivering Trust, Every Time
              </span>
            </div>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-2">
              <li>
                <Link to="/" className={LINK_CLASS}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" search={{ mode: 'signup' }} className={LINK_CLASS}>
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/login" search={{ mode: undefined }} className={LINK_CLASS}>
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/seller/dispatch" className={LINK_CLASS}>
                  Seller Portal
                </Link>
              </li>
              <li>
                <Link to="/pap/queue" className={LINK_CLASS}>
                  PAP Hub
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-4 border-t border-primary-foreground/25 pt-3 text-center">
          <p className="text-[11px] font-medium text-primary-foreground/90">
            © {new Date().getFullYear()} Pata Parcel Kenya. Delivering Trust, Every Time.
          </p>
        </div>
      </div>
    </footer>
  );
}
