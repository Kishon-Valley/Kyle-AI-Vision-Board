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

  // Function to check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      return;
    }

    if (!user) {
      setHasSubscription(false);
      setSubscriptionStatus('inactive');
      setIsLoading(false);
      return;
    }

    // Prevent checking for the same user multiple times
    if (lastUserIdRef.current === user.id) {
      return;
    }

    try {
      isCheckingRef.current = true;
      lastUserIdRef.current = user.id;
      setIsLoading(true);
      
      // Add a small delay to prevent rapid state changes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First try the new API endpoint for better synchronization
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Subscription check result:', data);
        setHasSubscription(data.hasSubscription);
        setSubscriptionStatus(data.subscriptionStatus);
      } else {
        // Fallback to local database check
        const { hasSubscription: active, error } = await checkUserSubscription(user.id);
        if (error) {
          console.warn('Error checking subscription:', error);
        }
        setHasSubscription(active);
        setSubscriptionStatus(active ? 'active' : 'inactive');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasSubscription(false);
      setSubscriptionStatus('inactive');
    } finally {
      setIsLoading(false);
      isCheckingRef.current = false;
    }
  }, [user]);

  // Initial check when component mounts or user changes
  useEffect(() => {
    // Only check if user has changed
    if (user?.id !== lastUserIdRef.current) {
      checkSubscriptionStatus();
    }
  }, [user?.id, checkSubscriptionStatus]);

  const checkSubscription = useCallback(() => {
    if (!hasSubscription) {
      navigate('/pricing', { replace: true });
      return false;
    }
    return true;
  }, [hasSubscription, navigate]);

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    
    // Reset the ref to force a fresh check
    lastUserIdRef.current = null;
    await checkSubscriptionStatus();
  }, [user, checkSubscriptionStatus]);

  return {
    hasSubscription,
    isLoading,
    subscriptionStatus,
    checkSubscription,
    refreshSubscription,
  };
};