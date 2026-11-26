import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { serializePackageTypes } from '@/lib/packageDetails';
import { 
  PACKAGE_TYPES, 
  DELIVERY_SACCO_OPTIONS,
  isValidKenyanPhone, 
  computePlatformFee,
  suggestedSendingFee,
  NAIROBI_PICK_POINTS
} from '@/lib/constants';
import type { SendingMethod, Destination } from '@/types/database';
import type { CreateParcelInput } from '@/hooks/useParcels';
import { Send, Loader2, Calculator, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DestinationCombobox } from '@/components/seller/DestinationCombobox';

// Suggested values shown as placeholders so sellers can clear and retype them
const DEFAULT_SENDING_FEE = 150;
const STAFF_SENDING_FEE = 50;

interface DispatchFormProps {
  destinations: Destination[];
  onSubmit: (input: CreateParcelInput) => Promise<{ data: any; error: any }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  /** 'buyer' = public order-link form; 'staff' = staff dispatch without goods payment */
  mode?: 'seller' | 'buyer' | 'staff';
  /** Explicitly toggle goods payment section visibility */
  hideGoodsPayment?: boolean;
}

export function DispatchForm({
  destinations,
  onSubmit,
  onSuccess,
  onCancel,
  mode = 'seller',
  hideGoodsPayment = false,
}: DispatchFormProps) {
  const isBuyer = mode === 'buyer';
  const isStaff = mode === 'staff';
  const showGoodsPayment = !hideGoodsPayment && !isStaff;
  // Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerTiktok, setBuyerTiktok] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [sendingMethod, setSendingMethod] = useState<SendingMethod>('pickup_mtaani');
  const [psvSacco, setPsvSacco] = useState('');
  const [deliverySacco, setDeliverySacco] = useState('');
  const [pickPoint, setPickPoint] = useState('');
  const [packageTypes, setPackageTypes] = useState<string[]>([PACKAGE_TYPES[0]]);
  const [packageDescription, setPackageDescription] = useState('');
  const [customPackageType, setCustomPackageType] = useState('');
  const [sendingFee, setSendingFee] = useState<number | null>(isStaff ? STAFF_SENDING_FEE : null);
  const [goodsAmount, setGoodsAmount] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [showAllPackageTypes, setShowAllPackageTypes] = useState(false);

  const handleDeliverySaccoChange = (val: string) => {
    setDeliverySacco(val);
    const trimmed = val.trim();
    if (trimmed === 'Pick-up Mtaani') {
      setSendingMethod('pickup_mtaani');
      setPsvSacco('');
      setPickPoint('');
    } else if (trimmed === 'Pata Parcel (PAP Pick-up Points)') {
      setSendingMethod('pata_parcel');
      setPsvSacco('');
      setPickPoint('');
    } else if (trimmed === 'Door to Door (Within Nairobi)') {
      setSendingMethod('door_to_door');
      setPsvSacco('');
    } else if (trimmed === 'PSV-Driver') {
      setSendingMethod('psv_driver');
      setPsvSacco('');
      setPickPoint('');
    } else if (trimmed === 'PSV (SACCO)') {
      setSendingMethod('psv');
      setPsvSacco('PSV (SACCO)');
      setPickPoint('');
    } else if (trimmed) {
      setSendingMethod('psv');
      setPsvSacco(trimmed);
      setPickPoint('');
    } else {
      setPsvSacco('');
      setPickPoint('');
    }
  };

  // Prefill the sending fee whenever the method (or SACCO for PSV) changes
  const effectiveMethod = !deliverySacco.trim() ? '' : sendingMethod;
  const suggestedFee = effectiveMethod ? suggestedSendingFee(effectiveMethod, psvSacco) : null;
  const payOnDelivery = suggestedFee === 'on_delivery';
  useEffect(() => {
    if (isStaff) return; // staff fee is fixed at STAFF_SENDING_FEE, don't overwrite
    setSendingFee(typeof suggestedFee === 'number' ? suggestedFee : null);
  }, [suggestedFee]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (formError) errorRef.current?.scrollIntoView({ block: 'center' });
  }, [formError]);

  // Total sending fee as entered by the seller (no multiplication)
  const totalSendingFee = useMemo(
    () => (payOnDelivery ? 0 : Math.max(0, sendingFee ?? DEFAULT_SENDING_FEE)),
    [sendingFee, payOnDelivery],
  );

  // Platform fee: 15% of the total sending fee
  const totalPlatformFee = useMemo(() => computePlatformFee(totalSendingFee), [totalSendingFee]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!buyerName.trim()) {
      setFormError(isBuyer ? 'Please enter your name' : 'Please enter the buyer name');
      return;
    }

    const cleanTiktok = buyerTiktok.trim().replace(/^@+/, '');
    if (isBuyer && !cleanTiktok) {
      setFormError('Please enter your TikTok username / handle');
      return;
    }

    const cleanPhone = buyerPhone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setFormError('Please enter a valid Kenyan phone number (e.g. 0712345678 or 0112345678)');
      return;
    }

    if (!isStaff) {
      if (!destination) {
        setFormError('Please select a destination town');
        return;
      }

      if (!deliverySacco.trim()) {
        setFormError('Please select a SACCO or delivery method');
        return;
      }

      if (sendingMethod === 'door_to_door' && !pickPoint.trim()) {
        setFormError('Please select or type a Pick-Point for Door to Door delivery');
        return;
      }
    }

    const finalPackageType = isStaff ? 'Parcel' : serializePackageTypes(packageTypes, customPackageType);
    if (!isStaff && !finalPackageType) {
      setFormError('Please select at least one package type');
      return;
    }

    const amount = showGoodsPayment && goodsAmount.trim() !== '' ? Number(goodsAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setFormError('Please enter a valid amount for the goods');
      return;
    }
    const code = showGoodsPayment ? paymentCode.trim() : '';
    if (isBuyer && amount === null) {
      setFormError('Please enter the amount you paid for the goods');
      return;
    }
    if ((isBuyer || code) && !/^[A-Za-z0-9]{6,20}$/.test(code)) {
      setFormError('Please enter a valid M-Pesa / Airtel Money code (e.g. SKL4ABC12D)');
      return;
    }

    setLoading(true);

    const finalBuyerName = cleanTiktok ? `${buyerName.trim()} (@${cleanTiktok})` : buyerName.trim();

    const result = await onSubmit({
      buyer_name: finalBuyerName,
      buyer_phone: cleanPhone,
      destination: isStaff ? (destination.trim() || 'Nairobi') : destination,
      sending_method: isStaff ? 'pata_parcel' : sendingMethod,
      psv_sacco: !isStaff && (sendingMethod === 'psv' || sendingMethod === 'psv_driver') ? (psvSacco || null) : null,
      pick_point: !isStaff && sendingMethod === 'door_to_door' ? pickPoint.trim() : null,
      package_type: finalPackageType,
      package_description: !isStaff ? (packageDescription.trim() || null) : null,
      sending_fee: totalSendingFee,
      goods_amount: amount,
      payment_code: code || null,
    });

    setLoading(false);

    if (result.error) {
      setFormError(result.error.message || 'Failed to dispatch parcel. Please check your network.');
    } else {
      // Reset form
      setBuyerName('');
      setBuyerTiktok('');
      setBuyerPhone('');
      setDestination('');
      setDeliverySacco('');
      setPickPoint('');
      setPackageTypes([PACKAGE_TYPES[0]]);
      setPackageDescription('');
      setCustomPackageType('');
      setGoodsAmount('');
      setPaymentCode('');
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div ref={errorRef} role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Buyer Information */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          {isBuyer ? '1. Your Details' : '1. Buyer Details'}
        </h3>

        <div className="space-y-2">
          <Label htmlFor="buyer_name" className="text-xs font-medium">
            {isBuyer ? 'Your Name *' : 'Buyer Name *'}
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

        {!isStaff && (
        <div className="space-y-2">
          <Label htmlFor="buyer_tiktok" className="text-xs font-medium">
            {isBuyer ? 'TikTok Username / Handle *' : 'Buyer TikTok Username / Handle'} {!isBuyer && <span className="text-[11px] font-normal text-muted-foreground">(Optional)</span>}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              @
            </span>
            <Input
              id="buyer_tiktok"
              placeholder="e.g. mary_wanjiku or Mary Wanjiku"
              value={buyerTiktok}
              onChange={(e) => setBuyerTiktok(e.target.value)}
              required={isBuyer}
              className="h-10 pl-8 text-sm"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isBuyer
              ? 'Required so your seller can confirm and match your order to your TikTok account.'
              : 'Helps your seller identify you if multiple buyers share the same name.'}
          </p>
        </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="buyer_phone" className="text-xs font-medium">
            {isBuyer ? 'Your Phone Number *' : 'Buyer Phone Number *'}
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
            {isBuyer ? 'The seller and Pata Parcel will use this number to reach you.' : 'Buyer will receive an automated SMS with your WhatsApp contact once dispatched.'}
          </p>
        </div>
      </div>

      {/* 2. Destination & Sending Method */}
      {!isStaff && (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            2. Destination & Delivery
          </h3>

          <div className="space-y-2">
            <Label htmlFor="destination" className="text-xs font-medium">
              Destination Town *
            </Label>
            <DestinationCombobox
              id="destination"
              value={destination}
              onChange={setDestination}
              destinations={destinations}
              required
            />
          </div>

          {/* Single "Select SACCO" field with moved sending methods in the options list */}
          <div className="space-y-2">
            <Label htmlFor="delivery_sacco" className="text-xs font-medium">
              Select SACCO *
            </Label>
            <DestinationCombobox
              id="delivery_sacco"
              value={deliverySacco}
              onChange={handleDeliverySaccoChange}
              options={DELIVERY_SACCO_OPTIONS}
              listHeader="All SACCOs & Delivery Methods"
              noun="SACCO / Method"
              placeholder="Select or type SACCO / Delivery Method..."
              required
            />
          </div>

          {/* Helper if they chose generic "PSV (SACCO)" */}
          {deliverySacco === 'PSV (SACCO)' && (
            <div className="space-y-2 pt-1 border-t border-dashed border-border/60">
              <Label htmlFor="custom_sacco" className="text-xs font-medium text-primary">
                Specific SACCO Name (optional)
              </Label>
              <Input
                id="custom_sacco"
                placeholder="e.g. Ena Coach, 2NK, Guardian"
                value={psvSacco === 'PSV (SACCO)' ? '' : psvSacco}
                onChange={(e) => setPsvSacco(e.target.value.trim() ? e.target.value : 'PSV (SACCO)')}
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                If you know your specific SACCO stage, enter it here or leave blank.
              </p>
            </div>
          )}

          {/* Pick-Point selector for Door to Door */}
          {sendingMethod === 'door_to_door' && (
            <div className="space-y-2 pt-1 border-t border-dashed border-border/60">
              <Label htmlFor="pick_point" className="text-xs font-medium text-primary">
                Pick-Point (Within Nairobi) *
              </Label>
              <DestinationCombobox
                id="pick_point"
                value={pickPoint}
                onChange={setPickPoint}
                options={NAIROBI_PICK_POINTS}
                placeholder="Type pick-point (e.g. Westlands, Kasarani)..."
                required
              />
              <p className="text-[11px] text-muted-foreground">
                The Nairobi location where the rider will collect or deliver the parcel.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Package & Pricing */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
          {isStaff ? '2. Sending Fee' : '3. Package & Fees'}
        </h3>

        {!isStaff && (
          <>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">Type of Package *</legend>
              <div className="grid grid-cols-2 gap-2">
                {(!showAllPackageTypes
                  ? PACKAGE_TYPES.filter(type => type === 'Clothing' || type === 'Shoes')
                  : PACKAGE_TYPES
                ).map(type => (
                  <label key={type} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2.5 py-2 text-xs has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                    <Checkbox
                      checked={packageTypes.includes(type)}
                      onCheckedChange={checked => setPackageTypes(current => checked === true
                        ? [...current, type]
                        : current.filter(value => value !== type))}
                    />
                    <span className="break-words">{type}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAllPackageTypes(prev => !prev)}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus:outline-none"
              >
                <span>{showAllPackageTypes ? 'Show fewer options' : 'More options'}</span>
                {showAllPackageTypes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </fieldset>

            {packageTypes.includes('Other') && (
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

            <div className="space-y-2">
              <Label htmlFor="package_description" className="text-xs font-medium">
                Short Description (optional)
              </Label>
              <Textarea
                id="package_description"
                placeholder="e.g. Mummy jeans, Size 42, blue in colour"
                value={packageDescription}
                onChange={e => setPackageDescription(e.target.value)}
                rows={2}
                className="min-h-20 text-sm"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="sending_fee" className="text-xs font-medium">
            Sending Fee (KES) *
          </Label>
          {payOnDelivery ? (
            <div id="sending_fee" className="flex h-10 items-center rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-950/40 px-3 text-sm font-bold text-foreground">
              Pay on Delivery
            </div>
          ) : (
            <Input
              id="sending_fee"
              type="number"
              min="0"
              step="10"
              inputMode="numeric"
              placeholder={isStaff ? String(STAFF_SENDING_FEE) : (sendingMethod === 'psv' && !psvSacco ? 'Pick a SACCO first' : String(DEFAULT_SENDING_FEE))}
              value={sendingFee ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                setSendingFee(raw === '' ? null : Math.max(0, parseInt(raw) || 0));
              }}
              className="h-10 text-sm"
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            {isStaff
              ? 'Default sending fee is KES 50. You can adjust if different.'
              : (payOnDelivery
                ? 'PSV-Driver sending fee is paid to the driver on delivery.'
                : 'Filled in from the sending method you chose.')}
          </p>
        </div>

        {/* Auto Calculation Banner */}
        {!isBuyer && <div className="rounded-lg bg-secondary/30 p-3 border border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
              <Calculator className="h-4 w-4 text-primary" />
              <span>Total Sending Fee:</span>
            </div>
            <span className="text-base font-extrabold text-primary">
              {payOnDelivery ? 'Pay on Delivery' : `KES ${totalSendingFee}`}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1">
            <span>Pata Parcel Platform Fee:</span>
            <span>KES {totalPlatformFee} (15% of sending fee)</span>
          </div>
        </div>}

      </div>

      {/* 4. Goods Payment */}
      {showGoodsPayment && (
        <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            4. Goods Payment
          </h3>
          <div className="space-y-2">
            <Label htmlFor="goods_amount" className="text-xs font-medium">
              Total Amount (goods) {isBuyer ? '*' : '(optional)'}
            </Label>
            <Input
              id="goods_amount"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="e.g. 2500"
              value={goodsAmount}
              onChange={(e) => setGoodsAmount(e.target.value)}
              required={isBuyer}
              className="h-10 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Amount paid for the goods, not including sending fees.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_code" className="text-xs font-medium">
              M-Pesa / Airtel Money Code {isBuyer ? '*' : '(optional)'}
            </Label>
            <Input
              id="payment_code"
              placeholder="e.g. SKL4ABC12D"
              value={paymentCode}
              onChange={(e) => setPaymentCode(e.target.value.toUpperCase())}
              required={isBuyer}
              maxLength={20}
              autoCapitalize="characters"
              className="h-10 font-mono text-sm uppercase"
            />
          </div>
        </div>
      )}

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
              {isBuyer ? 'Sending...' : 'Creating...'}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {isBuyer ? 'Submit My Order' : 'Create Dispatch'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
