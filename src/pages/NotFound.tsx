import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasSubscription } = useSubscription();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // If user has an active subscription and tries to access /create-moodboard,
    // redirect them to the questionnaire page
    if (hasSubscription && location.pathname === '/create-moodboard') {
      navigate('/questionnaire');
    }
  }, [location.pathname, hasSubscription, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-lg shadow-xl max-w-md">
        <h1 className="text-6xl font-bold mb-4 text-orange-500">404</h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-6">Oops! Page not found</p>
        <Button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
