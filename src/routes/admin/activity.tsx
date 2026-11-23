import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Package,
  Truck,
  AlertCircle,
  Clock,
  Calendar,
  X,
  User,
  MapPin,
  ExternalLink
} from 'lucide-react';

export const Route = createFileRoute('/admin/activity')({
  head: () => ({
    meta: [
      { title: 'Activity Log — Pata Parcel Admin' },
      { name: 'description', content: 'Searchable audit log of parcel dispatches, status tracking updates, and raised issues for Pata Parcel admins.' },
      { property: 'og:title', content: 'Activity Log — Pata Parcel Admin' },
      { property: 'og:description', content: 'Searchable audit log of parcel dispatches, status tracking updates, and raised issues for Pata Parcel admins.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ActivityLogPage,
});

type ActivityType = 'all' | 'dispatch' | 'tracking' | 'complaint';

interface ActivityItem {
  id: string;
  type: 'dispatch' | 'tracking' | 'complaint';
  at: string;
  actorName: string;
  actorId?: string;
  referenceNumber?: string | undefined;
  parcelId?: string;
  destination?: string;
  status?: string;
  notes?: string | undefined;
  details: string;
  rawText: string;
}

interface ParcelRow {
  id: string;
  reference_number: string;
  seller_id: string;
  destination: string;
  sending_method: string;
  num_packages: number;
  total_sending_fee: number;
  tracking_status: string;
  payment_status: string;
  created_at: string;
}

interface TrackingRow {
  id: string;
  parcel_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_by: string;
}

interface ComplaintRow {
  id: string;
  seller_id: string;
  destination: string;
  status: string;
  issue_description: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  owner_name: string;
  business_name: string | null;
}

function ActivityLogPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');

  const [parcels, setParcels] = useState<ParcelRow[]>([]);
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const isAdmin = profile?.role === 'pap_admin';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { mode: undefined } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);

    try {
      const [parcelsRes, trackingRes, complaintsRes, profilesRes] = await Promise.all([
        supabase
          .from('parcels')
          .select('id, reference_number, seller_id, destination, sending_method, num_packages, total_sending_fee, tracking_status, payment_status, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('parcel_tracking')
          .select('id, parcel_id, status, notes, created_at, updated_by')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('complaints')
          .select('id, seller_id, destination, status, issue_description, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('profiles')
          .select('id, owner_name, business_name'),
      ]);

      setParcels((parcelsRes.data as ParcelRow[]) ?? []);
      setTracking((trackingRes.data as TrackingRow[]) ?? []);
      setComplaints((complaintsRes.data as ComplaintRow[]) ?? []);
      setProfiles((profilesRes.data as ProfileRow[]) ?? []);
    } catch (err) {
      console.error('Failed to load activity data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const nameOf = useMemo(() => {
    const m = new Map(profiles.map(p => [p.id, p.business_name || p.owner_name || 'Unnamed']));
    return (id: string) => m.get(id) ?? 'Unknown';
  }, [profiles]);

  const refOf = useMemo(() => {
    return new Map(parcels.map(p => [p.id, p.reference_number]));
  }, [parcels]);

  // Aggregate unified activity items
  const allActivities: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // 1. Dispatches
    for (const p of parcels) {
      const actor = nameOf(p.seller_id);
      const text = `${actor} dispatched parcel #${p.reference_number} to ${p.destination} (${p.num_packages} pkg, KES ${Math.round(p.total_sending_fee).toLocaleString()})`;
      items.push({
        id: `dispatch-${p.id}`,
        type: 'dispatch',
        at: p.created_at,
        actorName: actor,
        actorId: p.seller_id,
        referenceNumber: p.reference_number,
        parcelId: p.id,
        destination: p.destination,
        status: p.tracking_status,
        details: text,
        rawText: `${text} ${p.reference_number} ${actor} ${p.destination} dispatch ${p.sending_method} ${p.tracking_status} ${p.payment_status}`,
      });
    }

    // 2. Tracking updates
    for (const t of tracking) {
      const actor = nameOf(t.updated_by);
      const ref = refOf.get(t.parcel_id) ?? 'parcel';
      const statusLabel = t.status.replace(/_/g, ' ');
      const text = `${actor} updated ${ref.startsWith('PAP-') ? '#' + ref : ref} to "${statusLabel}"${t.notes ? ` — ${t.notes}` : ''}`;
      items.push({
        id: `tracking-${t.id}`,
        type: 'tracking',
        at: t.created_at,
        actorName: actor,
        actorId: t.updated_by,
        referenceNumber: refOf.get(t.parcel_id),
        parcelId: t.parcel_id,
        status: t.status,
        notes: t.notes ?? undefined,
        details: text,
        rawText: `${text} ${ref} ${actor} ${statusLabel} ${t.notes ?? ''} tracking status`,
      });
    }

    // 3. Complaints / Issues
    for (const c of complaints) {
      const actor = nameOf(c.seller_id);
      const text = `${actor} raised an issue (${c.status}): ${c.issue_description} (Destination: ${c.destination})`;
      items.push({
        id: `complaint-${c.id}`,
        type: 'complaint',
        at: c.created_at,
        actorName: actor,
        actorId: c.seller_id,
        destination: c.destination,
        status: c.status,
        notes: c.issue_description,
        details: text,
        rawText: `${text} ${actor} ${c.destination} ${c.status} ${c.issue_description} issue complaint`,
      });
    }

    // Sort descending by timestamp
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [parcels, tracking, complaints, nameOf, refOf]);

  // Filter activities based on search query, type, and date range
  const filteredActivities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = Date.now();

    return allActivities.filter(item => {
      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const itemTime = new Date(item.at).getTime();
        const diffDays = (now - itemTime) / (1000 * 60 * 60 * 24);
        if (dateRange === 'today' && diffDays > 1) return false;
        if (dateRange === '7days' && diffDays > 7) return false;
        if (dateRange === '30days' && diffDays > 30) return false;
      }

      // Search term
      if (q) {
        return item.rawText.toLowerCase().includes(q);
      }

      return true;
    });
  }, [allActivities, searchTerm, typeFilter, dateRange]);

  if (!authLoading && !profile) {
    return (
      <AppShell role="seller">
        <p className="py-10 text-center text-sm text-muted-foreground">
          Please sign in with an admin account to view the activity log.
        </p>
      </AppShell>
    );
  }

  if (!authLoading && profile && !isAdmin) {
    return (
      <AppShell role={profile.role as any}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          Only Pata Parcel admins can open this page.
        </p>
      </AppShell>
    );
  }

  const getTypeBadge = (type: ActivityItem['type']) => {
    switch (type) {
      case 'dispatch':
        return (
          <Badge className="bg-primary hover:bg-primary text-secondary text-[10px] font-semibold flex items-center gap-1">
            <Package className="h-3 w-3" /> Dispatch
          </Badge>
        );
      case 'tracking':
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold flex items-center gap-1">
            <Truck className="h-3 w-3" /> Status Update
          </Badge>
        );
      case 'complaint':
        return (
          <Badge variant="destructive" className="text-[10px] font-semibold flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Issue
          </Badge>
        );
    }
  };

  return (
    <AppShell role="pap_admin">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" /> Activity Log
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time audit log of platform operations, dispatches, tracking status shifts, and customer issues.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="self-start sm:self-auto text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference #, seller, staff, destination, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
            {/* Type filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {(
                [
                  { id: 'all', label: 'All Activities' },
                  { id: 'dispatch', label: 'Dispatches' },
                  { id: 'tracking', label: 'Tracking' },
                  { id: 'complaint', label: 'Issues' },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={typeFilter === tab.id ? 'default' : 'ghost'}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`h-7 px-2.5 text-xs ${
                    typeFilter === tab.id ? '' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Date range filters */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                <Calendar className="h-3 w-3" /> Time:
              </span>
              {(
                [
                  { id: 'all', label: 'All time' },
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: '7 days' },
                  { id: '30days', label: '30 days' },
                ] as const
              ).map((period) => (
                <Button
                  key={period.id}
                  size="sm"
                  variant={dateRange === period.id ? 'secondary' : 'outline'}
                  onClick={() => setDateRange(period.id)}
                  className="h-7 px-2 text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Results Count & Status Summary */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredActivities.length}</strong> of{' '}
            {allActivities.length} total events
            {searchTerm && ` for "${searchTerm}"`}
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-secondary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Activity List */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-secondary" />
              <span>Loading activity logs...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No activities found</p>
              <p className="text-xs">
                {searchTerm
                  ? 'No activity matched your search term or active filters.'
                  : 'No activity recorded yet for the selected criteria.'}
              </p>
              {searchTerm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setDateRange('all');
                  }}
                  className="mt-2 text-xs"
                >
                  Reset all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredActivities.map((act) => {
                const dateObj = new Date(act.at);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={act.id}
                    className="p-3 sm:p-4 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-0.5 shrink-0">
                        {getTypeBadge(act.type)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground leading-snug break-words">
                          {act.details}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          {act.actorName && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <User className="h-3 w-3 text-secondary" /> {act.actorName}
                            </span>
                          )}

                          {act.referenceNumber && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-semibold">
                              {act.referenceNumber}
                            </span>
                          )}

                          {act.destination && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {act.destination}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between text-[11px] text-muted-foreground pl-9 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/40">
                      <span className="font-medium text-foreground/90">{dateStr}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
