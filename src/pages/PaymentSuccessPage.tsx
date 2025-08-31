import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error' | 'retrying';

const PaymentSuccessPage = () => {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  const verifyPayment = async (isRetry = false) => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setError('No session ID found in the URL.');
      return;
    }

    if (isRetry) {
      setStatus('retrying');
      setRetryCount(prev => prev + 1);
    } else {
      setStatus('verifying');
    }

    try {
      console.log(`Verifying payment session: ${sessionId} (attempt ${retryCount + 1})`);
      
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
        console.log('Payment verification successful:', data);
        
        // Step 1: Refresh the Supabase session to get the latest user data
        const refreshResult = await refreshUser();
        if (refreshResult.success) {
          console.log('User session refreshed successfully');
        } else {
          console.warn('User session refresh failed:', refreshResult.error);
          // Continue with the flow even if refresh fails, as we can still check subscription
        }
        
        // Step 2: Force refresh subscription status by calling the check-subscription API
        if (user?.id) {
          try {
            console.log('Checking subscription status for user:', user.id);
            
            // Wait a moment for database updates to propagate
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const subResponse = await fetch('/api/check-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            });
            
            if (subResponse.ok) {
              const subData = await subResponse.json();
              console.log('Subscription status after payment:', subData);
              
              if (subData.hasSubscription) {
                        setStatus('success');
        // Redirect after a delay to allow the user to see the success message and prevent flickering
        setTimeout(() => {
          navigate('/questionnaire', { replace: true });
        }, 3000);
                return;
              } else {
                // If subscription is still not active and we haven't retried too many times
                if (retryCount < 2) {
                  console.log(`Subscription not yet active, retrying in 5 seconds... (attempt ${retryCount + 1}/2)`);
                  setTimeout(() => {
                    verifyPayment(true);
                  }, 5000);
                  return;
                } else {
                  console.error('Subscription still not active after multiple retries. This indicates a webhook or database issue.');
                  setError('Payment verified but subscription activation is delayed. Please contact support if this persists.');
                  setStatus('error');
                  return;
                }
              }
            } else {
              console.error('Failed to check subscription status:', subResponse.status, subResponse.statusText);
              if (retryCount < 1) {
                setTimeout(() => {
                  verifyPayment(true);
                }, 5000);
                return;
              }
            }
          } catch (subError) {
            console.warn('Error checking subscription status:', subError);
            if (retryCount < 2) {
              setTimeout(() => {
                verifyPayment(true);
              }, 3000);
              return;
            }
          }
        } else {
          console.error('No user ID available for subscription check');
        }
        
        setStatus('success');
        // Redirect after a delay to allow the user to see the success message and prevent flickering
        setTimeout(() => {
          navigate('/questionnaire', { replace: true });
        }, 3000);
      } else {
        console.error('Payment verification failed:', data);
        setStatus('error');
        setError(data.error || 'Failed to verify payment. Please contact support.');
      }
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred. Please try again later.');
      console.error('Verification failed:', err);
    }
  };

  useEffect(() => {
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
      case 'retrying':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-16 w-16 animate-spin text-orange-500" />
            <CardTitle className="text-2xl">Activating Subscription</CardTitle>
            <CardDescription>Please wait while we activate your subscription... (Attempt {retryCount}/2)</CardDescription>
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
                      alert(`Subscription Status: ${data.subscriptionStatus}\nHas Subscription: ${data.hasSubscription}\nStripe Status: ${data.stripeStatus || 'N/A'}`);
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
              <Button 
                onClick={() => {
                  setRetryCount(0);
                  verifyPayment();
                }}
                variant="outline"
              >
                Retry Verification
              </Button>
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
                      alert(`Subscription Status: ${data.subscriptionStatus}\nHas Subscription: ${data.hasSubscription}\nStripe Status: ${data.stripeStatus || 'N/A'}`);
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