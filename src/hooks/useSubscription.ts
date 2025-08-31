import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, checkUserSubscription } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCheckingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Function to check subscription status
  const checkSubscriptionStatus = useCallback(async (forceCheck = false) => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      return;
    }

    if (!user) {
      if (mountedRef.current) {
        setHasSubscription(false);
        setSubscriptionStatus('inactive');
        setIsLoading(false);
      }
      return;
    }

    // Prevent checking for the same user multiple times unless forced
    if (!forceCheck && lastUserIdRef.current === user.id) {
      return;
    }

    try {
      isCheckingRef.current = true;
      lastUserIdRef.current = user.id;
      
      if (mountedRef.current) {
        setIsLoading(true);
      }
      
      // Add a small delay to prevent rapid state changes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if component is still mounted before proceeding
      if (!mountedRef.current) {
        return;
      }
      
      // First try the new API endpoint for better synchronization
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscription check result:', data);
        
        if (mountedRef.current) {
          setHasSubscription(data.hasSubscription);
          setSubscriptionStatus(data.subscriptionStatus);
        }
      } else {
        // Fallback to local database check
        const { hasSubscription: active, error } = await checkUserSubscription(user.id);
        if (error) {
          console.warn('Error checking subscription:', error);
        }
        
        if (mountedRef.current) {
          setHasSubscription(active);
          setSubscriptionStatus(active ? 'active' : 'inactive');
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      
      if (mountedRef.current) {
        setHasSubscription(false);
        setSubscriptionStatus('inactive');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      isCheckingRef.current = false;
    }
  }, [user?.id]); // Only depend on user.id, not the entire user object

  // Initial check when component mounts or user changes
  useEffect(() => {
    // Reset state when user changes
    if (user?.id !== lastUserIdRef.current) {
      // Reset refs when user changes
      lastUserIdRef.current = null;
      isCheckingRef.current = false;
      
      // Reset state immediately for new user
      setHasSubscription(false);
      setSubscriptionStatus('inactive');
      setIsLoading(true);
    }
    
    // Check subscription status
    checkSubscriptionStatus();
  }, [user?.id, checkSubscriptionStatus]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      isCheckingRef.current = false;
    };
  }, []);

  const checkSubscription = useCallback(() => {
    if (!hasSubscription) {
      navigate('/pricing', { replace: true });
      return false;
    }
    return true;
  }, [hasSubscription, navigate]);

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    
    // Force a fresh check by passing true
    await checkSubscriptionStatus(true);
  }, [checkSubscriptionStatus]);

  return {
    hasSubscription,
    isLoading,
    subscriptionStatus,
    checkSubscription,
    refreshSubscription,
  };
};