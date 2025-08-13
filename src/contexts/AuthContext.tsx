import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AuthError, AuthResponse, Session, User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatar_url?: string;
  user_metadata?: { [key: string]: any };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
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
  const isInitializedRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to set user from Supabase user object
  const setUserFromSupabase = (supabaseUser: SupabaseUser) => {
    const { id, email, user_metadata } = supabaseUser;
    
    setUser({
      id,
      email,
      name: user_metadata?.full_name || user_metadata?.name || email?.split('@')[0],
      avatar_url: user_metadata?.avatar_url,
      user_metadata: user_metadata,
    });
  };

  // Helper function to safely set loading state with debouncing
  const setLoadingSafely = (loading: boolean) => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // If setting to false, add a small delay to prevent rapid toggles
    if (!loading && isInitializedRef.current) {
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 100);
    } else {
      setIsLoading(loading);
    }
  };

  useEffect(() => {
    // Check for active Supabase session
    const getSession = async () => {
      setLoadingSafely(true);
      
      try {
        // Get session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { user: supabaseUser } = session;
          setUserFromSupabase(supabaseUser);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoadingSafely(false);
        isInitializedRef.current = true;
      }
    };
    
    getSession();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const supabaseUser = session?.user ?? null;
        if (supabaseUser) {
          setUserFromSupabase(supabaseUser);
        } else {
          setUser(null);
        }
        // Only set loading to false if we've already initialized
        if (isInitializedRef.current) {
          setLoadingSafely(false);
        }
      }
    );
    
    return () => {
      authListener?.subscription?.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoadingSafely(true);
    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: response.error };
    } finally {
      setLoadingSafely(false);
    }
  };
  
  const signUpWithEmail = async (email: string, password: string) => {
    setLoadingSafely(true);
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
      });
      return { error: response.error };
    } finally {
      setLoadingSafely(false);
    }
  };
  
  const loginWithGoogle = async () => {
    try {
      console.log('Initiating Google OAuth login...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated successfully:', data);
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error);
      throw error;
    }
  };

  const logout = async () => {
    setLoadingSafely(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoadingSafely(false);
    }
  };

  const refreshUser = async () => {
    // First, refresh the session to get the latest user data from the server
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Error refreshing session:', refreshError.message);
      // Don't proceed if session refresh fails
      return;
    }

    // After refreshing, getUser() will return the updated user from the new session
    const { data: { user: supabaseUser }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) {
      console.error('Error getting user after refresh:', getUserError.message);
      return;
    }

    if (supabaseUser) {
      setUserFromSupabase(supabaseUser);
    }
  };

  const value = {
    user,
    login,
    signUpWithEmail,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
