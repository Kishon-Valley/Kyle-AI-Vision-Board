import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, checkUserSubscription } from '@/lib/supabase';
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
        const { hasSubscription: active, error } = await checkUserSubscription(user.id);

        if (error) {
          console.warn('Error checking subscription:', error);
        }

        setHasSubscription(active);
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