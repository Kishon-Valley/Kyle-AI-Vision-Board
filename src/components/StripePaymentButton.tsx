import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Make sure to use the correct environment variable name for Vite
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
  locale: 'en'
});

type BillingInterval = 'month' | 'year';

interface StripePaymentButtonProps {
  billingInterval: BillingInterval;
}

const CheckoutForm: React.FC<StripePaymentButtonProps> = ({ billingInterval }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe is not loaded');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <PaymentElement />
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6"
        disabled={!stripe || isLoading}
      >
        {isLoading ? 'Processing...' : `Pay $${billingInterval === 'month' ? '1.99/month' : '15.00/year'}`}
      </Button>
    </form>
  );
};

const StripePaymentButton: React.FC<StripePaymentButtonProps> = ({ billingInterval }) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const fetchClientSecret = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billingInterval, userId: user.id }),
        });
        let errorMessage = 'Failed to initialize payment';
        try {
          const data = await res.json();
          if (res.ok && data.clientSecret) {
            setClientSecret(data.clientSecret);
            return;
          } else {
            errorMessage = data.error || errorMessage;
          }
        } catch (parseError) {
          // If JSON parsing fails, use the status text
          errorMessage = `${errorMessage}: ${res.status} ${res.statusText}`;
        }
        toast.error(errorMessage);
      } catch (err) {
        toast.error('Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };
    fetchClientSecret();
  }, [billingInterval, user, isAuthenticated]);

  if (authLoading) {
    return <Button disabled>Loading user...</Button>;
  }
  if (!isAuthenticated) {
    return <Button disabled>Please sign in to subscribe</Button>;
  }
  if (loading) {
    return <Button disabled>Loading payment...</Button>;
  }
  if (!clientSecret) {
    return <Button disabled>Unable to start payment</Button>;
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm billingInterval={billingInterval} />
    </Elements>
  );
};

export default StripePaymentButton;