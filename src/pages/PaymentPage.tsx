import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Loader2 } from 'lucide-react';
import StripePaymentButton from '@/components/StripePaymentButton';

const getPricingPlans = () => [
  {
    name: 'Monthly',
    id: 'month',
    price: '$1.99',
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
    price: '$15.00',
    description: 'Billed annually (save 11%)',
    features: [
      'Everything in Monthly',
      '1 month free',
      'Exclusive templates',
      'Early access to new features'
    ]
  }
];

const PaymentPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasSubscription, isLoading: subLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const mountedRef = useRef(false);

  // Ensure minimum loading time to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300); // Minimum 300ms loading time

    return () => clearTimeout(timer);
  }, []);

  // Handle redirect to questionnaire for users with active subscriptions
  useEffect(() => {
    if (isAuthenticated && hasSubscription && !isRedirecting && mountedRef.current) {
      setIsRedirecting(true);
      // Add a small delay to prevent rapid redirects
      const timer = setTimeout(() => {
        navigate('/questionnaire', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasSubscription, navigate, isRedirecting]);

  // Mark component as mounted after initial render
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Show loading while checking authentication and subscription status
  // Only show loading if we're still loading AND we haven't determined the user's state yet
  // OR if we haven't shown content yet (minimum loading time)
  const shouldShowLoading = (authLoading || subLoading) && !isAuthenticated || !showContent;
  
  if (shouldShowLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Loading your account information...</p>
        </div>
      </div>
    );
  }

  // If user has an active subscription, show redirecting message
  if (isAuthenticated && hasSubscription && isRedirecting) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Redirecting to questionnaire...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show pricing plans with sign-in option
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
        </div>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
          {getPricingPlans().map((plan) => (
            <Card key={plan.id} className="w-full md:w-1/2 lg:w-1/3 transition-all duration-200 border-slate-200 dark:border-slate-700 hover:shadow-lg">
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
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // Redirect to home page for non-authenticated users
                    navigate('/');
                  }}
                >
                  Sign In to Subscribe
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // If user is authenticated and has subscription, show active user message
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            You're Already Subscribed!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
            You have an active subscription and can enjoy unlimited access to all features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => navigate('/questionnaire')}
            >
              Create Mood Board
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/mood-boards')}
            >
              View My Mood Boards
            </Button>
          </div>
        </div>
        
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl">Your Subscription Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-left">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Unlimited mood boards</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>AI-powered design suggestions</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>High-resolution downloads</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
