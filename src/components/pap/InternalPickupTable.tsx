import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminParcelControls } from '@/components/pap/AdminParcelControls';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { formatPhoneDisplay } from '@/lib/constants';
import { formatStay, internalPickupTotalDue, INTERNAL_PICKUP_LATE_FEE } from '@/lib/internalPickup';
import type { ParcelWithSeller } from '@/hooks/usePapOperations';
import { Inbox, CheckCircle, RotateCcw } from 'lucide-react';

interface Props {
  parcels: ParcelWithSeller[];
  now: Date;
  onRefetch: () => void;
  onMarkDelivered?: (parcelId: string, referenceNumber?: string) => void;
  onReversePickup?: (parcelId: string, referenceNumber?: string) => void;
  submitting?: boolean;
  deliveredIds?: Record<string, boolean>;
}

function formatCreated(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DueBadge({ due }: { due: number }) {
  return (
    <Badge
      className={`text-[11px] font-bold ${
        due >= INTERNAL_PICKUP_LATE_FEE
          ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
      }`}
    >
      KES {due}
    </Badge>
  );
}

export function InternalPickupTable({
  parcels,
  now,
  onRefetch,
  onMarkDelivered,
  onReversePickup,
  submitting = false,
  deliveredIds = {},
}: Props) {
  const pagination = usePagination(parcels);

  if (parcels.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
        <Inbox className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
        <h2 className="font-semibold text-foreground text-sm">No internal pick-up dispatches</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          Dispatches created by staff with the New Dispatch button will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Phones: stacked rows */}
      <div className="space-y-2 sm:hidden">
        {parcels.map((p) => {
          const isDelivered = deliveredIds[p.id] || p.tracking_status === 'delivered';
          return (
            <div key={p.id} className="rounded-xl border border-border/80 bg-card p-3 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-primary break-all">{p.reference_number}</span>
                <DueBadge due={internalPickupTotalDue(p.created_at, now)} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{p.buyer_name}</p>
                <p className="text-[11px] text-muted-foreground">{formatPhoneDisplay(p.buyer_phone)}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-[10px] text-muted-foreground">Date Created</dt>
                  <dd className="font-medium text-foreground">{formatCreated(p.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-muted-foreground">Stay</dt>
                  <dd className="font-medium text-foreground">{formatStay(p.created_at, now)}</dd>
                </div>
              </dl>
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
                <AdminParcelControls parcel={p} onChanged={onRefetch} />
                {!isDelivered ? (
                  onMarkDelivered && (
                    <Button
                      size="sm"
                      onClick={() => onMarkDelivered(p.id, p.reference_number)}
                      disabled={submitting}
                      className="h-7 text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer px-2"
                      title="Customer picked up parcel"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete Pick-up
                    </Button>
                  )
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Picked Up
                    </Badge>
                    {onReversePickup && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReversePickup(p.id, p.reference_number)}
                        disabled={submitting}
                        className="h-7 text-[11px] font-bold border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40 cursor-pointer px-2 flex items-center gap-1"
                        title="Reverse completed pick-up action"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reverse
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Larger screens: table */}
      <div className="hidden sm:block rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">Tracking Code</TableHead>
                <TableHead className="font-bold text-foreground">Buyer</TableHead>
                <TableHead className="font-bold text-foreground">Date Created</TableHead>
                <TableHead className="font-bold text-foreground">Stay</TableHead>
                <TableHead className="font-bold text-foreground">Total Due</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((p) => {
                const isDelivered = deliveredIds[p.id] || p.tracking_status === 'delivered';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold text-primary">{p.reference_number}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{p.buyer_name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatPhoneDisplay(p.buyer_phone)}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatCreated(p.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatStay(p.created_at, now)}</TableCell>
                    <TableCell><DueBadge due={internalPickupTotalDue(p.created_at, now)} /></TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <AdminParcelControls parcel={p} onChanged={onRefetch} />
                        {!isDelivered ? (
                          onMarkDelivered && (
                            <Button
                              size="sm"
                              onClick={() => onMarkDelivered(p.id, p.reference_number)}
                              disabled={submitting}
                              className="h-7 text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer px-2"
                              title="Customer picked up parcel"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete Pick-up
                            </Button>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Picked Up
                            </Badge>
                            {onReversePickup && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReversePickup(p.id, p.reference_number)}
                                disabled={submitting}
                                className="h-7 text-[11px] font-bold border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40 cursor-pointer px-2 flex items-center gap-1"
                                title="Reverse completed pick-up action"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reverse
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
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
    </>
  );
}
