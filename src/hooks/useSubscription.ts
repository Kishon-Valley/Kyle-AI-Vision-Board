import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, checkUserSubscription } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Function to check subscription status
  const checkSubscriptionStatus = async () => {
    if (!user) {
      setHasSubscription(false);
      setSubscriptionStatus('inactive');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
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
    }
  };

  // Initial check when component mounts or user changes
  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscription = () => {
    if (!hasSubscription) {
      navigate('/pricing', { replace: true });
      return false;
    }
    return true;
  };

  const refreshSubscription = async () => {
    if (!user) return;
    
    await checkSubscriptionStatus();
  };

  return {
    hasSubscription,
    isLoading,
    subscriptionStatus,
    checkSubscription,
    refreshSubscription,
  };
};