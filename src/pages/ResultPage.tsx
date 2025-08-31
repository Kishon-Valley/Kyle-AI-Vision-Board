import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useImageUsage } from '@/hooks/useImageUsage';
import { Download, Share, Heart, ArrowLeft, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { saveMoodBoard, MoodBoard as MoodBoardType } from '../lib/moodboards';
import { supabase } from '../lib/supabase';
import { generateDesignDescription, generateImagePrompt, generateMoodBoardImage } from '../lib/openai';
import { getColorValue, getTextColor } from '@/lib/colors';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';

// Using the type from moodboards.ts for consistency
type MoodBoard = MoodBoardType & {
  id?: string; // Optional for newly created mood boards
};

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { incrementImageUsage, remainingImages } = useImageUsage();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [moodBoard, setMoodBoard] = useState<MoodBoard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [regenTrigger, setRegenTrigger] = useState(0);

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
        
        // Generate real mood board using OpenAI
        setIsGenerating(true);
        
        let description = '';
        let imageUrl = '';
        
        try {
          // Increment image usage before generating
          await incrementImageUsage();
          
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
        setIsRegenerating(false);
      }
    };
    
    generateMoodBoard();
  }, [toast, regenTrigger]);

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
          text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Mood Board Generator!`,
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
    
    setIsSaving(true);

    try {
      // Save to Supabase
      await saveMoodBoard({
        image_url: moodBoard.image_url,
        description: moodBoard.description,
        style: moodBoard.style,
        room_type: moodBoard.room_type,
        color_palette: moodBoard.color_palette,
        budget: moodBoard.budget
      });
      
      // Also save to localStorage as a backup (avoid duplicates)
      const savedMoodBoards: any[] = JSON.parse(localStorage.getItem('moodboards') || '[]');
      const alreadyLocal = savedMoodBoards.some((b) => b.image_url === moodBoard.image_url);
      if (!alreadyLocal) {
        savedMoodBoards.push(moodBoard);
        localStorage.setItem('moodboards', JSON.stringify(savedMoodBoards));
      }
      
      setIsSaved(true);
      toast({
        title: "✨ Mood Board Saved Successfully!",
        description: "Your new mood board has been saved to your personal history.",
      });
    } catch (error) {
      console.error('Error saving mood board:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your mood board. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to regenerate the mood board
  const handleRegenerate = () => {
    setIsRegenerating(true);
    setIsLoading(true);
    setIsSaved(false);
    setMoodBoard(null);
    // Trigger re-generation
    setRegenTrigger(prev => prev + 1);
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
            disabled={isSaved || !isAuthenticated || isSaving}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save to History'}</span>
              </>
            )}
          </Button>
          
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            variant="outline"
            className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Regenerating...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate</span>
              </>
            )}
          </Button>
        </div>

        {/* Design Description */}
        {moodBoard.description && (
          <div className="mt-12 bg-white/90 dark:bg-slate-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-md space-y-8">
            <h3 className="text-3xl font-extrabold mb-8 text-slate-800 dark:text-white flex items-center">
              {/* Use dynamic accent color */}
              <Sparkles className="w-7 h-7 mr-3" style={{ color: getColorValue((moodBoard.color_palette?.[0] as string) || '#f97316') }} />
              Design Description
            </h3>
            <div className="space-y-8">
              {(() => {
                // List of common section headers to look for
                const sectionHeaders = [
                  'Design Concept',
                  'Color Palette',
                  'Materials',
                  'Furniture Pieces',
                  'Textures',
                  'Decor Elements',
                  'Budget',
                  'Style',
                  'Space',
                  'Layout',
                  'Walls',
                  'Flooring',
                  'Accessories',
                  'Plants',
                  'Windows',
                  'Rugs',
                  'Art',
                  'Storage',
                  'Technology',
                  'Ambiance',
                ];

                // Define colors for different section types
                const sectionColors = {
                  'Design Concept': '#FF6B6B', // Coral Red
                  'Color Palette': '#4ECDC4', // Turquoise
                  'Materials': '#45B7D1', // Sky Blue
                  'Furniture Pieces': '#96CEB4', // Sage Green
                  'Textures': '#FFD93D', // Golden Yellow
                  'Decor Elements': '#FF8B94', // Soft Pink
                  'default': '#f97316' // Default Orange
                };

                // Allow optional numbered prefixes (e.g., "1. Color Palette:")
                const headerRegex = new RegExp(`(?:^|\n|\r)\\s*(?:\\d+\\.\\s*)?((${sectionHeaders.join('|')})\\s*:)`, 'gi');
                
                // Find all matches
                let match;
                let lastIndex = 0;
                const sections = [];
                let foundSection = false;
                
                while ((match = headerRegex.exec(moodBoard.description)) !== null) {
                  foundSection = true;
                  const title = match[1].replace(/:$/, '').trim();
                  const start = match.index + match[0].indexOf(match[1]);
                  
                  if (sections.length > 0) {
                    // Previous section: set its detail
                    sections[sections.length - 1].detail = moodBoard.description.slice(lastIndex, start).trim();
                  } else if (start > 0) {
                    // Intro text before first section
                    sections.push({ title: '', detail: moodBoard.description.slice(0, start).trim() });
                  }
                  
                  // Start new section
                  sections.push({ title, detail: '' });
                  lastIndex = start + match[1].length;
                }
                
                if (foundSection) {
                  // Set detail for last section
                  sections[sections.length - 1].detail = moodBoard.description.slice(lastIndex).trim();
                  
                  // Filter out empty sections
                  const filteredSections = sections.filter(sec => sec.detail && sec.detail.length > 0 || sec.title === '');
                  
                  return (
                    <div className="space-y-8">
                      {/* Intro paragraph if present */}
                      {filteredSections[0].title === '' && filteredSections[0].detail && (
                        <div className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-6 leading-relaxed prose dark:prose-invert max-w-none">
                          <ReactMarkdown>{filteredSections[0].detail}</ReactMarkdown>
                        </div>
                      )}
                      
                      <Accordion type="multiple" className="w-full">
                        {filteredSections.filter(sec => sec.title).map((sec, i) => {
                          const sectionColor = sectionColors[sec.title as keyof typeof sectionColors] || sectionColors.default;
                          
                          return (
                            <AccordionItem key={i} value={`section-${i}`} className="border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
                              <AccordionTrigger
                                className="text-lg font-bold py-4 px-6 hover:no-underline"
                                style={{ 
                                  color: sectionColor,
                                  backgroundColor: `${sectionColor}15`, // 15% opacity background
                                  borderRadius: '0.5rem',
                                  margin: '0.5rem',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold">{sec.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="bg-white/80 dark:bg-slate-800/80 px-6 pb-6">
                                <div className="prose dark:prose-invert max-w-none">
                                  <ReactMarkdown>{sec.detail}</ReactMarkdown>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  );
                }
                
                // If no section headers found, display as a single markdown block
                return (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{moodBoard.description}</ReactMarkdown>
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
