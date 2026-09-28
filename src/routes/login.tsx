import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { sendOTP, verifyOTP, loading, error, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      const target = profile.role === 'pap_admin'
        ? '/admin/dashboard'
        : profile.role === 'pap_staff'
          ? '/pap/queue'
          : '/seller/dispatch';
      navigate({ to: target });
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <LoginForm
      onSendOTP={sendOTP}
      onVerifyOTP={verifyOTP}
      loading={loading}
      error={error}
    />
  );
}
