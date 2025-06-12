import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initial check when component mounts
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user) {
        setHasSubscription(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error checking subscription:', error);
        }
        
        // Only update state if we actually got data
        if (data !== null) {
          setHasSubscription(!!data);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  // Re-check subscription status when user changes
  useEffect(() => {
    if (!user) {
      setHasSubscription(false);
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error checking subscription:', error);
        }
        
        if (data !== null) {
          setHasSubscription(!!data);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setHasSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [user]);

  const checkSubscription = () => {
    if (!hasSubscription) {
      navigate('/pricing', { replace: true });
      return false;
    }
    return true;
  };

  return {
    hasSubscription,
    isLoading,
    checkSubscription,
  };
};