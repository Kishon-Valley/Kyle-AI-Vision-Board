import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set payment status in localStorage
    localStorage.setItem('hasActiveSubscription', 'true');
  }, []);

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
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              You now have full access to create unlimited moodboards with our AI-powered design tools.
            </p>
            <ul className="text-left space-y-2 mb-6">
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Create unlimited moodboards
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Access to AI-powered design suggestions
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                High-resolution downloads
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Priority support
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/create-moodboard')}
              className="w-full max-w-xs"
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