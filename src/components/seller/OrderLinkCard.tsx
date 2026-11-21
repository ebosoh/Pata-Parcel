import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Link2, Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export function OrderLinkCard({ code, businessName }: { code: string; businessName: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = `${origin}/order/${code}`;
  const message = `Order from ${businessName || 'us'} via Pata Parcel — fill in your delivery details here: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied — paste it on TikTok, Facebook, Instagram or WhatsApp');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Press and hold the link to copy it.');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Order via Pata Parcel', text: message, url: link }); } catch { /* cancelled */ }
    } else {
      void copy();
    }
  };

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Your buyer order link</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this link with buyers. Their delivery details land straight in your Dispatch list, waiting for you to verify payment.
      </p>
      <div className="break-all rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs text-foreground select-all">
        {origin ? link : '…'}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" onClick={copy} disabled={!origin} className="h-10 font-bold">
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button asChild variant="outline" className="h-10 font-bold">
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={share} disabled={!origin} className="h-10 font-bold">
          <Share2 className="mr-1 h-4 w-4" /> Share
        </Button>
      </div>
    </Card>
  );
}
