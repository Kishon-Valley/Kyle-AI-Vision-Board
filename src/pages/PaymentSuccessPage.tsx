import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const PaymentSuccessPage = () => {
  const { hasSubscription, isLoading, checkSubscription } = useSubscription();
  const [isSettingSubscription, setIsSettingSubscription] = useState(false);

  useEffect(() => {
    // Set payment status in localStorage
    localStorage.setItem('hasActiveSubscription', 'true');
    // Force a re-render to update subscription state
    window.dispatchEvent(new Event('storage'));
  }, []);

  const handleStartCreating = async () => {
    try {
      setIsSettingSubscription(true);
      // Ensure subscription is set
      localStorage.setItem('hasActiveSubscription', 'true');
      // Force a re-render to update subscription state
      window.dispatchEvent(new Event('storage'));
      
      // Wait a bit to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Double check subscription before navigating
      if (checkSubscription()) {
        window.location.href = '/questionnaire';
      }
    } finally {
      setIsSettingSubscription(false);
    }
  };

  // Redirect unauthenticated or unsubscribed users back to pricing when not loading
  if (!isLoading && !hasSubscription) {
    return <Navigate to="/pricing" replace />;
  }

  // Show loader while subscription check in progress
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CheckCircle2 className="h-10 w-10 animate-spin text-green-500" />
          <p className="text-gray-600">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-green-500">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">Payment Successful!</CardTitle>
            <CardDescription className="text-xl mt-2">
              Thank you for subscribing to our service
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              You now have access to all premium features. Start creating your mood boards!
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              onClick={handleStartCreating}
              disabled={isSettingSubscription}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
            >
              {isSettingSubscription ? 'Setting up...' : 'Start Creating Moodboards'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage; 