import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search['mode'] === 'signup' ? ('signup' as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Sign In — Pata Parcel' },
      { name: 'description', content: 'Create an account or sign in to Pata Parcel with your email to manage parcels and receipts.' },
      { property: 'og:title', content: 'Sign In — Pata Parcel' },
      { property: 'og:description', content: 'Create an account or sign in to Pata Parcel with your email to manage parcels and receipts.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/login' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/login' }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { 
    sendOTP, 
    verifyOTP, 
    signInWithEmail, 
    signUpWithEmail, 
    loading, 
    error, 
    isAuthenticated, 
    profile 
  } = useAuth();
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const [checkingAccount, setCheckingAccount] = useState(true);

  useEffect(() => {
    if (!loading) setCheckingAccount(false);
  }, [loading]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const target = profile?.role === 'pap_admin'
        ? '/admin/dashboard'
        : profile?.role === 'pap_staff'
          ? '/pap/queue'
          : '/seller/dispatch';
      navigate({ to: target, replace: true });
    }
  }, [isAuthenticated, loading, profile, navigate]);

  if (checkingAccount || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking your account">
        <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <LoginForm
      onSendOTP={sendOTP}
      onVerifyOTP={verifyOTP}
      onSignInWithEmail={signInWithEmail}
      onSignUpWithEmail={signUpWithEmail}
      loading={loading}
      error={error}
      initialMode={mode === 'signup' ? 'signup' : 'signin'}
    />
  );
}
