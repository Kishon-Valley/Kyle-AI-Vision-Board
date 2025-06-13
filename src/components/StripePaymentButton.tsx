import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Make sure to use the correct environment variable name for Vite
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

type BillingInterval = 'month' | 'year';

interface StripePaymentButtonProps {
  billingInterval: BillingInterval;
}

const CheckoutForm: React.FC<StripePaymentButtonProps> = ({ billingInterval: initialBillingInterval }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval);
  const navigate = useNavigate();
  const { user } = useAuth();
 
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      toast.error('Stripe is not loaded');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to subscribe');
      navigate('/');
      return;
    }

    setIsLoading(true);

    try {
      const priceId = billingInterval === 'month' 
        ? import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY 
        : import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY;

      if (!priceId) {
        toast.error('Price ID is not configured');
        return;
      }

      console.log('Using price ID:', priceId);

      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          billingInterval,
          userId: user.id,
          email: user.email
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.details || `HTTP error! status: ${response.status}`);
      }

      if (!responseData.clientSecret) {
        throw new Error('No client secret received from server');
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        try {
          // Persist subscription details to Supabase so we can verify on next login
          if (!supabase) throw new Error('Supabase client not available');

          const { error: dbError } = await supabase.from('subscriptions').upsert(
            {
              user_id: user.id,
              stripe_subscription_id: responseData.subscriptionId,
              status: responseData.status || 'active',
              current_period_end: new Date(responseData.currentPeriodEnd * 1000).toISOString(),
              billing_interval: billingInterval,
            },
            {
              onConflict: 'user_id',
            }
          );

          if (dbError) {
            console.error('Failed to save subscription in DB:', dbError);
          }
        } catch (saveErr) {
          console.error('Error saving subscription:', saveErr);
        }
        // Set subscription status in localStorage
        localStorage.setItem('hasActiveSubscription', 'true');
        // Redirect to success page
        navigate('/payment-success');
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
      <div className="flex justify-center space-x-4 mb-6">
        <Button
          type="button"
          variant={billingInterval === 'month' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('month')}
        >
          Monthly ($0.80)
        </Button>
        <Button
          type="button"
          variant={billingInterval === 'year' ? 'default' : 'outline'}
          onClick={() => setBillingInterval('year')}
        >
          Yearly ($7.00)
        </Button>
      </div>

      <div className="border rounded-lg p-4">
        <PaymentElement />
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6"
        disabled={!stripe || isLoading}
      >
        {isLoading ? 'Processing...' : `Pay $${billingInterval === 'month' ? '0.80/month' : '7.00/year'}`}
      </Button>
    </form>
  );
};

const StripePaymentButton = ({ billingInterval }: StripePaymentButtonProps) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm billingInterval={billingInterval} />
    </Elements>
  );
};

export default StripePaymentButton;