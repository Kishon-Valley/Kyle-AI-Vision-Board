import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Download, Share, Trash2, Plus, Calendar, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { getUserMoodBoards, deleteMoodBoard, updateMoodBoardStatus, MoodBoard as MoodBoardType } from '../lib/moodboards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Using the type from moodboards.ts for consistency
type MoodBoard = MoodBoardType & {
  // Additional client-side properties if needed
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasSubscription, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication and subscription status
  useEffect(() => {
    if (authLoading || subLoading) {
      // Wait until both auth and subscription status have finished loading
      return;
    }
    
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view your mood board history.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    if (!hasSubscription) {
      toast({
        title: 'Subscription Required',
        description: 'Please subscribe to access your mood board history.',
        variant: 'destructive'
      });
      navigate('/pricing');
      return;
    }
  }, [isAuthenticated, hasSubscription, authLoading, subLoading, navigate, toast]);

  const fetchMoodBoards = async () => {
    if (!isAuthenticated || !hasSubscription) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch mood boards from Supabase
      const boards = await getUserMoodBoards();
      setMoodBoards(boards);
      
      // Also check localStorage as a fallback
      const localBoards = JSON.parse(localStorage.getItem('moodboards') || '[]');
      
      // If there are boards in localStorage that aren't in Supabase yet,
      // we could handle that here (optional future enhancement)
    } catch (err) {
      console.error('Error fetching mood boards:', err);
      setError('Failed to load your mood boards. Please try again.');
      
      // Fallback to localStorage if Supabase fetch fails
      const localBoards = JSON.parse(localStorage.getItem('moodboards') || '[]');
      if (localBoards.length > 0) {
        setMoodBoards(localBoards);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && hasSubscription) {
      fetchMoodBoards();
    }
  }, [isAuthenticated, hasSubscription]);

  const handleDownload = async (moodBoard: MoodBoard) => {
    try {
      // Show loading toast
      toast({
        title: "Preparing Download",
        description: `Preparing your ${moodBoard.style} mood board for download...`,
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

  const handleShare = async (moodBoard: MoodBoard) => {
    try {
      const shareUrl = moodBoard.id ? `${window.location.origin}/share/${moodBoard.id}` : window.location.origin;
      if (navigator.share) {
        // Create personalized share content
        await navigator.share({
                     title: `My ${moodBoard.style} ${moodBoard.room_type} Design by Mood Board Generator`,
           text: `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Mood Board Generator!`,
          url: shareUrl,
        });
        
        toast({
          title: "Shared Successfully",
          description: "Your mood board has been shared.",
        });
      } else {
        // Fallback for browsers without Web Share API
                 const shareText = `Check out this ${moodBoard.style} ${moodBoard.room_type} design I created with Mood Board Generator! ${shareUrl}`;
        navigator.clipboard.writeText(shareText);
        
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard. Paste it in your favorite social media app!",
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

  const handleDelete = async (id: string) => {
    try {
      // Show deleting toast
      toast({
        title: "Deleting...",
        description: "Removing mood board from your history.",
      });
      
      // Delete from Supabase
      await deleteMoodBoard(id);
      
      // Update local state
      const updatedMoodBoards = moodBoards.filter(mb => mb.id !== id);
      setMoodBoards(updatedMoodBoards);
      
      // Also update localStorage for backup
      localStorage.setItem('moodboards', JSON.stringify(updatedMoodBoards));
      
      toast({
        title: "Mood Board Deleted",
        description: "The mood board has been removed from your history.",
      });
    } catch (error) {
      console.error('Error deleting mood board:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your mood board. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleStatusChange = async (id: string, status: 'in_progress' | 'completed' | 'archived') => {
    try {
      // Show updating toast
      toast({
        title: "Updating Status",
        description: `Changing project status to ${status.replace('_', ' ')}...`,
      });
      
      // Update in Supabase
      const updatedMoodBoard = await updateMoodBoardStatus(id, status);
      
      // Update local state
      const updatedMoodBoards = moodBoards.map(mb => 
        mb.id === id ? { ...mb, status: updatedMoodBoard.status } : mb
      );
      setMoodBoards(updatedMoodBoards);
      
      // Also update localStorage for backup
      localStorage.setItem('moodboards', JSON.stringify(updatedMoodBoards));
      
      toast({
        title: "Status Updated",
        description: `Project status changed to ${status.replace('_', ' ')}.`,
      });
    } catch (error) {
      console.error('Error updating mood board status:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the project status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Login Required</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            Please log in to view your saved mood boards.
          </p>
          <Link to="/">
            <Button className="bg-orange-500 hover:bg-orange-600">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
            My Boards
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            All your saved AI-generated interior design inspirations
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Link to="/questionnaire">
              <Button className="bg-orange-500 hover:bg-orange-600 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create New Mood Board</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={fetchMoodBoards}
              disabled={isLoading}
              className="flex items-center space-x-2 dark:border-slate-600 dark:text-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Mood Boards Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 border-4 border-t-orange-500 border-b-orange-300 border-l-orange-200 border-r-orange-400 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Loading Your Mood Boards</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Fetching your saved designs...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Error Loading Mood Boards</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {error}
            </p>
            <Button 
              onClick={fetchMoodBoards}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Try Again
            </Button>
          </div>
        ) : moodBoards.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No Saved Mood Boards</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Your saved mood boards will appear here. Try creating your first one!
            </p>
            <Link to="/questionnaire">
              <Button variant="outline" className="dark:border-slate-600 dark:text-slate-200">
                Create Your First Mood Board
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {moodBoards.map((moodBoard) => (
              <Card key={moodBoard.id} className="overflow-hidden transition-all duration-300 hover:shadow-xl bg-white dark:bg-slate-800 dark:border-slate-700/50">
                <CardContent className="p-0">
                  <div className="relative">
                    <img 
                      src={moodBoard.image_url}
                      alt={`${moodBoard.style} Mood Board`}
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white/80 hover:bg-white border text-slate-600 hover:text-red-600 shadow-lg dark:bg-slate-800/80 dark:hover:bg-slate-700"
                        onClick={() => handleDelete(moodBoard.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white capitalize">
                          {moodBoard.style} {moodBoard.room_type}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(moodBoard.created_at || new Date().toISOString())}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${moodBoard.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : moodBoard.status === 'archived' 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {moodBoard.status === 'in_progress' ? 'In Progress' : 
                         moodBoard.status === 'completed' ? 'Completed' : 
                         moodBoard.status === 'archived' ? 'Archived' : 'In Progress'}
                      </div>
                    </div>
                    
                    {/* Status Dropdown */}
                    <div className="mb-3">
                      <Select
                        defaultValue={moodBoard.status || 'in_progress'}
                        onValueChange={(value) => handleStatusChange(moodBoard.id!, value as 'in_progress' | 'completed' | 'archived')}
                      >
                        <SelectTrigger className="w-full h-8 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <SelectValue placeholder="Set project status" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          <SelectItem value="in_progress" className="dark:text-white">In Progress</SelectItem>
                          <SelectItem value="completed" className="dark:text-white">Completed</SelectItem>
                          <SelectItem value="archived" className="dark:text-white">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 dark:border-slate-600 dark:text-slate-200"
                        onClick={() => handleDownload(moodBoard)}
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 dark:border-slate-600 dark:text-slate-200"
                        onClick={() => handleShare(moodBoard)}
                      >
                        <Share className="w-3 h-3" />
                        <span>Share</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
