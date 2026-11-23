import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, ArrowRight, Package, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LiveParcelSearch() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    navigate({ to: `/order/${clean}` as any });
  };

  const sampleCodes = ['HudsonEboso-012548', 'chic-boutique', 'PAP-SACCO-098'];

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleTrack} className="relative flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter tracking code or shop link (e.g. HudsonEboso-012548)..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 pl-10 pr-4 text-xs sm:text-sm rounded-xl border-2 border-primary/30 bg-background/90 shadow-sm focus:border-primary transition-all font-mono"
          />
        </div>
        <Button
          type="submit"
          disabled={!code.trim()}
          className="h-12 px-6 rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2 w-full sm:w-auto shrink-0"
        >
          <Package className="h-4 w-4" />
          Track Parcel
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span>Try sample code:</span>
        {sampleCodes.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCode(c)}
            className="font-mono text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
