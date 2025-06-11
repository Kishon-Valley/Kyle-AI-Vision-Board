import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const subscriptionStatus = localStorage.getItem('hasActiveSubscription');
    setHasSubscription(subscriptionStatus === 'true');
  }, []);

  const checkSubscription = () => {
    const subscriptionStatus = localStorage.getItem('hasActiveSubscription');
    if (subscriptionStatus !== 'true') {
      navigate('/pricing');
      return false;
    }
    return true;
  };

  return {
    hasSubscription,
    checkSubscription,
  };
}; 