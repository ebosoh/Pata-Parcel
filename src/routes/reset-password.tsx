import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Reset Password — Pata Parcel' },
      { name: 'description', content: 'Set a new password for your Pata Parcel account.' },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { updatePassword, loading, error } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Supabase embeds the recovery token in the URL hash on redirect.
  // onAuthStateChange fires RECOVERY which gives us a valid session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
        } else if (event === 'SIGNED_IN' && session) {
          // Also handle when already signed in via hash
          setSessionReady(true);
        }
      }
    );

    // If the hash contains access_token from Supabase magic link, it fires
    // SIGNED_IN / PASSWORD_RECOVERY automatically.  Fallback: check current
    // session in case the page is refreshed.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }

    const { error } = await updatePassword(password);
    if (!error) {
      setDone(true);
      setTimeout(() => navigate({ to: '/login', replace: true }), 3000);
    }
  };

  const displayError = localError || error;

  if (sessionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm text-center space-y-4">
          <h2 className="text-sm font-bold text-destructive">Invalid or expired link</h2>
          <p className="text-xs text-muted-foreground">
            This password reset link has expired or already been used. Please request a new one.
          </p>
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => navigate({ to: '/login', replace: true })}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg ring-4 ring-secondary/30">
          <Package className="h-9 w-9 text-secondary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Pata Parcel</h1>
        <p className="mt-0.5 text-xs font-semibold text-primary uppercase tracking-wider">
          Delivering Trust, Every Time
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {done ? (
          <div className="text-center space-y-3 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Password updated!</h2>
            <p className="text-xs text-muted-foreground">
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-1 pb-1">
              <h2 className="text-sm font-bold text-foreground">Set a new password</h2>
              <p className="text-xs text-muted-foreground">Choose a strong password for your account.</p>
            </div>

            {displayError && (
              <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {displayError}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="rp_pass" className="text-xs font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="rp_pass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-9 text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Minimum 8 characters</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rp_confirm" className="text-xs font-medium">Confirm New Password</Label>
              <Input
                id="rp_confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
