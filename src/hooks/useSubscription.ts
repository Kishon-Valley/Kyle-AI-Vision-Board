import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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
          .single();

        if (error) {
          console.warn('Error checking subscription:', error);
          setHasSubscription(false);
        } else {
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

  const checkSubscription = () => {
    if (!hasSubscription) {
      navigate('/pricing');
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