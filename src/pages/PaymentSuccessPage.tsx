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

  const handleStartCreating = () => {
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
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              You now have access to all premium features:
            </p>
            <ul className="space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Create unlimited moodboards</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Access to AI-powered design suggestions</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>High-resolution downloads</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>
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