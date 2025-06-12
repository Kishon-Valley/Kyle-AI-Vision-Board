import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentButton from '@/components/StripePaymentButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { handleError, secureLog } from '@/lib/error';

const PaymentPage = () => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const navigate = useNavigate();
  const location = useLocation();
  const paymentSuccess = new URLSearchParams(location.search).get('success') === 'true';
  const { hasSubscription, isLoading: subLoading } = useSubscription();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      handleError(new Error('Stripe publishable key is not configured'), 'PaymentPage');
      toast.error('Stripe publishable key is not configured');
      navigate('/');
      return;
    }
    setStripePromise(loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
  }, [navigate]);

  // Show global loaders AFTER hooks have run to keep hook order consistent
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Loading your account information...</p>
        </div>
      </div>
    );
  }

  // While checking subscription status, show loading spinner to prevent flashing pricing UI
  if (isAuthenticated && subLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Checking your subscription...</p>
        </div>
      </div>
    );
  }

  // Only show subscription success message if user is authenticated and has an active subscription
  if (isAuthenticated && hasSubscription) {
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
            <Button 
              onClick={() => navigate('/questionnaire')} 
              className="bg-orange-500 hover:bg-orange-600"
            >
              Start Creating
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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

  if (!isAuthenticated) {
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Please Log In to Continue</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
            You need to be logged in to proceed with payment.
          </p>
          <div className="space-y-4">
            <Button
              onClick={async () => {
                if (!supabase) {
                  toast.error('Authentication service is not available. Please try again later.');
                  return;
                }
                
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                      },
                    },
                  });
                  
                  if (error) throw error;
                } catch (error) {
                  console.error('Login error:', error);
                  toast.error('Failed to sign in. Please try again.');
                }
              }}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You'll be redirected to Google to sign in securely
            </p>
          </div>
        </div>
      </div>
    );
  }

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
