import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Loader2 } from 'lucide-react';

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

  // Show loading while checking authentication and subscription status
  if (authLoading || subLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Loading your account information...</p>
        </div>
      </div>
    );
  }

  // If user has an active subscription, show success page content
  if (isAuthenticated && hasSubscription) {
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
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                Unlimited mood boards
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                AI-powered design suggestions
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                High-resolution downloads
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
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
                    // For now, just navigate to questionnaire
                    navigate('/questionnaire');
                  }}
                >
                  Select Plan
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
              <Button
                onClick={() => {
                  // For now, just navigate to questionnaire
                  navigate('/questionnaire');
                }}
                className={`w-full ${
                  billingInterval === plan.id 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900'
                }`}
              >
                Subscribe
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentPage;
