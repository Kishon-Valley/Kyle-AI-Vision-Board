import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Make sure to use the correct environment variable name for Vite
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

type BillingInterval = 'month' | 'year';

interface StripePaymentButtonProps {
  billingInterval: BillingInterval;
}

const CheckoutForm: React.FC<StripePaymentButtonProps> = ({ billingInterval: initialBillingInterval }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialBillingInterval);
 
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
      const priceId = billingInterval === 'month' 
        ? import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY 
        : import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY;

      if (!priceId) {
        toast.error('Price ID is not configured');
        return;
      }

      const response = await fetch('https://www.moodboardgenerator.com/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          billingInterval,
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create subscription');
      }

      if (!responseData.clientSecret) {
        throw new Error('No client secret received');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(responseData.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful!');
        // Handle successful payment (e.g., redirect to success page)
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
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }} 
        />
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