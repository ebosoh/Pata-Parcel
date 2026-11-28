import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StorageImage } from '@/components/shared/StorageImage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SellerDispatchesTable } from '@/components/seller/SellerDispatchesTable';
import { AdminSellerProfileEditor } from '@/components/seller/AdminSellerProfileEditor';
import {
  Store,
  Search,
  Phone,
  Calendar,
  RefreshCw,
  Package,
  Building2,
  User,
  Loader2,
  ExternalLink,
  MessageCircle,
  MapPin,
  Tag,
  Copy,
  Check,
  ArrowUpDown,
  ShoppingBag,
  TrendingUp,
  X,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { BUSINESS_TYPES, formatPhoneDisplay } from '@/lib/constants';
import type { Parcel } from '@/types/database';
import {
  filterSellers,
  sortSellers,
  getSellerDisplayName,
  type SellerProfileItem,
  type SellerSortOption,
} from '@/lib/sellerDirectory';
import { waRecipientFor } from '@/lib/receiptSharing';

export const Route = createFileRoute('/admin/sellers')({
  validateSearch: (search: Record<string, unknown>): { sellerId?: string | undefined } => ({
    sellerId: (typeof search['sellerId'] === 'string' && search['sellerId'].trim() ? search['sellerId'].trim() : undefined) as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Sellers Directory — Pata Parcel Admin' },
      { name: 'description', content: 'Database and profiles of all online sellers registered on Pata Parcel.' },
      { property: 'og:title', content: 'Sellers Directory — Pata Parcel Admin' },
      { property: 'og:description', content: 'Database and profiles of all online sellers registered on Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminSellersPage,
});

interface SellerParcelDetail {
  id: string;
  reference_number: string;
  buyer_name: string;
  buyer_phone: string;
  destination: string;
  sending_method: string;
  psv_sacco: string | null;
  tracking_status: string;
  payment_status: string;
  total_sending_fee: number;
  created_at: string;
}

interface SellerReceiptSummary {
  id: string;
  receipt_image_url: string;
  created_at: string;
  parcel_id: string;
}

export function AdminSellersPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { sellerId: urlSellerId } = Route.useSearch();

  const [sellers, setSellers] = useState<SellerProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SellerSortOption>('parcels_desc');

  // Selected Seller Profile View
  const [selectedSeller, setSelectedSeller] = useState<SellerProfileItem | null>(null);
  const [sellerParcels, setSellerParcels] = useState<Parcel[]>([]);
  const [sellerReceipts, setSellerReceipts] = useState<SellerReceiptSummary[]>([]);
  const [loadingProfileDetails, setLoadingProfileDetails] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch all sellers from profiles and aggregate parcel statistics
  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles of sellers (exclude staff and admin)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const nonStaff = (profilesData || []).filter(
        (p) => p.role !== 'pap_admin' && p.role !== 'pap_staff',
      );

      // 2. Fetch parcels to aggregate parcel counts per seller
      const { data: parcelsData } = await supabase
        .from('parcels')
        .select('id, seller_id, tracking_status, total_sending_fee');

      const parcelMap = new Map<string, { total: number; delivered: number; revenue: number }>();

      (parcelsData || []).forEach((p) => {
        if (!p.seller_id) return;
        const current = parcelMap.get(p.seller_id) || { total: 0, delivered: 0, revenue: 0 };
        current.total += 1;
        if (p.tracking_status === 'delivered') {
          current.delivered += 1;
        }
        current.revenue += Number(p.total_sending_fee || 0);
        parcelMap.set(p.seller_id, current);
      });

      const combined: SellerProfileItem[] = nonStaff.map((s) => {
        const stats = parcelMap.get(s.id) || { total: 0, delivered: 0, revenue: 0 };
        return {
          id: s.id,
          owner_name: s.owner_name || '',
          business_name: s.business_name,
          phone: s.phone || '',
          business_type: s.business_type,
          location: s.location,
          order_link_code: s.order_link_code,
          profile_picture_url: s.profile_picture_url,
          role: s.role,
          created_at: s.created_at,
          totalParcels: stats.total,
          deliveredParcels: stats.delivered,
          totalSendingFee: stats.revenue,
        };
      });

      setSellers(combined);
    } catch (err: any) {
      console.error('Failed to load sellers:', err);
      toast.error('Failed to load sellers directory: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'pap_admin') {
      fetchSellers();
    }
  }, [profile?.role, fetchSellers]);

  // Load detailed profile for selected seller
  const loadSellerDetails = useCallback(async (seller: SellerProfileItem) => {
    setSelectedSeller(seller);
    setProfileModalOpen(true);
    setLoadingProfileDetails(true);

    try {
      // 1. Fetch recent parcels (full fields for SellerDispatchesTable + AdminParcelControls)
      const { data: parcels } = await supabase
        .from('parcels')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const fetchedParcels = (parcels as Parcel[]) || [];
      setSellerParcels(fetchedParcels);

      // 2. Fetch receipts if any parcels exist
      const parcelIds = fetchedParcels.map((p) => p.id);
      if (parcelIds.length > 0) {
        const { data: receipts } = await supabase
          .from('parcel_receipts')
          .select('id, receipt_image_url, created_at, parcel_id')
          .in('parcel_id', parcelIds.slice(0, 25))
          .order('created_at', { ascending: false })
          .limit(8);

        setSellerReceipts((receipts as SellerReceiptSummary[]) || []);
      } else {
        setSellerReceipts([]);
      }
    } catch (err) {
      console.error('Failed to load seller details:', err);
    } finally {
      setLoadingProfileDetails(false);
    }
  }, []);

  // Re-fetch parcels for the currently selected seller (called by AdminParcelControls after edit/delete)
  const reloadSellerParcels = useCallback(async () => {
    if (!selectedSeller) return;
    const { data } = await supabase
      .from('parcels')
      .select('*')
      .eq('seller_id', selectedSeller.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setSellerParcels((data as Parcel[]) || []);
  }, [selectedSeller]);

  // Sync with URL query parameter
  useEffect(() => {
    if (urlSellerId && sellers.length > 0) {
      const match = sellers.find((s) => s.id === urlSellerId);
      if (match && selectedSeller?.id !== match.id) {
        loadSellerDetails(match);
      }
    }
  }, [urlSellerId, sellers, selectedSeller, loadSellerDetails]);

  // Open a seller's profile
  const handleOpenSellerProfile = (seller: SellerProfileItem) => {
    navigate({ to: '/admin/sellers', search: { sellerId: seller.id }, replace: true });
    loadSellerDetails(seller);
  };

  // Close profile view
  const handleCloseProfile = () => {
    setProfileModalOpen(false);
    setSelectedSeller(null);
    navigate({ to: '/admin/sellers', search: { sellerId: undefined }, replace: true });
  };

  // Filter & Sort
  const filteredAndSortedSellers = useMemo(() => {
    const filtered = filterSellers(sellers, {
      query: searchQuery,
      businessType: businessTypeFilter,
      activity: activityFilter,
    });
    return sortSellers(filtered, sortBy);
  }, [sellers, searchQuery, businessTypeFilter, activityFilter, sortBy]);

  // KPI Calculations
  const totalSellersCount = sellers.length;
  const activeSellersCount = sellers.filter((s) => (s.totalParcels ?? 0) > 0).length;
  const totalParcelsCount = sellers.reduce((sum, s) => sum + (s.totalParcels ?? 0), 0);
  const totalRevenue = sellers.reduce((sum, s) => sum + (s.totalSendingFee ?? 0), 0);

  // Copy helpers
  const handleCopyOrderLink = (code?: string) => {
    if (!code) return;
    const url = `${window.location.origin}/order/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Public order link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopySellerId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Seller ID copied!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Admin access check
  if (!authLoading && profile && profile.role !== 'pap_admin') {
    return (
      <AppShell role={profile.role as any}>
        <div className="text-center py-12 px-4 max-w-md mx-auto">
          <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground">Admin Access Required</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Only Pata Parcel administrators can open and browse the sellers directory.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="pap_admin">
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Sellers Directory
            </h1>
            <p className="text-xs text-muted-foreground">
              Browse registered online sellers, inspect their shops, contact details, and parcel dispatch records
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSellers}
            disabled={loading}
            className="h-9 gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* 1. KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5 border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Sellers</p>
              <Store className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">{totalSellersCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Registered accounts</p>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Active Sellers</p>
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">{activeSellersCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalSellersCount > 0 ? `${Math.round((activeSellersCount / totalSellersCount) * 100)}% with dispatches` : '0%'}
            </p>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Dispatches</p>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">{totalParcelsCount.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Parcels processed</p>
          </Card>

          <Card className="p-3.5 border border-border/80 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Sending Fees Volume</p>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">KES {Math.round(totalRevenue).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Dispatched parcel value</p>
          </Card>
        </div>

        {/* 2. Filters & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-card p-3 rounded-xl border border-border/80">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, shop, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Business Type */}
          <div>
            <select
              aria-label="Filter by business type"
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Business Types</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Activity Filter */}
          <div>
            <select
              aria-label="Filter by activity"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as any)}
              className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Activity</option>
              <option value="active">Active Sellers (Has Dispatches)</option>
              <option value="inactive">New / Inactive (0 Dispatches)</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              aria-label="Sort sellers by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SellerSortOption)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="parcels_desc">Parcels: Most First</option>
              <option value="parcels_asc">Parcels: Least First</option>
              <option value="business_asc">Business: A → Z</option>
              <option value="business_desc">Business: Z → A</option>
              <option value="name_asc">Owner Name: A → Z</option>
              <option value="name_desc">Owner Name: Z → A</option>
              <option value="date_desc">Joined: Newest First</option>
              <option value="date_asc">Joined: Oldest First</option>
            </select>
          </div>
        </div>

        {/* 3. Sellers Directory List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground px-0.5">
            <span>
              Showing <strong>{filteredAndSortedSellers.length}</strong> of {sellers.length} sellers
            </span>
            {(searchQuery || businessTypeFilter !== 'all' || activityFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setBusinessTypeFilter('all');
                  setActivityFilter('all');
                }}
                className="h-6 text-xs px-2 text-primary"
              >
                Reset filters
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse border border-border" />
              ))}
            </div>
          ) : filteredAndSortedSellers.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-card/50 text-xs text-muted-foreground">
              <Store className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground text-sm">No sellers found</p>
              <p className="mt-1">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAndSortedSellers.map((seller) => {
                const displayName = getSellerDisplayName(seller);
                const hasParcels = (seller.totalParcels ?? 0) > 0;
                const waDigits = waRecipientFor(seller.phone);

                return (
                  <Card
                    key={seller.id}
                    className="p-4 border border-border/80 bg-card hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Avatar & Clickable Name */}
                      <div className="flex items-start gap-3">
                        <div
                          className="h-11 w-11 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer"
                          onClick={() => handleOpenSellerProfile(seller)}
                        >
                          {seller.profile_picture_url ? (
                            <StorageImage
                              src={seller.profile_picture_url}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-xs text-primary">
                              {seller.owner_name?.slice(0, 2).toUpperCase() || 'S'}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleOpenSellerProfile(seller)}
                            className="text-left font-bold text-sm text-foreground hover:text-primary transition-colors truncate block w-full group-hover:underline"
                            title={`View profile for ${displayName}`}
                          >
                            {seller.business_name || seller.owner_name || 'Unnamed Seller'}
                          </button>
                          {seller.business_name && seller.owner_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              Owner: {seller.owner_name}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            {seller.business_type ? (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                {seller.business_type}
                              </Badge>
                            ) : null}
                            {hasParcels ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] py-0 px-1.5 font-medium">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        {seller.location && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">{seller.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-mono">{formatPhoneDisplay(seller.phone) || 'No phone'}</span>
                          </div>
                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                        </div>

                        {/* Order Link Code */}
                        {seller.order_link_code && (
                          <div className="flex items-center justify-between text-[11px] bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground truncate">Order Code:</span>
                            <span className="font-mono font-bold text-foreground">
                              {seller.order_link_code}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Parcel Stats Mini-Bar */}
                      <div className="rounded-lg bg-muted/40 p-2 text-xs flex justify-between items-center">
                        <div>
                          <span className="text-muted-foreground text-[11px]">Dispatches: </span>
                          <span className="font-bold text-foreground">{seller.totalParcels ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">Delivered: </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {seller.deliveredParcels ?? 0}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(seller.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-3 mt-1 border-t border-border/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSellerProfile(seller)}
                        className="w-full h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <User className="h-3.5 w-3.5" />
                        View Full Profile & Dispatches
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Comprehensive Seller Profile Modal */}
        {selectedSeller && (
          <Dialog open={profileModalOpen} onOpenChange={(open) => (!open ? handleCloseProfile() : null)}>
            <DialogContent className="w-[calc(100%-1rem)] max-w-2xl grid-cols-1 max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-5">
              <DialogHeader>
                <div className="flex min-w-0 items-center justify-between pb-1 pr-6">
                  <DialogTitle className="text-base font-bold flex min-w-0 items-center gap-2">
                    <Store className="h-5 w-5 shrink-0 text-primary" />
                    Seller Profile & Dispatch Details
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="min-w-0 space-y-4 pt-1 text-xs">
                {/* Profile Card Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border/80 bg-muted/30 p-4">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                    {selectedSeller.profile_picture_url ? (
                      <StorageImage
                        src={selectedSeller.profile_picture_url}
                        alt={selectedSeller.owner_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-xl text-primary">
                        {selectedSeller.owner_name?.slice(0, 2).toUpperCase() || 'S'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        {selectedSeller.business_name || selectedSeller.owner_name || 'Online Seller'}
                      </h2>
                      {selectedSeller.business_type && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedSeller.business_type}
                        </Badge>
                      )}
                      {(selectedSeller.totalParcels ?? 0) > 0 ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                          Active Seller
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          New Account
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Owner: <span className="font-medium text-foreground">{selectedSeller.owner_name}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono text-foreground font-medium">
                          {formatPhoneDisplay(selectedSeller.phone) || 'No phone'}
                        </span>
                      </div>
                      {selectedSeller.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{selectedSeller.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Joined {new Date(selectedSeller.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                {user && (
                  <AdminSellerProfileEditor
                    key={selectedSeller.id}
                    seller={selectedSeller}
                    userId={user.id}
                    onSaved={(updated) => {
                      setSelectedSeller(updated);
                      setSellers((current) => current.map((seller) => seller.id === updated.id ? updated : seller));
                    }}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {waRecipientFor(selectedSeller.phone) && (
                    <a
                      href={`https://wa.me/${waRecipientFor(selectedSeller.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Seller
                    </a>
                  )}

                  {selectedSeller.phone && (
                    <a
                      href={`tel:${selectedSeller.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium text-xs transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" /> Call Phone
                    </a>
                  )}

                  {selectedSeller.order_link_code && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyOrderLink(selectedSeller.order_link_code)}
                        className="h-8 text-xs gap-1.5"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        Copy Order Link
                      </Button>

                      <a
                        href={`/order/${selectedSeller.order_link_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-medium text-xs transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-primary" /> View Order Page
                      </a>
                    </>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopySellerId(selectedSeller.id)}
                    className="h-8 text-xs text-muted-foreground gap-1 ml-auto"
                  >
                    {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    Copy Seller ID
                  </Button>
                </div>

                {/* Performance Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-border bg-card p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground">Total Dispatches</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{selectedSeller.totalParcels ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground">Delivered</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedSeller.deliveredParcels ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground">Delivery Rate</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {(selectedSeller.totalParcels ?? 0) > 0
                        ? `${Math.round(((selectedSeller.deliveredParcels ?? 0) / (selectedSeller.totalParcels ?? 1)) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5 text-center">
                    <p className="text-[11px] text-muted-foreground">Total Fees</p>
                    <p className="text-lg font-bold text-primary mt-0.5">
                      KES {Math.round(selectedSeller.totalSendingFee ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Dispatched Courier Receipts Preview */}
                {sellerReceipts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Uploaded Courier Receipts ({sellerReceipts.length})
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {sellerReceipts.map((r) => (
                        <div key={r.id} className="aspect-square rounded-lg border border-border overflow-hidden bg-muted relative group">
                          <StorageImage
                            src={r.receipt_image_url}
                            alt="Receipt"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dispatched Parcels History */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-primary" />
                      Recent Parcel Dispatches ({sellerParcels.length})
                    </h3>
                  </div>

                  {loadingProfileDetails ? (
                    <div className="py-8 flex justify-center items-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                      Loading dispatch history...
                    </div>
                  ) : sellerParcels.length === 0 ? (
                    <div className="text-center py-6 px-3 rounded-lg border border-dashed border-border text-muted-foreground">
                      No parcels dispatched by this seller yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden -mx-1">
                      <SellerDispatchesTable
                        parcels={sellerParcels}
                        onChanged={reloadSellerParcels}
                      />
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
