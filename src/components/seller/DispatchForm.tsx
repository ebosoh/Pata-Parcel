import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { serializePackageTypes, inferPackageTypesFromDescription } from '@/lib/packageDetails';
import { normalizeBuyerPhone } from '@/lib/complaints';
import { 
  PACKAGE_TYPES, 
  DELIVERY_SACCO_OPTIONS,
  isValidKenyanPhone, 
  suggestedSendingFee,
  NAIROBI_PICK_POINTS
} from '@/lib/constants';
import type { SendingMethod, Destination } from '@/types/database';
import type { CreateParcelInput } from '@/hooks/useParcels';
import { Send, Loader2, Calculator, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { STAFF_SENDING_FEE } from '@/lib/internalPickup';
import { DestinationCombobox } from '@/components/seller/DestinationCombobox';
import { trackSellerCreateDispatch } from '@/lib/analytics';

// Suggested values shown as placeholders so sellers can clear and retype them
const DEFAULT_SENDING_FEE = 150;

const BUYER_PROFILE_KEY = 'pap_buyer_profile';
const BUYER_PROFILES_BY_PHONE_KEY = 'pap_buyer_profiles_by_phone';

interface SavedBuyerProfile {
  name: string;
  phone: string;
  town: string;
  deliverySacco?: string;
  pickPoint?: string;
}

function getSavedBuyerByPhone(phone: string): SavedBuyerProfile | null {
  const normalized = normalizeBuyerPhone(phone);
  if (!normalized) return null;
  try {
    const rawMap = localStorage.getItem(BUYER_PROFILES_BY_PHONE_KEY);
    if (rawMap) {
      const map = JSON.parse(rawMap) as Record<string, SavedBuyerProfile>;
      if (map && map[normalized]) return map[normalized];
    }
    const rawSingle = localStorage.getItem(BUYER_PROFILE_KEY);
    if (rawSingle) {
      const single = JSON.parse(rawSingle) as SavedBuyerProfile;
      if (single?.phone && normalizeBuyerPhone(single.phone) === normalized) {
        return single;
      }
    }
  } catch (e) {
    console.error('Failed to read saved buyer profile from localStorage', e);
  }
  return null;
}

function saveBuyerProfile(profile: SavedBuyerProfile, saveAsDefaultBuyer: boolean): void {
  const normalized = normalizeBuyerPhone(profile.phone);
  try {
    if (normalized) {
      const rawMap = localStorage.getItem(BUYER_PROFILES_BY_PHONE_KEY);
      const map = rawMap ? (JSON.parse(rawMap) as Record<string, SavedBuyerProfile>) : {};
      map[normalized] = profile;
      localStorage.setItem(BUYER_PROFILES_BY_PHONE_KEY, JSON.stringify(map));
    }
    if (saveAsDefaultBuyer) {
      localStorage.setItem(BUYER_PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.error('Failed to save buyer profile to localStorage', e);
  }
}

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

  // Auto-populate sending fee based on selected method
  useEffect(() => {
    if (isStaff) {
      setSendingFee(STAFF_SENDING_FEE);
    } else if (suggestedFee !== null && suggestedFee !== 'on_delivery') {
      setSendingFee(suggestedFee);
    } else {
      setSendingFee(null);
    }
  }, [suggestedFee, isStaff]);
  const lastAutoFilledPhoneRef = useRef<string | null>(null);

  const applySavedBuyerProfile = (data: SavedBuyerProfile, overwriteExisting = false) => {
    if (data.name && (overwriteExisting || !buyerName.trim())) setBuyerName(data.name);
    if (data.town && (overwriteExisting || !destination.trim())) setDestination(data.town);
    if (data.deliverySacco && (overwriteExisting || !deliverySacco.trim())) {
      handleDeliverySaccoChange(data.deliverySacco);
    }
    if (data.pickPoint && (overwriteExisting || !pickPoint.trim())) setPickPoint(data.pickPoint);
  };

  const handleBuyerPhoneChange = (val: string) => {
    setBuyerPhone(val);
    const clean = val.replace(/\s/g, '');
    if (!isValidKenyanPhone(clean)) return;
    const normalized = normalizeBuyerPhone(clean);
    if (!normalized || lastAutoFilledPhoneRef.current === normalized) return;
    const saved = getSavedBuyerByPhone(clean);
    if (saved) {
      applySavedBuyerProfile(saved, true);
      lastAutoFilledPhoneRef.current = normalized;
    }
  };

  // Persist buyer details in localStorage for repeat orders
  useEffect(() => {
    if (isBuyer) {
      const stored = localStorage.getItem(BUYER_PROFILE_KEY);
      if (stored) {
        try {
          const data = JSON.parse(stored) as SavedBuyerProfile;
          if (data.name) setBuyerName(data.name);
          if (data.phone) {
            setBuyerPhone(data.phone);
            lastAutoFilledPhoneRef.current = normalizeBuyerPhone(data.phone) || null;
          }
          if (data.town) setDestination(data.town);
          if (data.deliverySacco) handleDeliverySaccoChange(data.deliverySacco);
          if (data.pickPoint) setPickPoint(data.pickPoint);
        } catch (e) {
          console.error('Failed to parse buyer profile from localStorage', e);
        }
      }
    }
  }, [isBuyer]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (formError) errorRef.current?.scrollIntoView({ block: 'center' });
  }, [formError]);

  // Total sending fee as entered by the seller (no multiplication)
  const totalSendingFee = useMemo(
    () => (payOnDelivery ? 0 : Math.max(0, sendingFee ?? (isStaff ? STAFF_SENDING_FEE : DEFAULT_SENDING_FEE))),
    [sendingFee, payOnDelivery, isStaff],
  );

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!buyerName.trim()) {
      setFormError(isBuyer ? 'Please enter your name' : 'Please enter the buyer name');
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

    const finalPackageType = isStaff
      ? 'Parcel'
      : isBuyer
        ? serializePackageTypes(inferPackageTypesFromDescription(packageDescription), '')
        : serializePackageTypes(packageTypes, customPackageType);
    if (!isStaff && !isBuyer && !finalPackageType) {
      setFormError('Please select at least one package type');
      return;
    }

    const amount = showGoodsPayment && goodsAmount.trim() !== '' ? Number(goodsAmount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setFormError('Please enter a valid amount for the goods');
      return;
    }
    if (isBuyer && amount === null) {
      setFormError('Please enter the amount you paid for the goods');
      return;
    }

    setLoading(true);

    const finalBuyerName = buyerName.trim();

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
      payment_code: null,
    });

    setLoading(false);

    if (result.error) {
      setFormError(result.error.message || 'Failed to dispatch parcel. Please check your network.');
    } else {
      if (!isStaff) {
        saveBuyerProfile(
          {
            name: finalBuyerName,
            phone: cleanPhone,
            town: destination,
            deliverySacco: deliverySacco.trim(),
            pickPoint: sendingMethod === 'door_to_door' ? pickPoint.trim() : '',
          },
          isBuyer,
        );
      }
      if (!isBuyer) {
        trackSellerCreateDispatch({
          destination: destination.trim(),
          sending_method: isStaff ? 'pata_parcel' : sendingMethod,
          package_type: finalPackageType,
          sending_fee: totalSendingFee,
          goods_amount: amount,
        });
      }
      lastAutoFilledPhoneRef.current = null;
      // Reset form
      setBuyerName('');

      setBuyerPhone('');
      setDestination('');
      setDeliverySacco('');
      setPickPoint('');
      setPackageTypes([PACKAGE_TYPES[0]]);
      setPackageDescription('');
      setCustomPackageType('');
      setGoodsAmount('');
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
      <div className="space-y-3 rounded-xl border border-border/90 bg-card p-4 shadow-md">
        {!isBuyer && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            1. Buyer Details
          </h3>
        )}

        <div className="space-y-2">
          <Label htmlFor="buyer_name" className="text-xs font-medium">
            {isBuyer ? 'Name *' : 'Buyer Name *'}
          </Label>
          <Input
            id="buyer_name"
            placeholder={isBuyer ? '' : "e.g. Mary Wanjiku"}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            className="h-10 text-sm"
          />
        </div>



        <div className="space-y-2">
          <Label htmlFor="buyer_phone" className="text-xs font-medium">
            {isBuyer ? 'Mpesa Number *' : 'Buyer Phone Number *'}
          </Label>
          <div className="relative">
            <Input
              id="buyer_phone"
              type="tel"
              placeholder={isBuyer ? '' : "0712 345 678"}
              value={buyerPhone}
              onChange={(e) => handleBuyerPhoneChange(e.target.value)}
              className="h-10 pl-3 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* 2. Destination & Sending Method */}
      {!isStaff && (
        <div className="space-y-3 rounded-xl border border-border/90 bg-card p-4 shadow-md">
          {!isBuyer && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              2. Destination & Delivery
            </h3>
          )}

          <div className="space-y-2">
            <Label htmlFor="destination" className="text-xs font-medium">
              Destination Town *
            </Label>
            <DestinationCombobox
              id="destination"
              value={destination}
              onChange={setDestination}
              destinations={destinations}
              placeholder={isBuyer ? '' : undefined}
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
              placeholder={isBuyer ? '' : "Select or type SACCO / Delivery Method..."}
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
                placeholder={isBuyer ? '' : "e.g. Ena Coach, 2NK, Guardian"}
                value={psvSacco === 'PSV (SACCO)' ? '' : psvSacco}
                onChange={(e) => setPsvSacco(e.target.value.trim() ? e.target.value : 'PSV (SACCO)')}
                className="h-10 text-sm"
              />
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
                placeholder={isBuyer ? '' : "Type pick-point (e.g. Westlands, Kasarani)..."}
                required
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Package & Pricing */}
      <div className="space-y-3 rounded-xl border border-border/90 bg-card p-4 shadow-md">
        {!isBuyer && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {isStaff ? '2. Sending Fee' : '3. Package & Fees'}
          </h3>
        )}

        {!isStaff && (
          <>
            {!isBuyer && (
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
              </>
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

        {!isBuyer && (
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
          </div>
        )}

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
        </div>}

      </div>

      {/* 4. Goods Payment */}
      {showGoodsPayment && (
        <div className="space-y-3 rounded-xl border border-border/90 bg-card p-4 shadow-md">
          {!isBuyer && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              4. Goods Payment
            </h3>
          )}
          <div className="space-y-2">
            <Label htmlFor="goods_amount" className="text-xs font-medium">
              Total Amount (goods) {isBuyer ? '*' : '(optional)'}
            </Label>
            <Input
              id="goods_amount"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder={isBuyer ? '' : "e.g. 2500"}
              value={goodsAmount}
              onChange={(e) => setGoodsAmount(e.target.value)}
              required={isBuyer}
              className="h-10 text-sm"
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
