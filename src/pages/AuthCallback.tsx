import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { checkUserSubscription } from '@/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 AuthCallback: Starting OAuth callback handling...');
        console.log('🔐 AuthCallback: Current URL:', window.location.href);
        console.log('🔐 AuthCallback: Location search:', location.search);
        console.log('🔐 AuthCallback: Location hash:', location.hash);
        
        setIsProcessing(true);
        setError(null);

        // Get the current session to check if auth was successful
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔐 AuthCallback: Session check result:', { session: !!session, error: sessionError });
        
        if (sessionError) {
          console.error('❌ AuthCallback: Error during auth callback:', sessionError);
          setError('Authentication failed. Please try again.');
          return;
        }
        
        if (session?.user) {
          // Successfully authenticated
          console.log('✅ AuthCallback: OAuth authentication successful for user:', session.user.email);
          console.log('✅ AuthCallback: User ID:', session.user.id);
          
          // Refresh user data in context
          console.log('🔄 AuthCallback: Refreshing user data...');
          await refreshUser();
          console.log('✅ AuthCallback: User data refreshed');
          
          // Check subscription status directly
          try {
            console.log('🔍 AuthCallback: Checking subscription status...');
            const { hasSubscription, error: subError } = await checkUserSubscription(session.user.id);
            
            console.log('🔍 AuthCallback: Subscription check result:', { hasSubscription, error: subError });
            
            if (subError) {
              console.warn('⚠️ AuthCallback: Error checking subscription, defaulting to no subscription:', subError);
            }
            
            // Determine where to redirect based on subscription status
            if (hasSubscription) {
              console.log('🎯 AuthCallback: User has subscription, redirecting to questionnaire');
              navigate('/questionnaire', { replace: true });
            } else {
              console.log('🎯 AuthCallback: User does not have subscription, redirecting to pricing');
              navigate('/pricing', { replace: true });
            }
          } catch (subCheckError) {
            console.error('❌ AuthCallback: Error checking subscription status:', subCheckError);
            // Default to pricing page if subscription check fails
            console.log('🎯 AuthCallback: Defaulting to pricing page due to subscription check error');
            navigate('/pricing', { replace: true });
          }
        } else {
          // No session found, check if there's an error in the URL
          console.log('❌ AuthCallback: No session found, checking for OAuth errors...');
          const urlParams = new URLSearchParams(location.search);
          const errorParam = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          
          console.log('🔍 AuthCallback: URL params:', { errorParam, errorDescription });
          
          if (errorParam) {
            console.error('❌ AuthCallback: OAuth error:', errorParam, errorDescription);
            setError(errorDescription || 'Authentication was cancelled or failed.');
          } else {
            setError('Authentication failed. Please try again.');
          }
        }
      } catch (err) {
        console.error('❌ AuthCallback: Unexpected error during auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, location, refreshUser]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Failed</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          {isProcessing ? 'Completing Login...' : 'Setting up your account...'}
        </h2>
        <p className="text-slate-600">
          {isProcessing 
            ? 'Please wait while we complete your authentication.' 
            : 'Just a moment while we prepare your experience...'
          }
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
