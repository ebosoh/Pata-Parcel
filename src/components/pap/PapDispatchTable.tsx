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
import { AdminParcelControls } from '@/components/pap/AdminParcelControls';
import { TrackingProgressBar } from '@/components/seller/TrackingProgressBar';
import { StorageImage } from '@/components/shared/StorageImage';
import {
  MapPin,
  Send,
  MessageCircle,
  FileText,
  CheckCircle,
  Clock,
  Truck,
  ChevronDown,
  ChevronUp,
  Store,
  Phone,
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';
import type { ParcelWithSeller } from '@/hooks/usePapOperations';

interface PapDispatchTableProps {
  parcels: ParcelWithSeller[];
  activeTab: 'sorting' | 'transit' | 'internal';
  receiptSentToBuyer: (parcelId: string) => boolean;
  onShareReceipt: (parcel: ParcelWithSeller) => void;
  deliveredIds: Record<string, boolean>;
  submitting: boolean;
  onDispatchClick: (parcel: ParcelWithSeller) => void;
  onMarkDelivered: (parcelId: string, referenceNumber?: string) => void;
  onRefetch: () => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'sorting':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700 text-[10px] font-semibold whitespace-nowrap">
          <Clock className="h-2.5 w-2.5 mr-1" />
          Sorting
        </Badge>
      );
    case 'on_transit':
      return (
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700 text-[10px] font-semibold whitespace-nowrap">
          <Truck className="h-2.5 w-2.5 mr-1" />
          On Transit
        </Badge>
      );
    case 'delivered':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 text-[10px] font-semibold whitespace-nowrap">
          <CheckCircle className="h-2.5 w-2.5 mr-1" />
          Delivered
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] font-semibold whitespace-nowrap capitalize">
          {status.replace(/_/g, ' ')}
        </Badge>
      );
  }
}

export function PapDispatchTable({
  parcels,
  activeTab,
  receiptSentToBuyer,
  onShareReceipt,
  deliveredIds,
  submitting,
  onDispatchClick,
  onMarkDelivered,
  onRefetch,
}: PapDispatchTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10 px-2 text-center"></TableHead>
              <TableHead className="font-bold text-foreground">Ref / Code</TableHead>
              <TableHead className="font-bold text-foreground">Seller</TableHead>
              <TableHead className="font-bold text-foreground">Buyer</TableHead>
              <TableHead className="font-bold text-foreground">Destination & Method</TableHead>
              <TableHead className="font-bold text-foreground">Status</TableHead>
              <TableHead className="font-bold text-foreground text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {parcels.map((parcel) => {
              const isExpanded = expandedId === parcel.id;
              const cleanPhone = parcel.buyer_phone.replace(/\D/g, '');
              const waPhone = cleanPhone.startsWith('0')
                ? `254${cleanPhone.slice(1)}`
                : cleanPhone.startsWith('254')
                ? cleanPhone
                : `254${cleanPhone}`;

              const createdDate = new Date(parcel.created_at).toLocaleDateString('en-KE', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Fragment key={parcel.id}>
                  <TableRow
                    className={`transition-colors hover:bg-muted/40 ${
                      isExpanded ? 'bg-muted/20' : ''
                    }`}
                  >
                    <TableCell className="w-10 px-2 text-center">
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
                        {parcel.reference_number || 'PAP-PARCEL'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{createdDate}</span>
                    </TableCell>

                    <TableCell className="max-w-[150px]">
                      <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                        <Store className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{parcel.seller?.business_name || 'Online Seller'}</span>
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

                    <TableCell className="max-w-[190px]">
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
                      {getStatusBadge(parcel.tracking_status)}
                    </TableCell>

                    <TableCell className="text-right pr-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <AdminParcelControls parcel={parcel} onChanged={onRefetch} />

                        {activeTab === 'sorting' ? (
                          <Button
                            size="sm"
                            onClick={() => onDispatchClick(parcel)}
                            className="h-7 px-2 font-bold text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
                          >
                            <Send className="h-3 w-3" />
                            Dispatch
                          </Button>
                        ) : (
                          <>
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp buyer"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                aria-label={`WhatsApp ${parcel.buyer_name}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            </a>

                            {parcel.sending_method === 'psv' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onShareReceipt(parcel)}
                                title={receiptSentToBuyer(parcel.id) ? 'Receipt shared with buyer — tap to send again' : 'Share receipt with buyer on WhatsApp'}
                                className={`h-7 px-2 text-[10px] font-semibold flex items-center gap-1 ${
                                  receiptSentToBuyer(parcel.id)
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300'
                                    : 'border-primary/40 text-primary hover:bg-primary/5'
                                }`}
                              >
                                {receiptSentToBuyer(parcel.id) ? (
                                  <>
                                    <CheckCircle className="h-3 w-3" />
                                    Receipt Shared
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-3 w-3" />
                                    Share Receipt
                                  </>
                                )}
                              </Button>
                            )}

                            {!deliveredIds[parcel.id] && (
                              <Button
                                size="sm"
                                onClick={() => onMarkDelivered(parcel.id, parcel.reference_number)}
                                disabled={submitting}
                                className="h-7 px-2 font-bold text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Delivered
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Detail Drawer */}
                  {isExpanded && (
                    <TableRow className="bg-muted/10 border-b border-border/80">
                      <TableCell colSpan={7} className="p-3 pl-12 pr-6">
                        <div className="space-y-3 bg-card p-3 rounded-lg border border-border/60">
                          {/* Tracking Progress */}
                          <div className="border-b border-border/50 pb-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                              Status Progression
                            </span>
                            <TrackingProgressBar status={parcel.tracking_status} compact />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Parcel Info</span>
                              <p className="mt-1 font-medium text-foreground">Type: <span className="font-normal">{parcel.package_type || 'General Parcel'}</span></p>
                              {parcel.package_description && (
                                <p className="text-muted-foreground text-[11px] mt-0.5">Description: {parcel.package_description}</p>
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
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Amounts</span>
                              <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Goods:</span>
                                  <span>KES {Number(parcel.goods_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sending Fee:</span>
                                  <span>KES {Number(parcel.total_sending_fee || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Payment Status:</span>
                                  <span className="capitalize font-medium">{parcel.payment_status?.replace(/_/g, ' ')}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Seller Details</span>
                              <p className="mt-1 font-medium text-foreground">Owner: {parcel.seller?.owner_name || '—'}</p>
                              <p className="text-muted-foreground text-[11px]">Phone: {parcel.seller?.phone || '—'}</p>
                            </div>
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
    </div>
  );
}
