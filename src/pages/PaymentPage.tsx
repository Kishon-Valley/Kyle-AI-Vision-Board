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

// New component for active subscribers
const ActiveSubscriberView = ({ user, navigate }: { user: any; navigate: any }) => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-20"></div>
            <div className="relative w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Welcome Back, {user?.name?.split(' ')[0] || 'Designer'}! 👋
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-2">
            You're already subscribed to our Premium plan
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
            <Crown className="w-4 h-4 mr-2" />
            Active Premium Member
          </div>
        </div>

        {/* Subscription Benefits */}
        <Card className="mb-8 border-2 border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-800 dark:text-slate-200">
              Your Premium Benefits
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Unlock unlimited creativity with these exclusive features
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
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Unlimited Mood Boards</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Create as many AI-generated designs as you want</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">AI-Powered Suggestions</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Get personalized design recommendations</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">High-Resolution Downloads</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Download your designs in print-ready quality</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <History className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Design History</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Access all your saved mood boards anytime</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/questionnaire')}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Create New Mood Board
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Start designing your next space with AI
              </p>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/history')}>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <History className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                View Your History
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Browse all your saved mood boards
              </p>
              <Button variant="outline" className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                View History
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
  const { hasSubscription, isLoading: subLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
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

  // If user is authenticated but doesn't have subscription, show pricing plans
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300">Select the plan that works best for you</p>
      </div>
      <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
        {getPricingPlans().map((plan) => (
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
              {/* Replace the Subscribe button with the Stripe payment button for non-subscribed users */}
              <StripePaymentButton billingInterval={plan.id as 'month' | 'year'} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentPage;
