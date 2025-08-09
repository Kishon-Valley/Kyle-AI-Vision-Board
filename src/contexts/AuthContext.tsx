import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    // Check for active Supabase session
    const getSession = async () => {
      setIsLoading(true);
      
      // Get session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { user: supabaseUser } = session;
        setUserFromSupabase(supabaseUser);
      }
      
      setIsLoading(false);
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
        setIsLoading(false);
      }
    );
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);
  
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return { error: response.error };
  };
  
  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await supabase.auth.signUp({
      email,
      password,
    });
    setIsLoading(false);
    return { error: response.error };
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
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
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
