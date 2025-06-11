import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useSubscription = () => {
  const [hasSubscription, setHasSubscription] = useState<boolean>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('hasActiveSubscription');
    return stored === 'true';
  });
  const navigate = useNavigate();

  // Update state when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('hasActiveSubscription');
      setHasSubscription(stored === 'true');
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Initial check
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const checkSubscription = () => {
    const subscriptionStatus = localStorage.getItem('hasActiveSubscription');
    const isSubscribed = subscriptionStatus === 'true';
    setHasSubscription(isSubscribed);
    
    if (!isSubscribed) {
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