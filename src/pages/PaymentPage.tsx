import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentButton from '@/components/StripePaymentButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

const PaymentPage = () => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const navigate = useNavigate();
  const { hasSubscription } = useSubscription();

  if (hasSubscription) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Thank you for your subscription!</CardTitle>
            <CardDescription className="text-xl mt-2">
              You have an active subscription to our service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your subscription gives you access to all features including:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Unlimited mood boards
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                AI-powered design suggestions
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                High-resolution downloads
              </li>
              <li className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/questionnaire')} className="bg-orange-500 hover:bg-orange-600">
              Start Creating
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      toast.error('Stripe publishable key is not configured');
      navigate('/');
      return;
    }
    setStripePromise(loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
  }, [navigate]);

  const pricingPlans = [
    {
      name: 'Monthly',
      id: 'month',
      price: '$0.80',
      description: 'Billed monthly',
      features: [
        'Unlimited mood boards',
        'AI-powered design suggestions',
        'High-resolution downloads',
        'Priority support'
      ]
    },
    {
      name: 'Yearly',
      id: 'year',
      price: '$7.00',
      description: 'Billed annually (save 11%)',
      features: [
        'Everything in Monthly',
        '1 month free',
        'Exclusive templates',
        'Early access to new features'
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">
          Select the plan that works best for you
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.id}
            className={`w-full md:w-1/2 lg:w-1/3 transition-all duration-200 ${
              billingInterval === plan.id 
                ? 'border-2 border-orange-500 dark:border-orange-600 scale-105' 
                : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
            }`}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="flex items-baseline mt-2">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  {plan.id === 'month' ? '/month' : '/year'}
                </span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                variant={billingInterval === plan.id ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setBillingInterval(plan.id as 'month' | 'year')}
              >
                {billingInterval === plan.id ? 'Selected' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="max-w-4xl mx-auto text-center mt-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Complete Your Subscription</h2>
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
          {billingInterval === 'month' ? 'Pay $0.80/month' : 'Pay $7.00/year'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Your payment is secure and encrypted. We use Stripe for secure payment processing.
        </p>

        <div className="max-w-lg mx-auto">
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripePaymentButton billingInterval={billingInterval} />
            </Elements>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading payment processing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
