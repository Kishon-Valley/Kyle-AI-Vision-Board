import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Calendar, Sun, Moon, Loader2, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, login, signUpWithEmail, loginWithGoogle, logout, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const location = useLocation();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await login(email, password);
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsLoginOpen(false);
        setEmail('');
        setPassword('');
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsLoginOpen(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        toast({
          title: "Sign up successful",
          description: "Please check your email to verify your account",
        });
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      toast({
        title: "Sign up failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login failed:', error);
      toast({
        title: "Google login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="bg-slate-800/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-700/50 dark:border-slate-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-white hover:text-orange-400 transition-colors"
          >
            <img src="/kyle%20logo.jpg" alt="Moodboard Generator Logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-xl font-bold">Moodboard Generator</span>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-orange-400 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" label="Home" currentPath={location.pathname} />
            <NavLink to="/questionnaire" label="Create" currentPath={location.pathname} />
            {isAuthenticated && (
              <NavLink 
                to="/history" 
                label={
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>My Boards</span>
                  </span>
                } 
                currentPath={location.pathname} 
              />
            )}
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="absolute top-16 left-0 right-0 bg-slate-800/95 dark:bg-slate-950/95 backdrop-blur-lg border-b border-slate-700/50 dark:border-slate-800/50 md:hidden z-40">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <MobileNavLink 
                  to="/" 
                  label="Home" 
                  currentPath={location.pathname} 
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink 
                  to="/questionnaire" 
                  label="Create" 
                  currentPath={location.pathname} 
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                {isAuthenticated && (
                  <MobileNavLink 
                    to="/history" 
                    label={
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>My Boards</span>
                      </span>
                    } 
                    currentPath={location.pathname} 
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Theme Toggle and Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-slate-300 hover:text-orange-400 hover:bg-slate-700/50"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link to="/profile" className="flex items-center space-x-2 text-slate-300 hover:text-orange-400 transition-colors">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user?.name || 'User'} 
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-sm">{user?.name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  disabled={isLoading}
                  className="text-slate-300 hover:text-red-400 hover:bg-slate-700/50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white">
                    Login
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Welcome  AI-powered Moodboard Generator</DialogTitle>
                    <DialogDescription>
                      Sign in to save your mood boards and access your history.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Login</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login" className="mt-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing In...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={isSubmitting}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" fill="#4285F4"/>
                        </svg>
                        Google
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="signup" className="mt-4">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            disabled={isSubmitting}
                            required
                          />
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={isSubmitting}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" fill="#4285F4"/>
                        </svg>
                        Google
                      </Button>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Reusable NavLink component for desktop
const NavLink = ({ to, label, currentPath }) => (
  <Link
    to={to}
    className={`transition-colors ${
      currentPath === to 
        ? 'text-orange-400 font-medium' 
        : 'text-slate-300 hover:text-orange-400'
    }`}
  >
    {label}
  </Link>
);

// Mobile NavLink component with different styling
const MobileNavLink = ({ to, label, currentPath, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`block px-3 py-2 rounded-md text-base font-medium ${
      currentPath === to
        ? 'bg-slate-700/50 text-orange-400'
        : 'text-slate-300 hover:bg-slate-700/50 hover:text-orange-400'
    }`}
  >
    {label}
  </Link>
);

export default Navbar;
