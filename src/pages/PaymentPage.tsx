import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentButton from '@/components/StripePaymentButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentPage = () => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const navigate = useNavigate();

  const pricingPlans = [
    {
      name: 'Monthly',
      id: 'month',
      price: '$0.70',
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

      <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Complete Your Subscription</h2>
        <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
          <Elements stripe={stripePromise}>
            <StripePaymentButton />
          </Elements>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
          Your payment is secure and encrypted. We use Stripe for secure payment processing.
        </p>
      </div>
    </div>
  );
};

export default PaymentPage;
