import { Fragment, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminParcelControls } from '@/components/pap/AdminParcelControls';
import { StorageImage } from '@/components/shared/StorageImage';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import {
  MapPin,
  Clock,
  Store,
  Phone,
  ChevronDown,
  ChevronUp,
  Inbox,
  CheckCheck,
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';
import type { ParcelWithSeller } from '@/hooks/usePapOperations';

interface PapQueueTableProps {
  parcels: ParcelWithSeller[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onReceiveSingle: (id: string) => void;
  actionLoading: boolean;
  onRefetch: () => void;
}

function formatArrivalTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  let relative = 'Just now';
  if (diffSec >= 60 && diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    relative = `${min}m ago`;
  } else if (diffSec >= 3600 && diffSec < 86400) {
    const hr = Math.floor(diffSec / 3600);
    relative = `${hr}h ago`;
  } else if (diffSec >= 86400) {
    const days = Math.floor(diffSec / 86400);
    relative = days === 1 ? '1d ago' : `${days}d ago`;
  }

  const exact = date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relative, exact };
}

function getPaymentBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold">
          Paid
        </Badge>
      );
    case 'pay_on_delivery':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold">
          COD
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-[10px] font-semibold">
          Unpaid
        </Badge>
      );
  }
}

export function PapQueueTable({
  parcels,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onReceiveSingle,
  actionLoading,
  onRefetch,
}: PapQueueTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pagination = usePagination(parcels);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const allSelected = parcels.length > 0 && parcels.every((p) => selectedIds.includes(p.id));
  const someSelected = parcels.some((p) => selectedIds.includes(p.id)) && !allSelected;

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10 px-3 text-center">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all parcels"
                />
              </TableHead>
              <TableHead className="w-8 px-1 text-center"></TableHead>
              <TableHead className="font-bold text-foreground">Ref / Arrival</TableHead>
              <TableHead className="font-bold text-foreground">Seller</TableHead>
              <TableHead className="font-bold text-foreground">Buyer</TableHead>
              <TableHead className="font-bold text-foreground">Destination & Method</TableHead>
              <TableHead className="font-bold text-foreground">Payment</TableHead>
              <TableHead className="font-bold text-foreground text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {pagination.paginatedItems.map((parcel) => {
              const isSelected = selectedIds.includes(parcel.id);
              const isExpanded = expandedId === parcel.id;
              const arrival = formatArrivalTime(parcel.created_at);

              return (
                <Fragment key={parcel.id}>
                  <TableRow
                    className={`transition-colors hover:bg-muted/40 ${
                      isSelected ? 'bg-secondary/10' : isExpanded ? 'bg-muted/20' : ''
                    }`}
                  >
                    <TableCell className="w-10 px-3 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(parcel.id)}
                        aria-label={`Select parcel ${parcel.reference_number}`}
                      />
                    </TableCell>

                    <TableCell className="w-8 px-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(parcel.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>

                    <TableCell className="font-medium whitespace-nowrap">
                      <span className="font-mono font-bold text-primary text-xs block">
                        {parcel.reference_number || 'PAP-PENDING'}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {arrival.relative} ({arrival.exact})
                      </span>
                    </TableCell>

                    <TableCell className="max-w-[150px]">
                      <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                        <Store className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {parcel.seller?.business_name || parcel.seller?.owner_name || 'Online Seller'}
                        </span>
                      </div>
                      {parcel.seller?.phone && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {formatPhoneDisplay(parcel.seller.phone)}
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="max-w-[150px]">
                      <p className="font-semibold text-foreground truncate">{parcel.buyer_name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatPhoneDisplay(parcel.buyer_phone)}
                      </p>
                    </TableCell>

                    <TableCell className="max-w-[180px]">
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{parcel.destination}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize">
                          {parcel.sending_method.replace(/_/g, ' ')}
                        </Badge>
                        {parcel.psv_sacco && (
                          <span className="truncate">({parcel.psv_sacco})</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {getPaymentBadge(parcel.payment_status)}
                    </TableCell>

                    <TableCell className="text-right pr-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <AdminParcelControls parcel={parcel} onChanged={onRefetch} />
                        <Button
                          size="sm"
                          onClick={() => onReceiveSingle(parcel.id)}
                          disabled={actionLoading}
                          className="h-7 px-2.5 font-bold text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                        >
                          <Inbox className="h-3 w-3" />
                          Receive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Detail Drawer */}
                  {isExpanded && (
                    <TableRow className="bg-muted/10 border-b border-border/80">
                      <TableCell colSpan={8} className="p-3 pl-14 pr-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-card p-3 rounded-lg border border-border/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Parcel Info</span>
                            <p className="mt-1 font-medium text-foreground">Packages: {parcel.num_packages || 1}</p>
                            <p className="text-muted-foreground text-[11px]">Type: {parcel.package_type || 'General Parcel'}</p>
                            {parcel.package_description && (
                              <p className="text-muted-foreground text-[11px] mt-0.5">Note: {parcel.package_description}</p>
                            )}
                            {parcel.product_image_url && (
                              <div className="mt-1.5">
                                <StorageImage
                                  src={parcel.product_image_url}
                                  alt="Product screenshot"
                                  className="h-20 w-20 rounded-md border border-border/50 object-cover"
                                />
                              </div>
                            )}
                            {parcel.pick_point && (
                              <p className="text-muted-foreground text-[11px] mt-0.5">Pick Point: {parcel.pick_point}</p>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Financials</span>
                            <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Goods amount:</span>
                                <span>KES {Number(parcel.goods_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sending fee:</span>
                                <span>KES {Number(parcel.total_sending_fee || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Goods paid:</span>
                                <span className={parcel.goods_paid ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                                  {parcel.goods_paid ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Seller Info</span>
                            <p className="mt-1 font-medium text-foreground">{parcel.seller?.owner_name || '—'}</p>
                            {parcel.seller?.phone && (
                              <a
                                href={`tel:${parcel.seller.phone}`}
                                className="text-primary hover:underline text-[11px] flex items-center gap-1 font-mono mt-0.5"
                              >
                                <Phone className="h-3 w-3" /> {formatPhoneDisplay(parcel.seller.phone)}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
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
    </div>
  );
}
