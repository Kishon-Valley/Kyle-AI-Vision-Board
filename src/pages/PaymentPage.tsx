import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { env } from '@/lib/env';
import { supabase, checkUserSubscription } from '@/lib/supabase';
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

      // First, ensure the user exists in our database
      try {
        const { error: userError } = await supabase.rpc('create_or_update_user', {
          user_id: user.id,
          user_email: user.email,
          user_subscription_status: 'inactive'
        });

        if (userError) {
          console.error('Error ensuring user exists:', userError);
          // If the RPC fails, try the direct table insert as fallback
          const { error: insertError } = await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                subscription_status: 'inactive',
                updated_at: new Date().toISOString()
              },
              { onConflict: 'id' }
            );

          if (insertError) {
            console.error('Fallback user creation failed:', insertError);
            throw new Error('Failed to update user information');
          }
        }
      } catch (error) {
        console.error('Error in user creation:', error);
        // Continue with subscription even if user creation fails
        // The backend will handle user creation if needed
      }

      // Then create the subscription
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          priceId: plan.priceId, 
          userId: user.id, 
          email: user.email,
          billingInterval: billingInterval,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/pricing`
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Subscription error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        throw new Error(
          errorData?.error?.message || 
          errorData?.message || 
          `Failed to create subscription (${response.status} ${response.statusText})`
        );
      }

      
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from the server');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      let errorMessage = 'Failed to create subscription';
      
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'User account not found. Please sign out and try again.';
        } else if (error.message.includes('price_')) {
          errorMessage = 'Invalid subscription plan. Please try again or contact support.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleSubscribe(),
        },
      });
    } finally {
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
                onClick={() => {
                  setBillingInterval(plan.id as 'month' | 'year');
                  handleSubscribe();
                }}
                className={`w-full ${
                  billingInterval === plan.id 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                }`}
                disabled={isLoading === 'processing'}
              >
                {isLoading === 'processing' && billingInterval === plan.id ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Processing...
                  </span>
                ) : (
                  'Subscribe'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="hidden">
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
  error?: string;
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

        // Use the new checkUserSubscription function
        const { hasSubscription, error } = await checkUserSubscription(user.id);
        
        if (error) {
          console.error('Subscription check error:', error);
          setSubscriptionStatus({ 
            hasSubscription: false, 
            isLoading: false,
            error: error
          });
          return;
        }

        setSubscriptionStatus({
          hasSubscription,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error in subscription check:', error);
        setSubscriptionStatus({ 
          hasSubscription: false, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to check subscription'
        });
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
