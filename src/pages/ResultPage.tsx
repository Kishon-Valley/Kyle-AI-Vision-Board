import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Download, Share, Heart, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { saveMoodBoard, MoodBoard as MoodBoardType } from '../lib/moodboards';
import { generateDesignDescription, generateImagePrompt, generateMoodBoardImage } from '../lib/openai';
import { getColorValue, getTextColor } from '@/lib/colors';

// Using the type from moodboards.ts for consistency
type MoodBoard = MoodBoardType & {
  id?: string; // Optional for newly created mood boards
};

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [moodBoard, setMoodBoard] = useState<MoodBoard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateMoodBoard = async () => {
      try {
        setIsLoading(true);
        // Get questionnaire data from localStorage
        const questionnaireData = JSON.parse(localStorage.getItem('questionnaireData') || '{}');
        
        // Check if we have the necessary data
        if (!questionnaireData.roomType || !questionnaireData.designStyle) {
          // If not, use mock data for now
          const mockMoodBoard: MoodBoard = {
            id: `mb_${Date.now()}`,
            image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
            description: `A stunning ${questionnaireData.designStyle || 'modern'} ${questionnaireData.roomType || 'living room'} featuring ${questionnaireData.colorPalette?.join(', ') || 'neutral tones'}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
            style: questionnaireData.designStyle || 'modern',
            room_type: questionnaireData.roomType || 'living room',
            color_palette: questionnaireData.colorPalette || ['neutral'],
            budget: questionnaireData.budget || 'moderate'
          };
          
          setMoodBoard(mockMoodBoard);
          setIsLoading(false);
          return;
        }
        
        // Check if OpenAI API key is available
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
          toast({
            title: "API Key Missing",
            description: "OpenAI API key is not configured. Using mock data instead.",
            variant: "destructive"
          });
          
          // Use mock data as fallback
          const mockMoodBoard: MoodBoard = {
            id: `mb_${Date.now()}`,
            image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
            description: `A stunning ${questionnaireData.designStyle} ${questionnaireData.roomType} featuring ${questionnaireData.colorPalette?.join(', ')}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
            style: questionnaireData.designStyle,
            room_type: questionnaireData.roomType,
            color_palette: questionnaireData.colorPalette,
            budget: questionnaireData.budget
          };
          
          setMoodBoard(mockMoodBoard);
          setIsLoading(false);
          return;
        }
        
        // Generate real mood board using OpenAI
        setIsGenerating(true);
        
        let description = '';
        let imageUrl = '';
        
        try {
          // Step 1: Generate design description
          description = await generateDesignDescription({
            roomType: questionnaireData.roomType,
            designStyle: questionnaireData.designStyle,
            colorPalette: questionnaireData.colorPalette || [],
            budget: questionnaireData.budget
          });
          toast({
            title: "Design Description Generated",
            description: "Design description successfully generated. Generating image now..."
          });
        } catch (descError) {
          console.error('Error generating design description:', descError);
          toast({
            title: "Design Description Failed",
            description: "Failed to generate design description. Using fallback description.",
            variant: "destructive"
          });
          // Create fallback description if API fails
          description = `A beautiful ${questionnaireData.designStyle} ${questionnaireData.roomType} with ${questionnaireData.colorPalette?.join(', ') || 'complementary colors'}. The space features elegant furniture, appropriate lighting, and tasteful decor that aligns with the ${questionnaireData.designStyle} aesthetic while maintaining a ${questionnaireData.budget} budget.`;
        }
        
        try {
          // Step 2: Generate image prompt only if we have a description
          const imagePrompt = await generateImagePrompt(description, {
            roomType: questionnaireData.roomType,
            designStyle: questionnaireData.designStyle
          });
          
          // Step 3: Generate mood board image
          imageUrl = await generateMoodBoardImage(imagePrompt);
          toast({
            title: "Image Generated",
            description: "Mood board image successfully generated!"
          });
        } catch (imageError) {
          console.error('Error generating image:', imageError);
          toast({
            title: "Image Generation Failed",
            description: "Failed to generate mood board image. Using fallback image.",
            variant: "destructive"
          });
          // Use a fallback image from Unsplash if API fails
          imageUrl = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1024&h=1024&fit=crop";
        }
        
        // Create mood board object
        const newMoodBoard: MoodBoard = {
          id: `mb_${Date.now()}`,
          image_url: imageUrl,
          description: description,
          style: questionnaireData.designStyle,
          room_type: questionnaireData.roomType,
          color_palette: questionnaireData.colorPalette,
          budget: questionnaireData.budget
        };
        
        setMoodBoard(newMoodBoard);
      } catch (error) {
        console.error('Error generating mood board:', error);
        toast({
          title: "Generation Failed",
          description: "There was an error generating your mood board. Please try again.",
          variant: "destructive"
        });
        
        // Use mock data as fallback
        const questionnaireData = JSON.parse(localStorage.getItem('questionnaireData') || '{}');
        const mockMoodBoard: MoodBoard = {
          id: `mb_${Date.now()}`,
          image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
          description: `A stunning ${questionnaireData.designStyle || 'modern'} ${questionnaireData.roomType || 'living room'} featuring ${questionnaireData.colorPalette?.join(', ') || 'neutral tones'}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
          style: questionnaireData.designStyle || 'modern',
          room_type: questionnaireData.roomType || 'living room',
          color_palette: questionnaireData.colorPalette || ['neutral'],
          budget: questionnaireData.budget || 'moderate'
        };
        
        setMoodBoard(mockMoodBoard);
      } finally {
        setIsGenerating(false);
        setIsLoading(false);
      }
    };
    
    generateMoodBoard();
  }, [toast]);

  const handleDownload = async () => {
    if (!moodBoard) return;
    
    try {
      // Show loading toast
      toast({
        title: "Preparing Download",
        description: "Your mood board is being prepared for download...",
      });
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      
      // Set the download attributes
      const fileName = `${moodBoard.style}-${moodBoard.room_type}-moodboard.jpg`;
      link.download = fileName;
      
      // Fetch the image and convert to blob
      const response = await fetch(moodBoard.image_url);
      const blob = await response.blob();
      
      // Create a blob URL and set it as the href
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      // Show success toast
      toast({
        title: "Download Complete",
        description: "Your mood board has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Error downloading mood board:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your mood board. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!moodBoard?.image_url) return;
    
    try {
      // Fetch the image as a blob
      const response = await fetch(moodBoard.image_url);
      const blob = await response.blob();
      const file = new File([blob], 'mood-board.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share the image file directly if the Web Share API with files is supported
        await navigator.share({
          title: `My ${moodBoard.style} ${moodBoard.room_type} Design`,
          text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Vision Board AI!`,
          files: [file],
        });
        
        toast({
          title: "Shared Successfully",
          description: "Your mood board image has been shared.",
        });
      } else if (navigator.share) {
        // Fallback: Share the image URL if file sharing isn't supported
        await navigator.share({
          title: `My ${moodBoard.style} ${moodBoard.room_type} Design`,
          text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Vision Board AI!`,
          url: moodBoard.image_url,
        });
        
        toast({
          title: "Shared Successfully",
          description: "Your mood board has been shared.",
        });
      } else {
        // Fallback for browsers without Web Share API
        navigator.clipboard.writeText(moodBoard.image_url);
        
        toast({
          title: "Image Link Copied",
          description: "Image link copied to clipboard. You can now paste it anywhere!",
        });
      }
    } catch (error) {
      console.error('Error sharing mood board:', error);
      toast({
        title: "Share Failed",
        description: "There was an error sharing your mood board. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to save mood boards to your history.",
        variant: "destructive"
      });
      return;
    }

    if (!moodBoard) return;
    
    try {
      // Save to Supabase
      const savingToast = toast({
        title: "Saving...",
        description: "Saving your mood board to your account.",
      });
      
      await saveMoodBoard({
        image_url: moodBoard.image_url,
        description: moodBoard.description,
        style: moodBoard.style,
        room_type: moodBoard.room_type,
        color_palette: moodBoard.color_palette,
        budget: moodBoard.budget
      });
      
      // Also save to localStorage as a backup
      const savedMoodBoards = JSON.parse(localStorage.getItem('moodboards') || '[]');
      savedMoodBoards.push(moodBoard);
      localStorage.setItem('moodboards', JSON.stringify(savedMoodBoards));
      
      setIsSaved(true);
      toast({
        title: "Mood Board Saved!",
        description: "Added to your personal history.",
      });
    } catch (error) {
      console.error('Error saving mood board:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your mood board. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to regenerate the mood board
  const handleRegenerate = () => {
    setIsLoading(true);
    setIsSaved(false);
    // Re-run the useEffect by forcing a component re-render
    setMoodBoard(null);
  };
  
  if (isLoading || !moodBoard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-t-orange-500 border-b-orange-300 border-l-orange-200 border-r-orange-400 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Creating Your Mood Board</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {isGenerating ? 
            "Our AI is crafting a personalized design just for you. This may take a minute..." : 
            "Loading your mood board..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Your Mood Board</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Crafted specifically for your {moodBoard.style} {moodBoard.room_type}
          </p>
        </div>

        {/* Mood Board Display */}
        <Card className="shadow-2xl mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img 
                src={moodBoard.image_url}
                alt="AI Generated Mood Board"
                className="w-full h-96 lg:h-[500px] object-cover"
              />
              <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Generated</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
          >
            <Share className="w-4 h-4" />
            <span>Share</span>
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaved || !isAuthenticated}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save to History'}</span>
          </Button>
          
          <Button
            onClick={handleRegenerate}
            variant="outline"
            className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </Button>
        </div>

        {/* Design Description */}
        {moodBoard.description && (
          <div className="mt-12 bg-white/90 dark:bg-slate-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-md space-y-8">
            <h3 className="text-3xl font-extrabold mb-8 text-slate-800 dark:text-white flex items-center">
              <Sparkles className="w-7 h-7 text-orange-500 mr-3" />
              Your Design Story
            </h3>
            <div className="space-y-8">
              {(() => {
                const description = moodBoard.description;
                // Detect sections marked with **Title:** style
                const sectionRegex = /\*\*(.+?)\*\*:?/g;
                const matches = [...description.matchAll(sectionRegex)];
                if (matches.length > 0) {
                  const introText = description.slice(0, matches[0].index).trim();
                  const sections = matches.map((match, idx) => {
                    const title = match[1].trim();
                    const start = match.index! + match[0].length;
                    const end = idx < matches.length - 1 ? matches[idx + 1].index! : description.length;
                    const detail = description.slice(start, end).trim();
                    return { title, detail };
                  });
                  return (
                    <div className="space-y-8">
                      {/* Intro */}
                      {introText && (
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-6 leading-relaxed">
                          {introText}
                        </p>
                      )}
                      {/* Sectioned content */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sections.map((sec, i) => {
                          const points = sec.detail
                            .split(/(?<=[.!?])\s+/)
                            .map(p => p.trim())
                            .filter(Boolean);
                          return (
                            <div key={i} className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-col min-h-[160px]">
                              <h4 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4 pb-2 border-b border-orange-100 dark:border-slate-700">
                                {sec.title}
                              </h4>
                              <ul className="space-y-3 pl-1">
                                {points.map((pt, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="flex-shrink-0 w-2 h-2 mt-2.5 mr-3 rounded-full bg-orange-400"></span>
                                    <span className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">{pt}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                // Fallback: previous keyword grouping if no bold markers present
                const sentences = description.split(/(?<=[.!?])\s+/);
                const intro = sentences[0];
                const rest = sentences.slice(1).filter(Boolean);
                const points = rest.map((sentence, idx) => ({
                  text: sentence,
                  title: [
                    { key: 'furniture', label: 'Furniture' },
                    { key: 'color', label: 'Color Palette' },
                    { key: 'lighting', label: 'Lighting' },
                    { key: 'material', label: 'Materials' },
                    { key: 'texture', label: 'Textures' },
                    { key: 'decor', label: 'Decor' },
                    { key: 'budget', label: 'Budget' },
                    { key: 'style', label: 'Style' },
                    { key: 'space', label: 'Space' },
                  ].find(({ key }) => sentence.toLowerCase().includes(key))?.label || ''
                }));
                return (
                  <div className="space-y-8">
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-6 leading-relaxed">
                      {intro}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {points.map((point, idx) => (
                        <div key={idx} className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-col min-h-[120px]">
                          {point.title && (
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                              {point.title}
                            </h4>
                          )}
                          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                            {point.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/questionnaire')}
            className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Create Another</span>
          </Button>
          
          {isAuthenticated && (
            <Button
              onClick={() => navigate('/history')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              View History
            </Button>
          )}
        </div>
      </div>
    </div>
  );
  
};

export default ResultPage;
