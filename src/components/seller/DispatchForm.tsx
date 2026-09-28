import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  PACKAGE_TYPES, 
  SENDING_METHODS, 
  isValidKenyanPhone, 
  PLATFORM_FEE_PER_PACKAGE 
} from '@/lib/constants';
import type { SendingMethod, PaymentStatus, Destination, Sacco } from '@/types/database';
import type { CreateParcelInput } from '@/hooks/useParcels';
import { Send, Loader2, Calculator, AlertCircle } from 'lucide-react';

interface DispatchFormProps {
  destinations: Destination[];
  saccos: Sacco[];
  onSubmit: (input: CreateParcelInput) => Promise<{ data: any; error: any }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DispatchForm({
  destinations,
  saccos,
  onSubmit,
  onSuccess,
  onCancel,
}: DispatchFormProps) {
  // Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [sendingMethod, setSendingMethod] = useState<SendingMethod>('pickup_mtaani');
  const [psvSacco, setPsvSacco] = useState('');
  const [packageType, setPackageType] = useState<string>(PACKAGE_TYPES[0]);
  const [customPackageType, setCustomPackageType] = useState('');
  const [numPackages, setNumPackages] = useState<number>(1);
  const [sendingFeePerPackage, setSendingFeePerPackage] = useState<number>(150);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-calculated total sending fee
  const totalSendingFee = useMemo(() => {
    const qty = Math.max(1, Number(numPackages) || 1);
    const fee = Math.max(0, Number(sendingFeePerPackage) || 0);
    return qty * fee;
  }, [numPackages, sendingFeePerPackage]);

  // Platform fee
  const totalPlatformFee = useMemo(() => {
    const qty = Math.max(1, Number(numPackages) || 1);
    return qty * PLATFORM_FEE_PER_PACKAGE;
  }, [numPackages]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!buyerName.trim()) {
      setFormError('Please enter the buyer name');
      return;
    }

    const cleanPhone = buyerPhone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setFormError('Please enter a valid Kenyan phone number (e.g. 0712345678 or 0112345678)');
      return;
    }

    if (!destination) {
      setFormError('Please select a destination town');
      return;
    }

    if (sendingMethod === 'psv' && !psvSacco) {
      setFormError('Please select a SACCO for PSV dispatch');
      return;
    }

    const finalPackageType = packageType === 'Other' && customPackageType.trim()
      ? customPackageType.trim()
      : packageType;

    setLoading(true);

    const result = await onSubmit({
      buyer_name: buyerName.trim(),
      buyer_phone: cleanPhone,
      destination,
      sending_method: sendingMethod,
      psv_sacco: sendingMethod === 'psv' ? psvSacco : null,
      package_type: finalPackageType,
      num_packages: Math.max(1, numPackages),
      sending_fee_per_package: Math.max(0, sendingFeePerPackage),
      payment_status: paymentStatus,
    });

    setLoading(false);

    if (result.error) {
      setFormError(result.error.message || 'Failed to dispatch parcel. Please check your network.');
    } else {
      // Reset form
      setBuyerName('');
      setBuyerPhone('');
      setDestination('');
      setNumPackages(1);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Buyer Information */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          1. Buyer Details
        </h3>

        <div className="space-y-2">
          <Label htmlFor="buyer_name" className="text-xs font-medium">
            Buyer Name *
          </Label>
          <Input
            id="buyer_name"
            placeholder="e.g. Mary Wanjiku"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyer_phone" className="text-xs font-medium">
            Buyer Phone Number *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              +254
            </span>
            <Input
              id="buyer_phone"
              type="tel"
              placeholder="0712 345 678"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="h-10 pl-14 text-sm"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Buyer will receive an automated SMS with your WhatsApp contact once dispatched.
          </p>
        </div>
      </div>

      {/* 2. Destination & Sending Method */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          2. Destination & Delivery Method
        </h3>

        <div className="space-y-2">
          <Label htmlFor="destination" className="text-xs font-medium">
            Destination Town *
          </Label>
          <select
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">-- Select Destination --</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} ({d.region})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sending_method" className="text-xs font-medium">
            Sending Method *
          </Label>
          <select
            id="sending_method"
            value={sendingMethod}
            onChange={(e) => setSendingMethod(e.target.value as SendingMethod)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SENDING_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* PSV SACCO selector if method is PSV */}
        {sendingMethod === 'psv' && (
          <div className="space-y-2 pt-1 border-t border-dashed border-border/60">
            <Label htmlFor="psv_sacco" className="text-xs font-medium text-primary">
              Select SACCO *
            </Label>
            <select
              id="psv_sacco"
              value={psvSacco}
              onChange={(e) => setPsvSacco(e.target.value)}
              required
              className="w-full h-10 rounded-md border border-primary/50 bg-secondary/10 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Select SACCO --</option>
              {saccos.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.route})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Package & Pricing */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          3. Package & Fees
        </h3>

        <div className="space-y-2">
          <Label htmlFor="package_type" className="text-xs font-medium">
            Type of Package *
          </Label>
          <select
            id="package_type"
            value={packageType}
            onChange={(e) => setPackageType(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PACKAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {packageType === 'Other' && (
          <div className="space-y-2">
            <Label htmlFor="custom_type" className="text-xs font-medium">
              Describe Package Type
            </Label>
            <Input
              id="custom_type"
              placeholder="e.g. Mummy Jeans, Curtains"
              value={customPackageType}
              onChange={(e) => setCustomPackageType(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="num_packages" className="text-xs font-medium">
              Number of Pkgs *
            </Label>
            <Input
              id="num_packages"
              type="number"
              min="1"
              max="500"
              value={numPackages}
              onChange={(e) => setNumPackages(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_per_pkg" className="text-xs font-medium">
              Fee / Pkg (KES) *
            </Label>
            <Input
              id="fee_per_pkg"
              type="number"
              min="0"
              step="10"
              value={sendingFeePerPackage}
              onChange={(e) => setSendingFeePerPackage(Math.max(0, parseInt(e.target.value) || 0))}
              required
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Auto Calculation Banner */}
        <div className="rounded-lg bg-secondary/30 p-3 border border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
              <Calculator className="h-4 w-4 text-primary" />
              <span>Total Sending Fee (Auto-Calculated):</span>
            </div>
            <span className="text-base font-extrabold text-primary">
              KES {totalSendingFee}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1">
            <span>Pata Parcel Platform Fee:</span>
            <span>KES {totalPlatformFee} (KES 10/pkg)</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="space-y-2 pt-1">
          <Label htmlFor="payment_status" className="text-xs font-medium">
            Payment Status *
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(['paid', 'unpaid', 'pay_on_delivery'] as PaymentStatus[]).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setPaymentStatus(status)}
                className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all ${
                  paymentStatus === status
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                }`}
              >
                {status === 'paid' ? 'Paid' : status === 'unpaid' ? 'Unpaid' : 'On Delivery'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 font-bold text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Dispatching...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Dispatch to Pata Parcel
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
