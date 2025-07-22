
import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getUserMoodBoards } from '../lib/moodboards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Palette, Camera, Sparkles, Loader2, X } from 'lucide-react';

const UserProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    favoriteStyle: ''
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stats for Design Journey section
  const [stats, setStats] = useState({
    moodBoardsCount: 0,
    favoriteStylesCount: 0,
    completedProjectsCount: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  // Function to toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
  };
  
  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setIsLoadingStats(true);
      
      // Fetch mood boards to get count
      const moodBoards = await getUserMoodBoards();
      
      // Count unique styles from mood boards
      const uniqueStyles = new Set(moodBoards.map(board => board.style));
      
      // Count mood boards marked as completed
      const completedProjects = moodBoards.filter(board => board.status === 'completed').length;
      
      setStats({
        moodBoardsCount: moodBoards.length,
        favoriteStylesCount: uniqueStyles.size,
        completedProjectsCount: completedProjects
      });
    } catch (error) {
      console.error('Error fetching user statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  // Fetch user metadata from Supabase
  useEffect(() => {
    const fetchUserMetadata = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('bio, favorite_style, avatar_url')
            .eq('id', user.id)
            .single();
            
          if (data) {
            setFormData({
              name: user.name || '',
              email: user.email || '',
              bio: data.bio || 'Interior design enthusiast who loves creating beautiful spaces',
              favoriteStyle: data.favorite_style || 'Modern Minimalist'
            });
            
            // Set avatar URL if available
            if (data.avatar_url) {
              setAvatarUrl(data.avatar_url);
            }
          } else {
            // If no profile exists yet, set defaults
            setFormData({
              name: user.name || '',
              email: user.email || '',
              bio: 'Interior design enthusiast who loves creating beautiful spaces',
              favoriteStyle: 'Modern Minimalist'
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    
    fetchUserMetadata();
  }, [user]);
  
  // Fetch user statistics
  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Update user metadata in Supabase auth
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.name
        }
      });
      
      if (userUpdateError) throw userUpdateError;
      
      // Update or insert profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          bio: formData.bio,
          favorite_style: formData.favoriteStyle,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        });
      
      if (profileError) throw profileError;
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    
    setIsUploading(true);
    
    try {
      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update local state
      setAvatarUrl(publicUrl);
      
      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been successfully updated."
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile photo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setIsUploading(true);
    
    try {
      // Update profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setAvatarUrl('');
      
      toast({
        title: "Profile Photo Removed",
        description: "Your profile photo has been removed."
      });
    } catch (error: any) {
      console.error('Error removing profile photo:', error);
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove profile photo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="w-6 h-6 text-orange-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                My Profile
              </h1>
            </div>
            <p className="text-slate-600">
              Manage your account and design preferences
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card className="backdrop-blur-md bg-white/30 dark:bg-slate-900/50 border-white/20 dark:border-slate-700/50 shadow-2xl animate-scale-in">
                <CardContent className="p-8 text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={formData.name || 'User'}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-16 h-16 text-white" />
                      )}
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    {/* Hidden file input */}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    <div className="absolute bottom-2 right-1/2 transform translate-x-1/2 translate-y-1/2 flex space-x-2">
                      <button 
                        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Camera className="w-4 h-4 text-slate-600" />
                      </button>
                      
                      {avatarUrl && (
                        <button 
                          className="w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                          onClick={handleRemoveAvatar}
                          disabled={isUploading}
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{formData.name}</h2>
                  <p className="text-slate-600 mb-4">{formData.email}</p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 mb-6">
                    <Palette className="w-4 h-4" />
                    <span>{formData.favoriteStyle}</span>
                  </div>
                  <Button
                    onClick={toggleEditMode}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                    disabled={isSubmitting}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="backdrop-blur-md bg-white/30 dark:bg-slate-900/50 border-white/20 dark:border-slate-700/50 shadow-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-orange-500" />
                    <span className="dark:text-white">Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-200 font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                        className="mt-2 bg-white/50 dark:bg-slate-800/90 border-white/30 dark:border-slate-600 focus:bg-white/70 dark:focus:bg-slate-700 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-200 font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        className="mt-2 bg-white/50 dark:bg-slate-800/90 border-white/30 dark:border-slate-600 focus:bg-white/70 dark:focus:bg-slate-700 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bio" className="text-slate-700 dark:text-slate-200 font-medium">
                      Bio
                    </Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      disabled={!isEditing}
                      className="mt-2 bg-white/50 dark:bg-slate-800/90 border-white/30 dark:border-slate-600 focus:bg-white/70 dark:focus:bg-slate-700 dark:text-white transition-all"
                    />
                  </div>

                  <div>
                    <Label htmlFor="favoriteStyle" className="text-slate-700 dark:text-slate-200 font-medium">
                      Favorite Design Style
                    </Label>
                    <Input
                      id="favoriteStyle"
                      value={formData.favoriteStyle}
                      onChange={(e) => handleInputChange('favoriteStyle', e.target.value)}
                      disabled={!isEditing}
                      className="mt-2 bg-white/50 dark:bg-slate-800/90 border-white/30 dark:border-slate-600 focus:bg-white/70 dark:focus:bg-slate-700 dark:text-white transition-all"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex space-x-4 pt-4">
                      <Button
                        onClick={handleSave}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={toggleEditMode}
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="backdrop-blur-md bg-white/30 dark:bg-slate-900/50 border-white/20 dark:border-slate-700/50 shadow-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="w-5 h-5 text-orange-500" />
                    <span className="dark:text-white">Design Journey</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gradient-to-r from-orange-100/50 to-pink-100/50 dark:from-orange-900/30 dark:to-pink-900/30 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                        {isLoadingStats ? (
                          <span className="inline-block w-6 h-6 animate-pulse">...</span>
                        ) : (
                          stats.moodBoardsCount
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Mood Boards Created</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-pink-100/50 to-purple-100/50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                        {isLoadingStats ? (
                          <span className="inline-block w-6 h-6 animate-pulse">...</span>
                        ) : (
                          stats.favoriteStylesCount
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Favorite Styles</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-purple-100/50 to-orange-100/50 dark:from-purple-900/30 dark:to-orange-900/30 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                        {isLoadingStats ? (
                          <span className="inline-block w-6 h-6 animate-pulse">...</span>
                        ) : (
                          stats.completedProjectsCount
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Projects Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
