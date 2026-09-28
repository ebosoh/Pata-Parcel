import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      setState({
        user: session?.user ?? null,
        profile,
        session,
        loading: false,
        error: null,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const profile = session?.user ? await fetchProfile(session.user.id) : null;
        setState({
          user: session?.user ?? null,
          profile,
          session,
          loading: false,
          error: null,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Send OTP to phone number
  const sendOTP = useCallback(async (phone: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    // Ensure Kenyan format: convert 07XX to +2547XX
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
    signOut,
    refreshProfile,
    isAuthenticated: !!state.session,
    isAdmin: state.profile?.role === 'pap_admin',
    isStaff: state.profile?.role === 'pap_staff',
    isSeller: state.profile?.role === 'seller',
  };
}
