import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, ArrowRight, Loader2, Phone, Mail, Sparkles } from 'lucide-react';
import { isValidKenyanPhone } from '@/lib/constants';

interface LoginFormProps {
  onSendOTP: (phone: string) => Promise<{ error: { message: string } | null }>;
  onVerifyOTP: (phone: string, token: string) => Promise<{ error: { message: string } | null; data: unknown }>;
  onSignInWithEmail?: (email: string, pass: string) => Promise<{ error: { message: string } | null; data: unknown }>;
  onSignUpWithEmail?: (email: string, pass: string, profile: any) => Promise<{ error: { message: string } | null; data: unknown }>;
  loading: boolean;
  error: string | null;
}

export function LoginForm({
  onSendOTP,
  onVerifyOTP,
  onSignInWithEmail,
  onSignUpWithEmail,
  loading,
  error,
}: LoginFormProps) {
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  // Phone submit
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanPhone = phone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setLocalError('Please enter a valid Kenyan phone number (e.g. 0712 345 678)');
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

  // Email submit
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    if (emailMode === 'signup') {
      if (!ownerName.trim()) {
        setLocalError('Please enter your full name');
        return;
      }
      if (!isValidKenyanPhone(sellerPhone)) {
        setLocalError('Please enter a valid phone number (07XX / 01XX)');
        return;
      }
      if (onSignUpWithEmail) {
        await onSignUpWithEmail(email, password, {
          owner_name: ownerName.trim(),
          phone: sellerPhone.trim(),
          business_name: businessName.trim() || undefined,
        });
      }
    } else {
      if (onSignInWithEmail) {
        await onSignInWithEmail(email, password);
      }
    }
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo & Branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg ring-4 ring-secondary/30">
          <Package className="h-9 w-9 text-secondary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Pata Parcel</h1>
        <p className="mt-0.5 text-xs font-semibold text-primary uppercase tracking-wider">
          Delivering Trust, Every Time
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Auth Method Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'phone'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            Phone SMS
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'email'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Login
          </button>
        </div>

        {displayError && (
          <div className="mb-4 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
            {displayError}
          </div>
        )}

        {/* 1. Phone OTP Flow */}
        {authMethod === 'phone' && (
          step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Safaricom / Airtel Phone Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    +254
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-14 text-sm"
                    maxLength={12}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  We'll send a 6-digit OTP code to your phone
                </p>
              </div>

              <Button
                type="submit"
                className="w-full font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                disabled={loading || !phone}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Send Code via SMS
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs font-semibold">
                  6-Digit SMS Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-xl tracking-[0.4em] font-mono"
                  maxLength={6}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sent to {phone}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Verify & Enter Portal'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                }}
              >
                Change phone number
              </Button>
            </form>
          )
        )}

        {/* 2. Email / Password Flow */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {emailMode === 'signup' && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="em_owner" className="text-xs font-medium">Owner Full Name *</Label>
                  <Input
                    id="em_owner"
                    placeholder="e.g. Grace Njeri"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="em_biz" className="text-xs font-medium">Business Name (TikTok / IG)</Label>
                  <Input
                    id="em_biz"
                    placeholder="e.g. Trendy Closets"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="em_phone" className="text-xs font-medium">Phone Number *</Label>
                  <Input
                    id="em_phone"
                    placeholder="0712 345 678"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="em_email" className="text-xs font-medium">Email Address</Label>
              <Input
                id="em_email"
                type="email"
                placeholder="seller@pataparcel.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="em_pass" className="text-xs font-medium">Password</Label>
              <Input
                id="em_pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 mt-2"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : emailMode === 'signup' ? (
                'Create Seller Account'
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setEmailMode(emailMode === 'signin' ? 'signup' : 'signin')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {emailMode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already registered? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
