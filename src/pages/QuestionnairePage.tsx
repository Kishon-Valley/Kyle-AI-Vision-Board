import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useImageUsage } from '@/hooks/useImageUsage';

interface FormData {
  roomType: string;
  designStyle: string;
  colorPalette: string[];
  budget: string;
}

const QuestionnairePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { hasSubscription, isLoading: isSubLoading, checkSubscription } = useSubscription();
  const { canGenerateImage, remainingImages, imagesLimit, isLoading: isImageLoading } = useImageUsage();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [hasShownError, setHasShownError] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    roomType: '',
    designStyle: '',
    colorPalette: [],
    budget: ''
  });

  // Check authentication, subscription status, and image usage
  useEffect(() => {
    // Don't redirect while loading
    if (isSubLoading || isImageLoading) {
      return;
    }

    // Check authentication first
    if (!isAuthenticated && !hasShownError) {
      setHasShownError(true);
      toast({
        title: 'Sign Up Required',
        description: 'Please sign up or log in to create a mood board.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    // Check subscription status
    if (!hasSubscription && !hasShownError) {
      setHasShownError(true);
      toast({
        title: 'Subscription Required',
        description: 'Please subscribe to create a mood board.',
        variant: 'destructive'
      });
      navigate('/pricing');
      return;
    }

    // Only check image usage if user has a subscription and we have valid data
    if (hasSubscription && imagesLimit > 0 && !canGenerateImage && !hasShownError) {
      setHasShownError(true);
      toast({
        title: 'Image Limit Reached',
        description: `You've used all ${imagesLimit} images for this month. Upgrade your plan for more images.`,
        variant: 'destructive'
      });
      navigate('/pricing');
      return;
    }

    // If user has subscription but imagesLimit is 0, it might be a data sync issue
    // Don't redirect in this case, let the user proceed
    // Reset error flag if everything is good
    if (hasSubscription && canGenerateImage) {
      setHasShownError(false);
    }
  }, [isAuthenticated, hasSubscription, canGenerateImage, isSubLoading, isImageLoading, imagesLimit, navigate, toast, hasShownError]);

  // Reset error flag when user changes
  useEffect(() => {
    setHasShownError(false);
  }, [user?.id]);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!checkSubscription()) {
      return;
    }
    // Store form data and navigate to loading page
    localStorage.setItem('questionnaireData', JSON.stringify(formData));
    navigate('/loading');
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleColorPaletteChange = (color: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      colorPalette: checked 
        ? [...prev.colorPalette, color]
        : prev.colorPalette.filter(c => c !== color)
    }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.roomType !== '';
      case 2:
        return formData.designStyle !== '';
      case 3:
        return formData.colorPalette.length > 0;
      case 4:
        return formData.budget !== '';
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                <Home className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                What room are you designing?
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Tell us which space you'd like to transform
              </p>
            </div>
            <Select value={formData.roomType} onValueChange={(value) => updateFormData('roomType', value)}>
              <SelectTrigger className="w-full bg-white/50 dark:bg-slate-800/70 backdrop-blur-sm border-white/30 dark:border-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-700/70 transition-all text-slate-900 dark:text-slate-200">
                <SelectValue placeholder="Select a room type" className="text-slate-500 dark:text-slate-400" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="living-room">Living Room</SelectItem>
                <SelectItem value="bedroom">Bedroom</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="bathroom">Bathroom</SelectItem>
                <SelectItem value="home-office">Home Office</SelectItem>
                <SelectItem value="dining-room">Dining Room</SelectItem>
                <SelectItem value="entryway">Entryway</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                What's your design style?
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Choose the aesthetic that speaks to you
              </p>
            </div>
            <RadioGroup 
              value={formData.designStyle} 
              onValueChange={(value) => updateFormData('designStyle', value)}
              className="space-y-3"
            >
              {[
                { value: 'modern', label: 'Modern Minimalist', desc: 'Clean lines, neutral colors, minimal decor', gradient: 'from-gray-400 to-slate-400' },
                { value: 'bohemian', label: 'Bohemian', desc: 'Eclectic, colorful, layered textures', gradient: 'from-orange-400 to-red-400' },
                { value: 'industrial', label: 'Industrial', desc: 'Raw materials, exposed elements, urban feel', gradient: 'from-gray-600 to-slate-600' },
                { value: 'scandinavian', label: 'Scandinavian', desc: 'Light woods, cozy textures, functional design', gradient: 'from-blue-300 to-cyan-300' },
                { value: 'traditional', label: 'Traditional', desc: 'Classic furniture, rich colors, elegant details', gradient: 'from-amber-500 to-yellow-500' },
                { value: 'contemporary', label: 'Contemporary', desc: 'Current trends, mixed materials, bold accents', gradient: 'from-purple-400 to-pink-400' }
              ].map((style) => (
                <div key={style.value} className="flex items-start space-x-3 p-4 bg-white/30 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-600/50 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/90 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
                  <RadioGroupItem value={style.value} id={style.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${style.gradient}`}></div>
                      <Label htmlFor={style.value} className="text-base font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                        {style.label}
                      </Label>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{style.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                <div className="w-8 h-8 bg-white rounded-full"></div>
              </div>
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                What colors do you love?
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Select all color palettes that appeal to you
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { value: 'neutrals', label: 'Neutrals', colors: ['bg-gray-300', 'bg-stone-300', 'bg-slate-300'] },
                { value: 'earth-tones', label: 'Earth Tones', colors: ['bg-amber-400', 'bg-orange-300', 'bg-yellow-300'] },
                { value: 'cool-blues', label: 'Cool Blues', colors: ['bg-blue-400', 'bg-cyan-300', 'bg-teal-300'] },
                { value: 'warm-colors', label: 'Warm Colors', colors: ['bg-red-400', 'bg-pink-300', 'bg-rose-300'] },
                { value: 'greens', label: 'Nature Greens', colors: ['bg-green-400', 'bg-emerald-300', 'bg-lime-300'] },
                { value: 'monochrome', label: 'Monochrome', colors: ['bg-black', 'bg-gray-400', 'bg-white'] }
              ].map((palette) => (
                <div 
                  key={palette.value}
                  className="flex items-center space-x-3 p-4 bg-white/30 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  <Checkbox
                    id={palette.value}
                    checked={formData.colorPalette.includes(palette.value)}
                    onCheckedChange={(checked) => handleColorPaletteChange(palette.value, checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={palette.value} className="text-base font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                      {palette.label}
                    </Label>
                    <div className="flex space-x-1 mt-2">
                      {palette.colors.map((color, index) => (
                        <div key={index} className={`w-6 h-6 rounded-full ${color} border-2 border-white shadow-sm animate-bounce`} style={{ animationDelay: `${index * 0.1}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <h3 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              What finish level feels right to you?
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                This helps us suggest appropriate furniture and decor
              </p>
            </div>
            <RadioGroup 
              value={formData.budget} 
              onValueChange={(value) => updateFormData('budget', value)}
              className="space-y-3"
            >
              {[
                { value: 'budget', label: 'Budget-Friendly', desc: 'Under 2,000', gradient: 'from-green-400 to-emerald-400' },
                { value: 'moderate', label: 'Moderate', desc: '2,000 - 5,000', gradient: 'from-yellow-400 to-orange-400' },
                { value: 'comfortable', label: 'Comfortable', desc: '5,000 - 10,000', gradient: 'from-orange-400 to-red-400' },
                { value: 'luxury', label: 'Luxury', desc: '10,000+', gradient: 'from-purple-400 to-pink-400' }
              ].map((budget) => (
                <div key={budget.value} className="flex items-start space-x-3 p-4 bg-white/30 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-600/50 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/90 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
                  <RadioGroupItem value={budget.value} id={budget.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${budget.gradient}`}></div>
                      <Label htmlFor={budget.value} className="text-base font-medium cursor-pointer text-slate-800 dark:text-slate-200">
                        {budget.label}
                      </Label>
                    </div>
                    {/* Price description removed as per new requirements */}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepBackgroundClass = () => {
    switch (currentStep) {
      case 1:
        return 'from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950 dark:via-cyan-950 dark:to-teal-950';
      case 2:
        return 'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950';
      case 3:
        return 'from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950';
      case 4:
        return 'from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950';
      default:
        return 'from-orange-50 via-pink-50 to-purple-50 dark:from-orange-950 dark:via-pink-950 dark:to-purple-950';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getStepBackgroundClass()} dark:opacity-50 transition-all duration-1000`}>
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300/20 dark:bg-orange-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-300/20 dark:bg-pink-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-300/20 dark:bg-purple-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-10 right-1/3 w-60 h-60 bg-blue-300/20 dark:bg-blue-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Home className="w-6 h-6 text-orange-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                Design Questionnaire
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Usage Indicator */}
          <div className="mb-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Images remaining this month:
              </span>
              {isImageLoading ? (
                <span className="text-slate-500 dark:text-slate-400">
                  Loading...
                </span>
              ) : (
                <span className={`font-medium ${remainingImages > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {remainingImages} / {imagesLimit}
                </span>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Progress value={progress} className="h-3 bg-white/30 backdrop-blur-sm" />
          </div>

          {/* Form Card */}
          <Card className="shadow-2xl backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border-white/30 dark:border-slate-700/30 animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="text-center text-slate-600 dark:text-slate-300 text-sm font-medium">
                Question {currentStep} of {totalSteps}
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[400px] p-8">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <span>{currentStep === totalSteps ? 'Create Mood Board' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnairePage;
