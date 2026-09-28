import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertCircle, 
  Plus, 
  Clock, 
  CheckCircle, 
  Phone, 
  MapPin, 
  Package, 
  Loader2,
  RefreshCw 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPhoneDisplay, isValidKenyanPhone } from '@/lib/constants';
import type { Complaint, ComplaintStatus } from '@/types/database';

export const Route = createFileRoute('/seller/complaints')({
  component: SellerComplaintsPage,
});

function getComplaintStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case 'open':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" /> Open
        </Badge>
      );
    case 'investigating':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
          Investigating
        </Badge>
      );
    case 'resolved':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle className="h-3 w-3 mr-1" /> Resolved
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function SellerComplaintsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [packageType, setPackageType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchComplaints = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComplaints(data as Complaint[]);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!buyerName.trim()) {
      setFormError('Please enter buyer name');
      return;
    }

    const cleanPhone = buyerPhone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setFormError('Please enter a valid Kenyan phone number (e.g. 0712 345 678)');
      return;
    }

    if (!destination.trim()) {
      setFormError('Please enter destination town');
      return;
    }

    if (!issueDescription.trim()) {
      setFormError('Please describe the issue reported by the buyer');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('complaints').insert({
        seller_id: user!.id,
        buyer_name: buyerName.trim(),
        buyer_phone: cleanPhone,
        destination: destination.trim(),
        package_type: packageType.trim() || 'General Package',
        issue_description: issueDescription.trim(),
        status: 'open',
      } as any);

      if (error) {
        setFormError(error.message);
      } else {
        // Reset form & close
        setBuyerName('');
        setBuyerPhone('');
        setDestination('');
        setPackageType('');
        setIssueDescription('');
        setIsDialogOpen(false);
        await fetchComplaints();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to file issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell role="seller">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Buyer Complaints</h1>
            <p className="text-xs text-muted-foreground">
              Report missing packages, delays, or issues for Pata Parcel operations team to investigate
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 px-3 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Report Issue</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Report Buyer Issue
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                {formError && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="c_buyer_name" className="text-xs font-medium">Buyer Name *</Label>
                  <Input
                    id="c_buyer_name"
                    placeholder="e.g. Grace Wanjiku"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c_buyer_phone" className="text-xs font-medium">Buyer Phone Number *</Label>
                  <Input
                    id="c_buyer_phone"
                    placeholder="0712 345 678"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="c_dest" className="text-xs font-medium">Destination *</Label>
                    <Input
                      id="c_dest"
                      placeholder="e.g. Eldoret"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="c_pkg" className="text-xs font-medium">Package Type</Label>
                    <Input
                      id="c_pkg"
                      placeholder="e.g. Mummy Jeans"
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c_desc" className="text-xs font-medium">Describe Issue *</Label>
                  <Textarea
                    id="c_desc"
                    placeholder="e.g. Package not received at Eldoret SACCO office, or size was small"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    required
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 text-xs h-9 font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {submitting ? (
                      <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Submitting...</>
                    ) : (
                      'Submit Issue'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500/70 mb-3" />
            <h3 className="font-semibold text-foreground text-sm">No reported complaints</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              All your buyers' parcels are running smoothly! If any customer calls with a delivery concern, click "Report Issue" above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <Card key={c.id} className="p-4 border border-border/80 bg-card space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-sm text-foreground">{c.buyer_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-primary" /> {formatPhoneDisplay(c.buyer_phone)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" /> {c.destination}
                      </span>
                    </div>
                  </div>
                  <div>
                    {getComplaintStatusBadge(c.status)}
                  </div>
                </div>

                <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 text-xs">
                  <p className="text-foreground font-medium mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Package className="h-3 w-3" /> Item: {c.package_type}
                  </p>
                  <p className="text-foreground/90">{c.issue_description}</p>
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                  <span>Reported on {new Date(c.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {c.resolved_at && (
                    <span className="text-emerald-600 font-medium">
                      Resolved on {new Date(c.resolved_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
