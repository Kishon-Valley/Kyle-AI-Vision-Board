import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { env } from '@/lib/env';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      setError('No session ID found in URL');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`${env.apiUrl}/verify-payment?session_id=${sessionId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
          setStatus('success');
          // Show success toast
          toast({
            title: 'Payment successful!',
            description: 'Your subscription is now active.',
            variant: 'default',
          });
        } else {
          throw new Error(data.message || 'Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        
        toast({
          title: 'Payment verification failed',
          description: 'There was an issue verifying your payment. Please contact support if the problem persists.',
          variant: 'destructive',
        });
      }
    };

    verifyPayment();
  }, [searchParams, toast]);

  const handleBackToApp = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Verifying your payment...</h2>
              <p className="mt-2 text-sm text-gray-600">Please wait while we verify your subscription.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Thank you for subscribing to Vision Board AI. Your subscription is now active.
              </p>
              <div className="mt-6">
                <Button onClick={handleBackToApp}>
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" aria-hidden="true" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Payment Verification Failed</h2>
              <p className="mt-2 text-sm text-gray-600">
                {error || 'There was an issue verifying your payment.'}
              </p>
              <div className="mt-6 space-x-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button onClick={() => navigate('/pricing')}>
                  Back to Pricing
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
