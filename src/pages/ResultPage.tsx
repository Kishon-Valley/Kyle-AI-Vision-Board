"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Download, Share, Heart, ArrowLeft, Sparkles, RefreshCw } from "lucide-react"
import { saveMoodBoard, type MoodBoard as MoodBoardType } from "../lib/moodboards"
import { generateDesignDescription, generateImagePrompt, generateMoodBoardImage } from "../lib/openai"

// Using the type from moodboards.ts for consistency
type MoodBoard = MoodBoardType & {
  id?: string // Optional for newly created mood boards
}

const ResultPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [isSaved, setIsSaved] = useState(false)
  const [moodBoard, setMoodBoard] = useState<MoodBoard | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const generateMoodBoard = async () => {
      try {
        setIsLoading(true)
        // Get questionnaire data from localStorage
        const questionnaireData = JSON.parse(localStorage.getItem("questionnaireData") || "{}")

        // Check if we have the necessary data
        if (!questionnaireData.roomType || !questionnaireData.designStyle) {
          // If not, use mock data for now
          const mockMoodBoard: MoodBoard = {
            id: `mb_${Date.now()}`,
            image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
            description: `A stunning ${questionnaireData.designStyle || "modern"} ${questionnaireData.roomType || "living room"} featuring ${questionnaireData.colorPalette?.join(", ") || "neutral tones"}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
            style: questionnaireData.designStyle || "modern",
            room_type: questionnaireData.roomType || "living room",
            color_palette: questionnaireData.colorPalette || ["neutral"],
            budget: questionnaireData.budget || "moderate",
          }

          setMoodBoard(mockMoodBoard)
          setIsLoading(false)
          return
        }

        // Check if OpenAI API key is available
        if (!import.meta.env.VITE_OPENAI_API_KEY) {
          toast({
            title: "API Key Missing",
            description: "OpenAI API key is not configured. Using mock data instead.",
            variant: "destructive",
          })

          // Use mock data as fallback
          const mockMoodBoard: MoodBoard = {
            id: `mb_${Date.now()}`,
            image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
            description: `A stunning ${questionnaireData.designStyle} ${questionnaireData.roomType} featuring ${questionnaireData.colorPalette?.join(", ")}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
            style: questionnaireData.designStyle,
            room_type: questionnaireData.roomType,
            color_palette: questionnaireData.colorPalette,
            budget: questionnaireData.budget,
          }

          setMoodBoard(mockMoodBoard)
          setIsLoading(false)
          return
        }

        // Generate real mood board using OpenAI
        setIsGenerating(true)

        let description = ""
        let imageUrl = ""

        try {
          // Step 1: Generate design description
          description = await generateDesignDescription({
            roomType: questionnaireData.roomType,
            designStyle: questionnaireData.designStyle,
            colorPalette: questionnaireData.colorPalette || [],
            budget: questionnaireData.budget,
          })
          toast({
            title: "Design Description Generated",
            description: "Design description successfully generated. Generating image now...",
          })
        } catch (descError) {
          console.error("Error generating design description:", descError)
          toast({
            title: "Design Description Failed",
            description: "Failed to generate design description. Using fallback description.",
            variant: "destructive",
          })
          // Create fallback description if API fails
          description = `A beautiful ${questionnaireData.designStyle} ${questionnaireData.roomType} with ${questionnaireData.colorPalette?.join(", ") || "complementary colors"}. The space features elegant furniture, appropriate lighting, and tasteful decor that aligns with the ${questionnaireData.designStyle} aesthetic while maintaining a ${questionnaireData.budget} budget.`
        }

        try {
          // Step 2: Generate image prompt only if we have a description
          const imagePrompt = await generateImagePrompt(description, {
            roomType: questionnaireData.roomType,
            designStyle: questionnaireData.designStyle,
          })

          // Step 3: Generate mood board image
          imageUrl = await generateMoodBoardImage(imagePrompt)
          toast({
            title: "Image Generated",
            description: "Mood board image successfully generated!",
          })
        } catch (imageError) {
          console.error("Error generating image:", imageError)
          toast({
            title: "Image Generation Failed",
            description: "Failed to generate mood board image. Using fallback image.",
            variant: "destructive",
          })
          // Use a fallback image from Unsplash if API fails
          imageUrl = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1024&h=1024&fit=crop"
        }

        // Create mood board object
        const newMoodBoard: MoodBoard = {
          id: `mb_${Date.now()}`,
          image_url: imageUrl,
          description: description,
          style: questionnaireData.designStyle,
          room_type: questionnaireData.roomType,
          color_palette: questionnaireData.colorPalette,
          budget: questionnaireData.budget,
        }

        setMoodBoard(newMoodBoard)
      } catch (error) {
        console.error("Error generating mood board:", error)
        toast({
          title: "Generation Failed",
          description: "There was an error generating your mood board. Please try again.",
          variant: "destructive",
        })

        // Use mock data as fallback
        const questionnaireData = JSON.parse(localStorage.getItem("questionnaireData") || "{}")
        const mockMoodBoard: MoodBoard = {
          id: `mb_${Date.now()}`,
          image_url: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
          description: `A stunning ${questionnaireData.designStyle || "modern"} ${questionnaireData.roomType || "living room"} featuring ${questionnaireData.colorPalette?.join(", ") || "neutral tones"}. This design combines comfort with style, incorporating carefully selected furniture pieces, lighting, and decor elements that reflect your personal aesthetic preferences.`,
          style: questionnaireData.designStyle || "modern",
          room_type: questionnaireData.roomType || "living room",
          color_palette: questionnaireData.colorPalette || ["neutral"],
          budget: questionnaireData.budget || "moderate",
        }

        setMoodBoard(mockMoodBoard)
      } finally {
        setIsGenerating(false)
        setIsLoading(false)
      }
    }

    generateMoodBoard()
  }, [toast])

  const handleDownload = async () => {
    if (!moodBoard) return

    try {
      // Show loading toast
      toast({
        title: "Preparing Download",
        description: "Your mood board is being prepared for download...",
      })

      // Create a temporary anchor element
      const link = document.createElement("a")

      // Set the download attributes
      const fileName = `${moodBoard.style}-${moodBoard.room_type}-moodboard.jpg`
      link.download = fileName

      // Fetch the image and convert to blob
      const response = await fetch(moodBoard.image_url)
      const blob = await response.blob()

      // Create a blob URL and set it as the href
      const blobUrl = URL.createObjectURL(blob)
      link.href = blobUrl

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

      // Show success toast
      toast({
        title: "Download Complete",
        description: "Your mood board has been downloaded to your device.",
      })
    } catch (error) {
      console.error("Error downloading mood board:", error)
      toast({
        title: "Download Failed",
        description: "There was an error downloading your mood board. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (!moodBoard?.image_url) return

    try {
      // Fetch the image as a blob
      const response = await fetch(moodBoard.image_url)
      const blob = await response.blob()
      const file = new File([blob], "mood-board.jpg", { type: "image/jpeg" })

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share the image file directly if the Web Share API with files is supported
        await navigator.share({
          title: `My ${moodBoard.style} ${moodBoard.room_type} Design`,
          text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Vision Board AI!`,
          files: [file],
        })

        toast({
          title: "Shared Successfully",
          description: "Your mood board image has been shared.",
        })
      } else if (navigator.share) {
        // Fallback: Share the image URL if file sharing isn't supported
        await navigator.share({
          title: `My ${moodBoard.style} ${moodBoard.room_type} Design`,
          text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Vision Board AI!`,
          url: moodBoard.image_url,
        })

        toast({
          title: "Shared Successfully",
          description: "Your mood board has been shared.",
        })
      } else {
        // Fallback for browsers without Web Share API
        navigator.clipboard.writeText(moodBoard.image_url)

        toast({
          title: "Image Link Copied",
          description: "Image link copied to clipboard. You can now paste it anywhere!",
        })
      }
    } catch (error) {
      console.error("Error sharing mood board:", error)
      toast({
        title: "Share Failed",
        description: "There was an error sharing your mood board. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to save mood boards to your history.",
        variant: "destructive",
      })
      return
    }

    if (!moodBoard) return

    try {
      // Save to Supabase
      const savingToast = toast({
        title: "Saving...",
        description: "Saving your mood board to your account.",
      })

      await saveMoodBoard({
        image_url: moodBoard.image_url,
        description: moodBoard.description,
        style: moodBoard.style,
        room_type: moodBoard.room_type,
        color_palette: moodBoard.color_palette,
        budget: moodBoard.budget,
      })

      // Also save to localStorage as a backup
      const savedMoodBoards = JSON.parse(localStorage.getItem("moodboards") || "[]")
      savedMoodBoards.push(moodBoard)
      localStorage.setItem("moodboards", JSON.stringify(savedMoodBoards))

      setIsSaved(true)
      toast({
        title: "Mood Board Saved!",
        description: "Added to your personal history.",
      })
    } catch (error) {
      console.error("Error saving mood board:", error)
      toast({
        title: "Save Failed",
        description: "There was an error saving your mood board. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Function to regenerate the mood board
  const handleRegenerate = () => {
    setIsLoading(true)
    setIsSaved(false)
    // Re-run the useEffect by forcing a component re-render
    setMoodBoard(null)
  }

  if (isLoading || !moodBoard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-t-orange-500 border-b-orange-300 border-l-orange-200 border-r-orange-400 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Creating Your Mood Board</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {isGenerating
            ? "Our AI is crafting a personalized design just for you. This may take a minute..."
            : "Loading your mood board..."}
        </p>
      </div>
    )
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
                src={moodBoard.image_url || "/placeholder.svg"}
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
            <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            <span>{isSaved ? "Saved" : "Save to History"}</span>
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
          <div className="mt-8 bg-white/80 dark:bg-slate-800/80 p-6 rounded-lg shadow-sm backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center">
              <Sparkles className="w-6 h-6 text-orange-500 mr-2" />
              Design Details
            </h3>
            <div className="space-y-6">
              {(() => {
                const description = moodBoard.description

                // Split by common section patterns
                const sections = description.split(/\*\*([^*]+):\*\*|\n\n|\. (?=[A-Z][a-z]+ and [A-Z]|[A-Z][a-z]+:)/)

                // Clean and process sections
                const processedSections = []
                const currentSection = null

                // First, let's extract the overview (first sentence or two)
                const sentences = description.split(/(?<=[.!?])\s+/)
                const overview = sentences.slice(0, 2).join(" ")

                // Then parse the rest for sections
                const sectionMatches = description.match(/\*\*([^*]+):\*\*([^*]+?)(?=\*\*|$)/g)

                if (sectionMatches) {
                  sectionMatches.forEach((match) => {
                    const [, title, content] = match.match(/\*\*([^*]+):\*\*(.+)/)
                    if (title && content) {
                      processedSections.push({
                        title: title.trim(),
                        content: content.trim(),
                      })
                    }
                  })
                }

                // If no sections found, create them manually based on common keywords
                if (processedSections.length === 0) {
                  const keywordSections = [
                    { keywords: ["color", "palette", "tone"], title: "Color Palette" },
                    { keywords: ["wall", "floor"], title: "Walls & Flooring" },
                    { keywords: ["vanity", "sink"], title: "Vanity & Fixtures" },
                    { keywords: ["mirror", "light"], title: "Mirrors & Lighting" },
                    { keywords: ["bathtub", "shower"], title: "Bath & Shower" },
                    { keywords: ["textile", "accessory", "rug"], title: "Textiles & Accessories" },
                    { keywords: ["finishing", "touch", "artwork"], title: "Finishing Touches" },
                  ]

                  const remainingSentences = sentences.slice(2)

                  keywordSections.forEach(({ keywords, title }) => {
                    const matchingSentences = remainingSentences.filter((sentence) =>
                      keywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
                    )

                    if (matchingSentences.length > 0) {
                      processedSections.push({
                        title,
                        content: matchingSentences.join(" "),
                      })
                      // Remove matched sentences from remaining
                      matchingSentences.forEach((sentence) => {
                        const index = remainingSentences.indexOf(sentence)
                        if (index > -1) remainingSentences.splice(index, 1)
                      })
                    }
                  })

                  // Add any remaining sentences as "Additional Details"
                  if (remainingSentences.length > 0) {
                    processedSections.push({
                      title: "Additional Details",
                      content: remainingSentences.join(" "),
                    })
                  }
                }

                return (
                  <>
                    {/* Overview */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg border-l-4 border-orange-500">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Design Overview</h4>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{overview}</p>
                    </div>

                    {/* Sections */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {processedSections.map((section, idx) => (
                        <div
                          key={idx}
                          className="bg-white/60 dark:bg-slate-700/60 p-4 rounded-lg border border-slate-200 dark:border-slate-600"
                        >
                          <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            {section.title}
                          </h4>
                          <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            {/* Split content into bullet points */}
                            {section.content
                              .split(/\.\s+/)
                              .filter(Boolean)
                              .map((point, i) => (
                                <div key={i} className="flex items-start mb-2 last:mb-0">
                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span>
                                    {point.trim()}
                                    {point.endsWith(".") ? "" : "."}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Style Summary */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">Style Summary</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium">
                          {moodBoard.style}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                          {moodBoard.room_type}
                        </span>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                          {moodBoard.budget} budget
                        </span>
                        {moodBoard.color_palette?.map((color, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/questionnaire")}
            className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Create Another</span>
          </Button>

          {isAuthenticated && (
            <Button onClick={() => navigate("/history")} className="bg-orange-500 hover:bg-orange-600 text-white">
              View History
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResultPage
