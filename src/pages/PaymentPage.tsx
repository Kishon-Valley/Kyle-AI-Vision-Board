import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Loader2, Crown, Sparkles, ArrowRight, Palette, Download, History } from 'lucide-react';
import StripePaymentButton from '@/components/StripePaymentButton';

const getPricingPlans = () => [
  {
    name: 'Basic',
    id: 'basic',
    price: '$1.99',
    description: 'Billed monthly',
    tier: 'basic',
    imagesPerMonth: 3,
    features: [
      '3 AI-generated mood boards per month',
      'AI-powered design suggestions',
      'High-resolution downloads',
      'Basic support'
    ]
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$4.99',
    description: 'Billed monthly',
    tier: 'pro',
    imagesPerMonth: 25,
    features: [
      '25 AI-generated mood boards per month',
      'AI-powered design suggestions',
      'High-resolution downloads',
      'Priority support',
      'Advanced customization options'
    ]
  },
  {
    name: 'Yearly Pro',
    id: 'yearly',
    price: '$29.99',
    description: 'Billed annually (Save 50%!)',
    tier: 'yearly',
    imagesPerMonth: 50,
    features: [
      '25 AI-generated mood boards per month',
      'AI-powered design suggestions',
      'High-resolution downloads',
      'Priority support',
      'Advanced customization options',
      'Exclusive templates',
      'Early access to new features'
    ],
    popular: true
  }
];

// New component for active subscribers
const ActiveSubscriberView = ({ user, navigate }: { user: any; navigate: any }) => {
  const firstName = (user?.name || user?.user_metadata?.full_name || '').split(' ')[0] || 'Welcome';
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-3">
            {firstName}, good to see you.
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Your membership is active.
          </p>
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">
            <Crown className="w-4 h-4 mr-2 text-amber-500" /> Premium
          </div>
        </div>

        {/* Subscription Benefits */}
        <Card className="mb-8 border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-slate-800 dark:text-slate-200">
              What’s included
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Tools to help you move from idea to finished space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Unlimited mood boards</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Create without limits.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Smart suggestions</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Thoughtful ideas tailored to your style.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">High‑resolution downloads</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Ready for presentations and print.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <History className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Your design library</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Every board saved and easy to find.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-sm transition-all duration-200 cursor-pointer group" onClick={() => navigate('/questionnaire')}>
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <Sparkles className="w-7 h-7 text-slate-700 dark:text-slate-200" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Create a new board
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Start your next room.
              </p>
              <Button className="w-full">
                Get started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-all duration-200 cursor-pointer group" onClick={() => navigate('/history')}>
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <History className="w-7 h-7 text-slate-700 dark:text-slate-200" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                View your history
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Browse previous boards.
              </p>
              <Button variant="outline" className="w-full">
                View history
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Management */}
        <Card className="mt-8 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 dark:text-slate-200">
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')}
                className="flex-1"
              >
                Manage Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { hasSubscription, isLoading: subLoading, refreshSubscription } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'basic' | 'pro' | 'yearly'>('basic');
  const [showContent, setShowContent] = useState(false);
  const mountedRef = useRef(false);

  // Ensure minimum loading time to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 300); // Minimum 300ms loading time

    return () => clearTimeout(timer);
  }, []);

  // Mark component as mounted after initial render
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Refresh subscription data when component mounts (useful after payment)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Add a delay to allow webhook processing
      const timer = setTimeout(() => {
        refreshSubscription();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, refreshSubscription]);

  // Show loading while checking authentication and subscription status
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

  // If user has an active subscription, show the custom subscriber page
  if (isAuthenticated && hasSubscription) {
    return <ActiveSubscriberView user={user} navigate={navigate} />;
  }

  // If user is not authenticated, show pricing plans with sign-in option
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-stretch">
          {getPricingPlans().map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 border-slate-200 dark:border-slate-700 hover:shadow-lg ${
                plan.popular ? 'ring-2 ring-orange-500 dark:ring-orange-600 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="flex items-baseline mt-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {plan.id === 'yearly' ? '/year' : '/month'}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {plan.imagesPerMonth} AI-generated mood boards per month
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
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

  // If user is authenticated but doesn't have subscription, show pricing plans
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-stretch">
        {getPricingPlans().map((plan) => (
          <Card 
            key={plan.id}
            className={`relative transition-all duration-200 ${
              billingInterval === plan.id 
                ? 'border-2 border-orange-500 dark:border-orange-600 scale-105' 
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            } ${plan.popular ? 'ring-2 ring-orange-500 dark:ring-orange-600' : ''}`}
            onClick={() => setBillingInterval(plan.id as 'basic' | 'pro' | 'yearly')}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="flex items-baseline mt-2">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  {plan.id === 'yearly' ? '/year' : '/month'}
                </span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {plan.imagesPerMonth} AI-generated mood boards per month
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {/* Replace the Subscribe button with the Stripe payment button for non-subscribed users */}
              <StripePaymentButton billingInterval={plan.id as 'basic' | 'pro' | 'yearly'} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentPage;
