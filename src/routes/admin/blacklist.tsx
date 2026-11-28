import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Phone,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  Clock,
  ArrowUpDown,
  CreditCard,
  Ban,
  Check,
  HelpCircle,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneDisplay } from '@/lib/constants';
import {
  getBlacklistedPhones,
  addBlacklistedPhone,
  updateBlacklistStatus,
  removeBlacklistedPhone,
  checkMpesaCodeMisuse,
  type BlacklistedPhone,
  type BlacklistStatus,
} from '@/lib/blacklist';

export const Route = createFileRoute('/admin/blacklist')({
  head: () => ({
    meta: [
      { title: 'Blacklisted Phone Numbers — Pata Parcel Admin' },
      { name: 'description', content: 'Table of phone numbers blacklisted for M-Pesa codes misuse, fraudulent reversals, and delivery disputes.' },
      { property: 'og:title', content: 'Blacklisted Phone Numbers — Pata Parcel Admin' },
      { property: 'og:description', content: 'Table of phone numbers blacklisted for M-Pesa codes misuse, fraudulent reversals, and delivery disputes.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminBlacklistPage,
});

function getStatusBadge(status: BlacklistStatus) {
  switch (status) {
    case 'blacklisted':
      return (
        <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground text-[10px] font-bold uppercase gap-1">
          <Ban className="h-3 w-3" /> Blacklisted
        </Badge>
      );
    case 'under_review':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] font-bold uppercase gap-1">
          <Clock className="h-3 w-3" /> Under Review
        </Badge>
      );
    case 'whitelisted':
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase gap-1">
          <Check className="h-3 w-3" /> Whitelisted
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function AdminBlacklistPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<BlacklistedPhone[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'incidents' | 'name'>('date_desc');

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [checkerDialogOpen, setCheckerDialogOpen] = useState(false);

  // Add Form state
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newReason, setNewReason] = useState('M-Pesa Code Misuse (Reused duplicate code across parcels)');
  const [customReason, setCustomReason] = useState('');
  const [newMpesaCode, setNewMpesaCode] = useState('');
  const [newStatus, setNewStatus] = useState<BlacklistStatus>('blacklisted');
  const [newNotes, setNewNotes] = useState('');

  // Checker Tool state
  const [checkCode, setCheckCode] = useState('');
  const [checkPhone, setCheckPhone] = useState('');
  const [checkResult, setCheckResult] = useState<ReturnType<typeof checkMpesaCodeMisuse> | null>(null);

  // Load records
  const loadRecords = () => {
    setRecords(getBlacklistedPhones());
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (!authLoading && profile && profile.role !== 'pap_admin') {
    return (
      <AppShell role={profile.role as any}>
        <div className="text-center py-12 px-4 max-w-md mx-auto">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground">Admin Access Required</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Only Pata Parcel administrators can view and manage the phone numbers blacklist.
          </p>
        </div>
      </AppShell>
    );
  }

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Status filter
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;

        // Reason filter
        if (reasonFilter === 'mpesa' && !r.reason.toLowerCase().includes('mpesa') && !r.reason.toLowerCase().includes('m-pesa')) return false;
        if (reasonFilter === 'disputes' && !r.reason.toLowerCase().includes('dispute') && !r.reason.toLowerCase().includes('complaint')) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchPhone = r.phone.toLowerCase().includes(q) || r.normalizedPhone.includes(q);
          const matchName = r.name.toLowerCase().includes(q);
          const matchReason = r.reason.toLowerCase().includes(q);
          const matchMpesa = r.mpesaCode?.toLowerCase().includes(q);
          const matchNotes = r.notes?.toLowerCase().includes(q);
          return matchPhone || matchName || matchReason || matchMpesa || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.flaggedAt).getTime() - new Date(b.flaggedAt).getTime();
        }
        if (sortBy === 'incidents') {
          return b.incidentCount - a.incidentCount;
        }
        return a.name.localeCompare(b.name);
      });
  }, [records, statusFilter, reasonFilter, searchQuery, sortBy]);

  const pagination = usePagination(filteredRecords);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const blacklisted = records.filter(r => r.status === 'blacklisted').length;
    const underReview = records.filter(r => r.status === 'under_review').length;
    const mpesaMisuse = records.filter(r => r.reason.toLowerCase().includes('mpesa') || r.reason.toLowerCase().includes('m-pesa')).length;
    return { total, blacklisted, underReview, mpesaMisuse };
  }, [records]);

  // Handle Add Blacklist
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const finalReason = newReason === 'Other' && customReason.trim() ? customReason.trim() : newReason;

    const result = addBlacklistedPhone({
      phone: newPhone,
      name: newName || 'Unidentified Subject',
      reason: finalReason,
      mpesaCode: newMpesaCode,
      status: newStatus,
      notes: newNotes,
      addedBy: profile?.owner_name || 'Admin',
    });

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(`Phone ${newPhone} added to blacklist!`);
    loadRecords();
    setAddDialogOpen(false);

    // Reset form
    setNewPhone('');
    setNewName('');
    setCustomReason('');
    setNewMpesaCode('');
    setNewNotes('');
  };

  // Handle Status Change
  const handleStatusChange = (id: string, newStatusVal: BlacklistStatus) => {
    updateBlacklistStatus(id, newStatusVal);
    toast.success(`Status updated to ${newStatusVal.replace('_', ' ')}`);
    loadRecords();
  };

  // Handle Remove
  const handleRemove = (id: string, phone: string) => {
    if (confirm(`Remove ${phone} from blacklist?`)) {
      removeBlacklistedPhone(id);
      toast.success(`Removed ${phone} from blacklist`);
      loadRecords();
    }
  };

  // Run M-Pesa Checker
  const handleRunCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCode.trim() && !checkPhone.trim()) {
      toast.error('Enter an M-Pesa code or phone number to check');
      return;
    }
    const res = checkMpesaCodeMisuse(checkCode, checkPhone);
    setCheckResult(res);
  };

  return (
    <AppShell role="pap_admin">
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Blacklisted Phone Numbers
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Phone numbers flagged for M-Pesa codes misuse, fake payment claims, or fraudulent activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCheckerDialogOpen(true)}
              className="text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-primary" />
              Check M-Pesa Code
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="text-xs font-semibold gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Blacklist Number
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 border border-border/80 bg-card">
            <p className="text-[11px] font-medium text-muted-foreground">Total Flagged</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Across all categories</p>
          </Card>

          <Card className="p-3 border border-destructive/30 bg-destructive/5">
            <p className="text-[11px] font-medium text-destructive">Active Blacklist</p>
            <p className="text-xl font-extrabold text-destructive mt-0.5">{stats.blacklisted}</p>
            <p className="text-[10px] text-muted-foreground">Blocked from orders</p>
          </Card>

          <Card className="p-3 border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">M-Pesa Misuse</p>
            <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{stats.mpesaMisuse}</p>
            <p className="text-[10px] text-muted-foreground">Reused or fake codes</p>
          </Card>

          <Card className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Under Review</p>
            <p className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-0.5">{stats.underReview}</p>
            <p className="text-[10px] text-muted-foreground">Pending investigation</p>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="p-3 border border-border/80 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone, name, M-Pesa code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({records.length})</SelectItem>
                <SelectItem value="blacklisted">Blacklisted Only ({stats.blacklisted})</SelectItem>
                <SelectItem value="under_review">Under Review ({stats.underReview})</SelectItem>
                <SelectItem value="whitelisted">Whitelisted Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-9 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {sortBy === 'date_desc' && 'Sort: Newest Flagged'}
                    {sortBy === 'date_asc' && 'Sort: Oldest Flagged'}
                    {sortBy === 'incidents' && 'Sort: Most Incidents'}
                    {sortBy === 'name' && 'Sort: Subject Name'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest Flagged First</SelectItem>
                <SelectItem value="date_asc">Oldest Flagged First</SelectItem>
                <SelectItem value="incidents">Most Incidents</SelectItem>
                <SelectItem value="name">Subject Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Blacklist Table */}
        <Card className="overflow-hidden border border-border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground border-b border-border">
                  <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Phone Number</th>
                  <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Subject / Name</th>
                  <th className="px-3.5 py-3 font-semibold">Reason & M-Pesa Code</th>
                  <th className="px-3.5 py-3 font-semibold text-center whitespace-nowrap">Incidents</th>
                  <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Date Flagged</th>
                  <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 px-4 text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="font-semibold text-foreground text-sm">No blacklisted phone numbers found</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {searchQuery ? 'No records match your search filter.' : 'All clear! No phone numbers have been flagged.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((item) => {
                    const dateFormatted = new Date(item.flaggedAt).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        {/* Phone */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-foreground">
                              {formatPhoneDisplay(item.phone)}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <a
                                href={`tel:${item.phone}`}
                                className="text-primary hover:underline flex items-center gap-0.5"
                                title="Call number"
                              >
                                <Phone className="h-3 w-3" /> Call
                              </a>
                              <span>·</span>
                              <a
                                href={`https://wa.me/254${item.normalizedPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:underline flex items-center gap-0.5"
                                title="Chat on WhatsApp"
                              >
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-semibold text-foreground truncate max-w-[140px]" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Reason & M-Pesa Code */}
                        <td className="px-3.5 py-3 max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground line-clamp-2 leading-snug">
                              {item.reason}
                            </p>
                            {item.mpesaCode && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground font-medium">Code:</span>
                                <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  {item.mpesaCode}
                                </span>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground italic line-clamp-1" title={item.notes}>
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Incident Count */}
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <Badge variant="outline" className={`font-mono text-xs font-bold ${
                            item.incidentCount >= 3 ? 'text-destructive border-destructive/40 bg-destructive/5' : 'text-foreground'
                          }`}>
                            {item.incidentCount} {item.incidentCount === 1 ? 'flag' : 'flags'}
                          </Badge>
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-muted-foreground">
                          <span title={new Date(item.flaggedAt).toLocaleString()}>{dateFormatted}</span>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Select
                              value={item.status}
                              onValueChange={(val: BlacklistStatus) => handleStatusChange(item.id, val)}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blacklisted">Blacklist</SelectItem>
                                <SelectItem value="under_review">Review</SelectItem>
                                <SelectItem value="whitelisted">Whitelist</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(item.id, item.phone)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </Card>

        {/* Dialog: Blacklist New Number */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddSubmit}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" /> Blacklist Phone Number
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Add a phone number to the blacklist. Flagged numbers will be prevented from placing orders or attempting suspicious dispatches.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                {/* Phone */}
                <div className="space-y-1">
                  <Label htmlFor="bl_phone" className="text-xs font-semibold">Phone Number *</Label>
                  <Input
                    id="bl_phone"
                    placeholder="e.g. 0712 345 678 or 0722..."
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="bl_name" className="text-xs font-semibold">Subject / Buyer Name</Label>
                  <Input
                    id="bl_name"
                    placeholder="e.g. Kevin Mwangi"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* M-Pesa Code */}
                <div className="space-y-1">
                  <Label htmlFor="bl_mpesa" className="text-xs font-semibold">M-Pesa Transaction Code (if applicable)</Label>
                  <Input
                    id="bl_mpesa"
                    placeholder="e.g. QGH7892KLM"
                    value={newMpesaCode}
                    onChange={(e) => setNewMpesaCode(e.target.value.toUpperCase())}
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Misuse Reason *</Label>
                  <Select value={newReason} onValueChange={setNewReason}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M-Pesa Code Misuse (Reused duplicate code across parcels)">
                        M-Pesa: Duplicate code reused across multiple parcels
                      </SelectItem>
                      <SelectItem value="M-Pesa Code Misuse (Reversed M-Pesa payment after intake)">
                        M-Pesa: Payment reversed after parcel intake
                      </SelectItem>
                      <SelectItem value="M-Pesa Code Misuse (Altered SMS confirmation / fake code)">
                        M-Pesa: Fabricated SMS text / fake code
                      </SelectItem>
                      <SelectItem value="Fraudulent Delivery Disputes (Repeated claims of non-receipt)">
                        Disputes: Repeated false non-receipt claims
                      </SelectItem>
                      <SelectItem value="Other">Other Custom Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newReason === 'Other' && (
                  <div className="space-y-1">
                    <Label htmlFor="bl_custom_reason" className="text-xs font-semibold">Specify Custom Reason</Label>
                    <Input
                      id="bl_custom_reason"
                      placeholder="Describe reason for blacklisting..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Initial Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as BlacklistStatus)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blacklisted">Blacklisted (Immediate Block)</SelectItem>
                      <SelectItem value="under_review">Under Review (Warning)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label htmlFor="bl_notes" className="text-xs font-semibold">Internal Admin Notes</Label>
                  <Textarea
                    id="bl_notes"
                    placeholder="Provide details about the incident, parcel ref, or seller who reported it..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Save to Blacklist
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: M-Pesa Code & Phone Misuse Checker Tool */}
        <Dialog open={checkerDialogOpen} onOpenChange={setCheckerDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleRunCheck}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> M-Pesa Code Misuse Checker
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Verify an M-Pesa transaction code or customer phone number against fraud detection rules and blacklist history.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="chk_code" className="text-xs font-semibold">M-Pesa Transaction Code</Label>
                  <Input
                    id="chk_code"
                    placeholder="e.g. QGH7892KLM"
                    value={checkCode}
                    onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="chk_phone" className="text-xs font-semibold">Phone Number (Optional)</Label>
                  <Input
                    id="chk_phone"
                    placeholder="e.g. 0712 345 678"
                    value={checkPhone}
                    onChange={(e) => setCheckPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <Button type="submit" size="sm" className="w-full bg-primary text-primary-foreground font-semibold">
                  Run Misuse Check
                </Button>

                {/* Result Display */}
                {checkResult && (
                  <div className={`p-3 rounded-xl border mt-3 space-y-1.5 ${
                    checkResult.riskLevel === 'blacklisted'
                      ? 'bg-destructive/10 border-destructive/40 text-destructive'
                      : checkResult.riskLevel === 'suspicious'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                      {checkResult.riskLevel === 'blacklisted' && (
                        <>
                          <ShieldAlert className="h-4 w-4" /> Blacklisted Match Detected!
                        </>
                      )}
                      {checkResult.riskLevel === 'suspicious' && (
                        <>
                          <AlertTriangle className="h-4 w-4" /> Suspicious Pattern / Invalid Format
                        </>
                      )}
                      {checkResult.riskLevel === 'clean' && (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Code & Phone are Clean
                        </>
                      )}
                    </div>
                    {checkResult.reason && (
                      <p className="text-xs font-medium leading-relaxed">
                        {checkResult.reason}
                      </p>
                    )}
                    {checkResult.matchedRecord && (
                      <div className="text-[11px] pt-1 border-t border-current/20 opacity-90 space-y-0.5">
                        <p>Subject: <b>{checkResult.matchedRecord.name}</b> ({checkResult.matchedRecord.phone})</p>
                        <p>Flagged on: {new Date(checkResult.matchedRecord.flaggedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setCheckerDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
