import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign In — Pata Parcel' },
      { name: 'description', content: 'Sign in to Pata Parcel with your phone (SMS code) or email to dispatch and track parcels.' },
      { property: 'og:title', content: 'Sign In — Pata Parcel' },
      { property: 'og:description', content: 'Sign in to Pata Parcel with your phone (SMS code) or email to dispatch and track parcels.' },
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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const target = profile?.role === 'pap_admin'
        ? '/admin/dashboard'
        : profile?.role === 'pap_staff'
          ? '/pap/queue'
          : '/seller/dispatch';
      navigate({ to: target as any });
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <LoginForm
      onSendOTP={sendOTP}
      onVerifyOTP={verifyOTP}
      onSignInWithEmail={signInWithEmail}
      onSignUpWithEmail={signUpWithEmail}
      loading={loading}
      error={error}
    />
  );
}
