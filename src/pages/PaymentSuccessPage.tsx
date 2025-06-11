import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { hasSubscription } = useSubscription();

  useEffect(() => {
    // Set payment status in localStorage
    localStorage.setItem('hasActiveSubscription', 'true');
  }, []);

  const handleStartCreating = () => {
    // Ensure subscription is set before navigating
    localStorage.setItem('hasActiveSubscription', 'true');
    navigate('/questionnaire');
  };

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
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
            >
              Start Creating Moodboards
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage; 