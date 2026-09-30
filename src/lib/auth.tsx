import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from './supabase';
import { checkIsAdmin, fetchProfile } from './api';
import { clearQueries } from './query';
import type { DiverProfile } from './types';

interface AuthValue {
  session: Session | null;
  userId: string | null;
  profile: DiverProfile | null;
  isAdmin: boolean;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DiverProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(isConfigured);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfileError(null);
      const [p, admin] = await Promise.all([fetchProfile(userId), checkIsAdmin()]);
      setProfile(p);
      setIsAdmin(admin);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Could not load your profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    // Never await a query inside onAuthStateChange: it deadlocks the auth client. Defer instead.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) setTimeout(() => loadProfile(data.session!.user.id), 0);
      else setLoading(false);
    });
    const fallback = setTimeout(() => setLoading(false), 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [loadProfile]);

  const value: AuthValue = {
    session,
    userId: session?.user.id ?? null,
    profile,
    isAdmin,
    loading,
    profileError,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      clearQueries();
    }
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
