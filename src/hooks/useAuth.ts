import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/types/database';
import { deferredAuthUpdate } from '@/lib/authFlow';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const updates = deferredAuthUpdate<Session | null>(async (session, isCurrent) => {
      try {
        // Revalidate confirmation with Auth, rather than trusting cached user data.
        const { data, error } = session
          ? await supabase.auth.getUser()
          : { data: { user: null }, error: null };
        if (!isCurrent()) return;
        const user = error ? null : data.user;
        const profile = user ? await fetchProfile(user.id) : null;
        if (!isCurrent()) return;
        setState({
          user,
          profile,
          session: user ? session : null,
          loading: false,
          error: error ? 'Unable to check your account. Please sign in again.' : null,
        });
      } catch {
        if (isCurrent()) {
          setState(prev => ({ ...prev, loading: false, error: 'Unable to check your account. Please try again.' }));
        }
      }
    });

    // INITIAL_SESSION also processes email-link callbacks. Never await Auth or
    // profile queries inside this subscriber: doing so can block confirmation.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        updates.schedule(session);
      }
    );

    return () => {
      subscription.unsubscribe();
      updates.dispose();
    };
  }, [fetchProfile]);

  // Send OTP to phone number
  const sendOTP = useCallback(async (phone: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const formattedPhone = phone.startsWith('0')
      ? `+254${phone.slice(1)}`
      : phone.startsWith('+') ? phone : `+254${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setState(prev => ({
      ...prev,
      loading: false,
      error: error?.message ?? null,
    }));

    return { error };
  }, []);

  // Verify OTP
  const verifyOTP = useCallback(async (phone: string, token: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const formattedPhone = phone.startsWith('0')
      ? `+254${phone.slice(1)}`
      : phone.startsWith('+') ? phone : `+254${phone}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });

    if (!error && data.user) {
      const profile = await fetchProfile(data.user.id);
      setState({
        user: data.user,
        profile,
        session: data.session,
        loading: false,
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message ?? 'Verification failed',
      }));
    }

    return { data, error };
  }, [fetchProfile]);

  // Sign in with Email / Password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      const profile = await fetchProfile(data.user.id);
      setState({
        user: data.user,
        profile,
        session: data.session,
        loading: false,
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message ?? 'Sign in failed',
      }));
    }

    return { data, error };
  }, [fetchProfile]);

  // Sign up with Email / Password
  const signUpWithEmail = useCallback(async (email: string, password: string, initialProfile: {
    owner_name: string;
    phone: string;
    business_name?: string;
    business_type?: string;
    location?: string;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        // Profile row is created by the handle_new_user database trigger
        data: {
          owner_name: initialProfile.owner_name,
          phone: initialProfile.phone,
          business_name: initialProfile.business_name,
          business_type: initialProfile.business_type,
          location: initialProfile.location,
        },
      },
    });

    if (!error && data.user && data.session) {
      const profile = await fetchProfile(data.user.id);
      setState({
        user: data.user,
        profile,
        session: data.session,
        loading: false,
        error: null,
      });
    } else if (!error && data.user) {
      // Email confirmation required — no session yet
      setState(prev => ({ ...prev, loading: false, error: null }));
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message ?? 'Sign up failed',
      }));
    }

    return { data, error };
  }, [fetchProfile]);

  // Create or Update Profile
  const updateProfile = useCallback(async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!state.user) {
      return { error: new Error('User not authenticated') };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Upsert profile
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: state.user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      setState(prev => ({
        ...prev,
        profile: data as Profile,
        loading: false,
      }));

      return { data, error: null };
    } catch (err: any) {
      const msg = err?.message || 'Failed to update profile';
      setState(prev => ({ ...prev, loading: false, error: msg }));
      return { error: err };
    }
  }, [state.user]);

  // Send password reset email
  const resetPassword = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setState(prev => ({ ...prev, loading: false, error: error?.message ?? null }));
    return { error };
  }, []);

  // Update password (called after the user clicks the reset link)
  const updatePassword = useCallback(async (newPassword: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    setState(prev => ({ ...prev, loading: false, error: error?.message ?? null }));
    return { data, error };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
    });
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  return {
    ...state,
    sendOTP,
    verifyOTP,
    signInWithEmail,
    signUpWithEmail,
    updateProfile,
    resetPassword,
    updatePassword,
    signOut,
    refreshProfile,
    isAuthenticated: !!state.session,
    isAdmin: state.profile?.role === 'pap_admin',
    isStaff: state.profile?.role === 'pap_staff',
    isAssistantStaff: state.profile?.role === 'assistant_staff',
    isSeller: state.profile?.role === 'seller' || (!state.profile?.role && !!state.session),
  };
}
