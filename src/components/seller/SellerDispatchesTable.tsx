import { useState, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
import { TrackingProgressBar } from './TrackingProgressBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageCircle,
  Truck,
  CheckCircle2,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { Parcel, SendingMethod } from '@/types/database';
import { formatPhoneDisplay } from '@/lib/constants';

interface SellerDispatchesTableProps {
  parcels: Parcel[];
  onChanged?: () => void;
}

function getMethodLabel(method: SendingMethod, sacco?: string | null): string {
  switch (method) {
    case 'pickup_mtaani':
      return 'Pick-up Mtaani';
    case 'pata_parcel':
      return 'Pata Parcel';
    case 'door_to_door':
      return 'Door to Door';
    case 'psv':
      return sacco ? `PSV (${sacco})` : 'PSV (SACCO)';
    case 'psv_driver':
      return sacco ? `PSV-Driver (${sacco})` : 'PSV-Driver';
    default:
      return method;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'awaiting_verification':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700 text-[10px] font-semibold whitespace-nowrap">
          <Clock className="h-2.5 w-2.5 mr-1" />
          Awaiting
        </Badge>
      );
    case 'dispatched_to_pap':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700 text-[10px] font-semibold whitespace-nowrap">
          <Send className="h-2.5 w-2.5 mr-1" />
          Dispatched to PAP
        </Badge>
      );
    case 'sorting':
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700 text-[10px] font-semibold whitespace-nowrap">
          <Clock className="h-2.5 w-2.5 mr-1" />
          Sorting at PAP
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
          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
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

export function SellerDispatchesTable({ parcels, onChanged }: SellerDispatchesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmParcel, setConfirmParcel] = useState<Parcel | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleVerifyAndDispatch = async (parcel: Parcel) => {
    setBusyId(parcel.id);
    const { error } = await supabase.rpc('seller_verify_and_dispatch', { _parcel_id: parcel.id });
    setBusyId(null);
    setConfirmParcel(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${parcel.buyer_name}'s parcel dispatched to Pata Parcel`);
      onChanged?.();
    }
  };

  const handleSetPayment = async (parcel: Parcel, nextGoodsPaid: boolean, nextFeeStatus: 'paid' | 'pay_on_delivery') => {
    setBusyId(parcel.id);
    const { error } = await supabase.rpc('seller_set_parcel_payment', {
      _parcel_id: parcel.id,
      _goods_paid: nextGoodsPaid,
      _fee_status: nextFeeStatus,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Payment updated');
      onChanged?.();
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10 px-2 text-center"></TableHead>
              <TableHead className="font-bold text-foreground">Ref / Tracking</TableHead>
              <TableHead className="font-bold text-foreground">Date</TableHead>
              <TableHead className="font-bold text-foreground">Buyer</TableHead>
              <TableHead className="font-bold text-foreground">Destination & Method</TableHead>
              <TableHead className="font-bold text-foreground text-right">Amounts</TableHead>
              <TableHead className="font-bold text-foreground">Status</TableHead>
              <TableHead className="font-bold text-foreground text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {parcels.map((parcel) => {
              const isExpanded = expandedId === parcel.id;
              const awaiting = parcel.tracking_status === 'awaiting_verification';
              const goodsPaid = parcel.goods_paid === true;
              const feePaid = parcel.payment_status === 'paid';
              const isPsvDriver = parcel.sending_method === 'psv_driver';

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

              const goodsVal = Number(parcel.goods_amount ?? 0);
              const feeVal = Number(parcel.total_sending_fee ?? 0);
              const totalVal = goodsVal + (isPsvDriver || !feePaid ? 0 : feeVal);

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
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-primary text-xs">
                          {parcel.reference_number || 'PAP-PENDING'}
                        </span>
                        {parcel.num_packages > 1 && (
                          <span className="text-[10px] text-muted-foreground">
                            {parcel.num_packages} pkgs
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-muted-foreground text-[11px]">
                      {createdDate}
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
                      <p className="text-[11px] text-muted-foreground truncate">
                        {getMethodLabel(parcel.sending_method, parcel.psv_sacco)}
                      </p>
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap font-mono">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-foreground text-xs">
                          KES {goodsVal.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className={goodsPaid ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                            {goodsPaid ? 'Goods Paid' : 'Goods Unpaid'}
                          </span>
                          <span>•</span>
                          <span className={feePaid ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                            {feePaid ? 'Fee Paid' : isPsvDriver ? 'Fee COD' : 'Fee COD'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {getStatusBadge(parcel.tracking_status)}
                    </TableCell>

                    <TableCell className="text-right pr-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
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

                        {awaiting && (
                          <Button
                            size="sm"
                            disabled={busyId === parcel.id}
                            onClick={() => setConfirmParcel(parcel)}
                            className="h-7 px-2 font-bold text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Dispatch
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Detail Drawer */}
                  {isExpanded && (
                    <TableRow className="bg-muted/10 border-b border-border/80">
                      <TableCell colSpan={8} className="p-3 pl-12 pr-6">
                        <div className="space-y-3 bg-card p-3 rounded-lg border border-border/60">
                          {/* Tracking Progress */}
                          <div className="border-b border-border/50 pb-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                              Tracking Lifecycle
                            </span>
                            <TrackingProgressBar status={parcel.tracking_status} compact />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Package Info</span>
                              <p className="mt-1 font-medium text-foreground">Type: <span className="font-normal">{parcel.package_type || 'General Parcel'}</span></p>
                              {parcel.package_description && (
                                <p className="text-muted-foreground text-[11px] mt-0.5">Note: {parcel.package_description}</p>
                              )}
                              {parcel.pick_point && (
                                <p className="text-muted-foreground text-[11px] mt-0.5">Pick Point: {parcel.pick_point}</p>
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Fee Breakdown</span>
                              <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Goods:</span>
                                  <span>KES {goodsVal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sending Fee:</span>
                                  <span>KES {feeVal.toLocaleString()}</span>
                                </div>
                                {parcel.platform_fee != null && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>PAP Fee (15%):</span>
                                    <span>KES {Number(parcel.platform_fee).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">Payment Actions</span>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Button
                                  size="sm"
                                  variant={goodsPaid ? 'outline' : 'default'}
                                  disabled={busyId === parcel.id}
                                  onClick={() => handleSetPayment(parcel, !goodsPaid, feePaid ? 'paid' : 'pay_on_delivery')}
                                  className="h-6 px-2 text-[10px] font-semibold"
                                >
                                  {goodsPaid ? 'Mark Goods Unpaid' : 'Mark Goods Paid'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={feePaid ? 'outline' : 'secondary'}
                                  disabled={busyId === parcel.id}
                                  onClick={() => handleSetPayment(parcel, goodsPaid, feePaid ? 'pay_on_delivery' : 'paid')}
                                  className="h-6 px-2 text-[10px] font-semibold"
                                >
                                  {feePaid ? 'Fee COD' : 'Fee Paid'}
                                </Button>
                              </div>
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

      {/* Confirmation Dialog for Dispatch to PAP */}
      {confirmParcel && (
        <AlertDialog open={!!confirmParcel} onOpenChange={(open) => !open && setConfirmParcel(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Dispatch parcel to Pata Parcel?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-xs text-foreground">
                <p>
                  You are sending <strong>{confirmParcel.buyer_name}</strong>'s parcel (
                  <span className="font-mono font-bold">{confirmParcel.reference_number}</span>) to the
                  Pata Parcel sorting hub.
                </p>
                <div className="rounded-lg bg-muted/60 p-2.5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goods payment:</span>
                    <span className="font-bold">{confirmParcel.goods_paid ? 'Paid' : 'Unpaid'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sending fee:</span>
                    <span className="font-bold">
                      {confirmParcel.sending_method === 'psv_driver'
                        ? 'Paid to driver on delivery'
                        : confirmParcel.payment_status === 'paid'
                        ? 'Paid'
                        : 'Pay on delivery'}
                    </span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busyId === confirmParcel.id}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busyId === confirmParcel.id}
                onClick={() => handleVerifyAndDispatch(confirmParcel)}
                className="bg-primary text-primary-foreground font-bold hover:bg-primary/90"
              >
                Confirm Dispatch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
