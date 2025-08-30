import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

type BillingInterval = 'basic' | 'pro' | 'yearly';

interface StripePaymentButtonProps {
  billingInterval: BillingInterval;
}

const StripePaymentButton: React.FC<StripePaymentButtonProps> = ({ billingInterval }) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    if (!user || !isAuthenticated) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingInterval, userId: user.id }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create payment session');
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      toast.error('An error occurred while setting up payment');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <Button disabled>Loading user...</Button>;
  }
  
  if (!isAuthenticated) {
    return <Button disabled>Please sign in to subscribe</Button>;
  }

  return (
    <Button 
      onClick={handleSubscribe}
      className="w-full mt-6"
      disabled={loading}
    >
      {loading ? 'Processing...' : `Subscribe ${billingInterval === 'basic' ? '$1.99/month' : billingInterval === 'pro' ? '$4.99/month' : '$29.99/year'}`}
    </Button>
  );
};

export default StripePaymentButton;