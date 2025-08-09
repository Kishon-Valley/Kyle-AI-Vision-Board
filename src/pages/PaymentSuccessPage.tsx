import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

const PaymentSuccessPage = () => {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setError('No session ID found in the URL.');
        return;
      }

      setStatus('verifying');

      try {
        const response = await fetch('/api/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          setStatus('error');
          setError(`Failed to verify payment: ${response.status} ${response.statusText}`);
          return;
        }

        if (response.ok && data.success) {
          // Step 1: Refresh the Supabase session to get the latest user data
          await refreshUser();
          
          // Step 2: Force refresh subscription status by calling the check-subscription API
          if (user?.id) {
            try {
              // Wait a moment for database updates to propagate
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const subResponse = await fetch('/api/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              });
              
              if (subResponse.ok) {
                const subData = await subResponse.json();
                console.log('Subscription status after payment:', subData);
                
                // If subscription is still not active, wait a moment and try again
                if (!subData.hasSubscription) {
                  console.log('Subscription not yet active, waiting and retrying...');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  const retryResponse = await fetch('/api/check-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id }),
                  });
                  
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    console.log('Subscription status after retry:', retryData);
                  }
                }
              }
            } catch (subError) {
              console.warn('Error checking subscription status:', subError);
            }
          }
          
          setStatus('success');
          // Redirect after a short delay to allow the user to see the success message.
          setTimeout(() => {
            navigate('/questionnaire');
          }, 3000);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to verify payment. Please contact support.');
        }
      } catch (err) {
        setStatus('error');
        setError('An unexpected error occurred. Please try again later.');
        console.error('Verification failed:', err);
      }
    };

    verifyPayment();
  }, [location, navigate, refreshUser, user?.id]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
            <CardTitle className="text-2xl">Verifying Payment</CardTitle>
            <CardDescription>Please wait while we confirm your subscription...</CardDescription>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <CardTitle className="text-3xl font-bold">Payment Successful!</CardTitle>
            <CardDescription>Your subscription is active. Redirecting you now...</CardDescription>
            <div className="mt-4 space-y-2">
              <Button 
                onClick={async () => {
                  if (user?.id) {
                    try {
                      const response = await fetch('/api/check-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      const data = await response.json();
                      console.log('Manual subscription check:', data);
                      alert(`Subscription Status: ${data.subscriptionStatus}\nHas Subscription: ${data.hasSubscription}`);
                    } catch (error) {
                      console.error('Manual check failed:', error);
                    }
                  }
                }}
                variant="outline"
                size="sm"
              >
                Debug: Check Subscription Status
              </Button>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <CardTitle className="text-2xl">Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
            <div className="space-y-2">
              <Button onClick={() => navigate('/pricing')}>Go to Pricing</Button>
              {user?.id && (
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/check-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      const data = await response.json();
                      console.log('Debug subscription check:', data);
                      alert(`Subscription Status: ${data.subscriptionStatus}\nHas Subscription: ${data.hasSubscription}`);
                    } catch (error) {
                      console.error('Debug check failed:', error);
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Debug: Check Subscription Status
                </Button>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 p-8">
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;