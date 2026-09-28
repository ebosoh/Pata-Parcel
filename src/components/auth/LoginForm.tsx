import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, ArrowRight, Loader2 } from 'lucide-react';
import { isValidKenyanPhone } from '@/lib/constants';

interface LoginFormProps {
  onSendOTP: (phone: string) => Promise<{ error: { message: string } | null }>;
  onVerifyOTP: (phone: string, token: string) => Promise<{ error: { message: string } | null; data: unknown }>;
  loading: boolean;
  error: string | null;
}

export function LoginForm({ onSendOTP, onVerifyOTP, loading, error }: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanPhone = phone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setLocalError('Please enter a valid Kenyan phone number (e.g., 0712 345 678)');
      return;
    }

    const { error } = await onSendOTP(cleanPhone);
    if (!error) {
      setStep('otp');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (otp.length !== 6) {
      setLocalError('Please enter the 6-digit code');
      return;
    }

    const cleanPhone = phone.replace(/\s/g, '');
    await onVerifyOTP(cleanPhone, otp);
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Logo & Branding */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Package className="h-9 w-9 text-secondary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Pata Parcel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Delivering Trust, Every Time</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  +254
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-14"
                  maxLength={12}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send you a verification code via SMS
              </p>
            </div>

            {displayError && (
              <p className="text-sm text-destructive">{displayError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !phone}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Send Verification Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            {displayError && (
              <p className="text-sm text-destructive">{displayError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Verify & Sign In'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setStep('phone');
                setOtp('');
              }}
            >
              Change phone number
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
