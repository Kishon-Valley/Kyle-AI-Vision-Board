import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      // Get the hash fragment from the URL
      const hashFragment = window.location.hash;
      
      // Process the hash fragment to extract the access token
      if (hashFragment) {
        // The hash will be processed automatically by Supabase client
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error);
          navigate('/');
          return;
        }
        
        if (data?.session) {
          // Successfully authenticated
          navigate('/');
        }
      } else {
        // No hash fragment, redirect to home
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
