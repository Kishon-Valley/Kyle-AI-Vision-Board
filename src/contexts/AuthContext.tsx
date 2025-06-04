import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthError, AuthResponse, Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount, try to restore session if Supabase is configured
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const restoreSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { user: supabaseUser } = session;
        setUserFromSupabase(supabaseUser);
      }
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  // Helper function to set user from Supabase user object
  const setUserFromSupabase = (supabaseUser: SupabaseUser) => {
    const { id, email, user_metadata } = supabaseUser;

    setUser({
      id,
      email,
      name: user_metadata?.full_name || user_metadata?.name || email?.split('@')[0],
      avatar_url: user_metadata?.avatar_url
    });
  };

  // ---------- Auth helpers that fallback gracefully if Supabase is unavailable ----------
  const login = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Auth disabled (missing Supabase).' } as any };
    }
    setIsLoading(true);
    const response = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    return { error: response.error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Auth disabled (missing Supabase).' } as any };
    }
    setIsLoading(true);
    const response = await supabase.auth.signUp({ email, password });
    setIsLoading(false);
    return { error: response.error };
  };

  const loginWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const logout = async () => {
    if (!supabase) {
      setUser(null);
      localStorage.removeItem('moodboards');
      return;
    }
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('moodboards');
    setIsLoading(false);
  };

  const value = {
    user,
    login,
    signUpWithEmail,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
