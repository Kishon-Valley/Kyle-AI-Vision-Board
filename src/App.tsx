import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
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

const queryClient = new QueryClient();

// Simple test component
const TestPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <h1 className="text-2xl font-bold">Test Page - App is working!</h1>
  </div>
);

const App = () => {
  console.log('App component rendering...');
  
  return (
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
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/test" element={<TestPage />} />
                    <Route path="/questionnaire" element={<QuestionnairePage />} />
                    <Route path="/loading" element={<LoadingPage />} />
                    <Route path="/result" element={<ResultPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/share/:id" element={<SharePage />} />
                    <Route path="/pricing" element={<PaymentPage />} />
                    <Route path="/payment-success" element={<PaymentSuccessPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
