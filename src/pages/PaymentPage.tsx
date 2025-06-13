import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const pricingPlans = [
  {
    name: 'Monthly',
    id: 'month',
    price: '$0.80',
    description: 'Billed monthly',
    priceId: env.stripe.priceIds.monthly,
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
    priceId: env.stripe.priceIds.yearly,
    features: [
      'Everything in Monthly',
      '1 month free',
      'Exclusive templates',
      'Early access to new features'
    ]
  }
];

const PaymentForm = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle payment success/failure from URL params
  useEffect(() => {
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    
    if (status === 'success') {
      toast.success(message || 'Payment successful! Your subscription is now active.');
    } else if (status === 'error') {
      setError(message || 'There was an error processing your payment.');
      toast.error(message || 'There was an error processing your payment.');
    }
  }, [searchParams]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    setIsLoading('processing');
    setError(null);
    
    try {
      const plan = pricingPlans.find(p => p.id === billingInterval);
      if (!plan?.priceId) {
        throw new Error('Invalid plan selected');
      }

      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          priceId: plan.priceId, 
          userId: user.id, 
          email: user.email,
          billingInterval: billingInterval
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to create subscription');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from the server');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Subscription failed: ${errorMessage}`);
      setIsLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
        {pricingPlans.map((plan) => (
          <Card 
            key={plan.id}
            className={`w-full md:w-1/2 lg:w-1/3 transition-all duration-200 ${
              billingInterval === plan.id 
                ? 'border-2 border-orange-500 dark:border-orange-600 scale-105' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            onClick={() => setBillingInterval(plan.id as 'month' | 'year')}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-lg">
                {plan.price} <span className="text-sm text-slate-500">/ {plan.id}</span>
              </CardDescription>
              <p className="text-sm text-slate-500">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${
                  billingInterval === plan.id 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                }`}
                disabled={isLoading === 'processing'}
              >
                {billingInterval === plan.id ? 'Selected' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Ready to get started?</h2>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleSubscribe}
          disabled={!billingInterval || isLoading === 'processing'}
          className="w-full max-w-md mx-auto block"
          size="lg"
        >
          {isLoading === 'processing' ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Processing...
            </span>
          ) : (
            `Get Started with ${billingInterval === 'month' ? 'Monthly' : 'Yearly'} Plan`
          )}
        </Button>
        
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Secure payment powered by{' '}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
            Stripe
          </a>
        </p>
      </div>
    </div>
  );
};

interface SubscriptionStatus {
  hasSubscription: boolean;
  isLoading: boolean;
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ 
    hasSubscription: false, 
    isLoading: true 
  });

  // Check subscription status when user is authenticated
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated) {
        setSubscriptionStatus({ hasSubscription: false, isLoading: false });
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSubscriptionStatus({ hasSubscription: false, isLoading: false });
          return;
        }

        // Check if user has an active subscription in the database
        const { data: userData, error } = await supabase
          .from('users')
          .select('subscription_status')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setSubscriptionStatus({
          hasSubscription: userData?.subscription_status === 'active',
          isLoading: false,
        });
      } catch (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionStatus({ hasSubscription: false, isLoading: false });
      }
    };

    checkSubscription();
  }, [isAuthenticated]);

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

  if (isAuthenticated && subscriptionStatus.isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Checking your subscription status...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && subscriptionStatus.hasSubscription) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Thank you for your subscription!</CardTitle>
            <CardDescription className="text-xl mt-2">You have an active subscription to our service</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Your subscription gives you access to all features including:</p>
            <ul className="space-y-2">
              <li className="flex items-center"><svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>Unlimited mood boards</li>
              <li className="flex items-center"><svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>AI-powered design suggestions</li>
              <li className="flex items-center"><svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>High-resolution downloads</li>
              <li className="flex items-center"><svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>Priority support</li>
            </ul>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/questionnaire')} className="bg-orange-500 hover:bg-orange-600">Start Creating</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
        </div>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={`w-full md:w-1/2 lg:w-1/3 transition-all duration-200 border-slate-200 dark:border-slate-700 hover:shadow-lg`}>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="flex items-baseline mt-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">{plan.id === 'month' ? '/month' : '/year'}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant='outline' className="w-full" onClick={async () => { if (!supabase) { toast.error('Authentication service is not available.'); return; } try { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } }); if (error) throw error; } catch (error) { console.error('Login error:', error); toast.error('Failed to sign in.'); } }}>Select Plan</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return <PaymentForm />;
};

export default PaymentPage;
