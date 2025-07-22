
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Palette, Wand2 } from 'lucide-react';

const LoadingPage = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages = [
    "Analyzing your style preferences...",
    "Generating color combinations...",
    "Selecting furniture pieces...",
    "Creating your mood board...",
    "Adding finishing touches..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(timer);
          // Navigate to result page after a short delay
          setTimeout(() => {
            navigate('/result');
          }, 1000);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(messageTimer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative w-24 h-24 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
              <Palette className="w-12 h-12 text-white" />
            </div>
          </div>
          
          {/* Floating Icons */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <Sparkles className="absolute top-2 left-8 w-6 h-6 text-orange-400 animate-bounce" style={{ animationDelay: '0s' }} />
            <Wand2 className="absolute top-8 right-4 w-5 h-5 text-pink-400 animate-bounce" style={{ animationDelay: '1s' }} />
            <Sparkles className="absolute bottom-4 left-4 w-4 h-4 text-orange-300 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Creating Your Perfect
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">
            Mood Board
          </span>
        </h1>

        {/* Current Message */}
        <p className="text-lg text-slate-600 mb-8 min-h-[2rem] transition-all duration-500">
          {messages[currentMessage]}
        </p>

        {/* Progress Bar */}
        <div className="space-y-4">
          <Progress value={progress} className="h-3 bg-slate-200" />
          <p className="text-sm text-slate-500">
            {Math.round(progress)}% Complete
          </p>
        </div>

        {/* Loading Animation */}
        <div className="mt-12 flex justify-center space-x-2">
          <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Fun Fact */}
        <div className="mt-8 p-4 bg-white/60 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-slate-600 italic">
            "Did you know? Our AI analyzes over 10,000 design elements to create your personalized mood board!"
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
