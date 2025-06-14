import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import LoadingPage from "./pages/LoadingPage";
import ResultPage from "./pages/ResultPage";
import HistoryPage from "./pages/HistoryPage";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import SharePage from "./pages/SharePage";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import { useSubscription } from "./hooks/useSubscription";

const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { hasSubscription, isLoading: isSubLoading } = useSubscription();
  const navigate = useNavigate();
  
  // Show loading state while checking auth and subscription
  if (isAuthLoading || isSubLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-orange-500 border-b-orange-300 border-l-orange-200 border-r-orange-400 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // If not authenticated, show login page
  if (!isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }
  
  // If no subscription, show pricing page
  if (!hasSubscription) {
    navigate('/pricing', { replace: true });
    return null;
  }
  
  return <>{children}</>;
};

// App Routes component to handle loading states
const AppRoutes = () => {
  const { isLoading: isAuthLoading } = useAuth();
  const { isLoading: isSubLoading } = useSubscription();

  if (isAuthLoading || isSubLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-t-orange-500 border-b-orange-300 border-l-orange-200 border-r-orange-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/questionnaire" element={
        <ProtectedRoute>
          <QuestionnairePage />
        </ProtectedRoute>
      } />
      <Route path="/loading" element={<LoadingPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/history" element={
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/share/:id" element={<SharePage />} />
      <Route path="/pricing" element={<PaymentPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
              <Navbar />
              <main className="flex-1">
                <AppRoutes />
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
