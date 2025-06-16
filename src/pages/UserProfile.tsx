import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, checkUserSubscription } from '../lib/supabase';
import { getUserMoodBoards, deleteAllUserMoodBoards } from '../lib/moodboards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Palette, Camera, Sparkles, Loader2, X, AlertTriangle, Trash2 } from 'lucide-react';

const UserProfile = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [accountType, setAccountType] = useState<'free' | 'premium'>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: '',
    favoriteStyle: ''
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Stats for Design Journey section
  const [stats, setStats] = useState({
    moodBoardsCount: 0,
    favoriteStylesCount: 0,
    completedProjectsCount: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
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

        // Set account type from user metadata
        const status = user.user_metadata?.subscription_status;
        const isPremium = status === 'active' || status === 'trialing';
        setAccountType(isPremium ? 'premium' : 'free');

        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('bio, favorite_style, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            throw profileError;
          }

          if (profileData) {
            setFormData({
              name: user.name || '',
              email: user.email || '',
              bio: profileData.bio || 'Interior design enthusiast who loves creating beautiful spaces',
              favoriteStyle: profileData.favorite_style || 'Modern Minimalist',
            });

            if (profileData.avatar_url) {
              setAvatarUrl(profileData.avatar_url);
            }
          } else {
            // If no profile exists, set defaults
            setFormData({
              name: user.name || '',
              email: user.email || '',
              bio: 'Interior design enthusiast who loves creating beautiful spaces',
              favoriteStyle: 'Modern Minimalist',
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

  // Fetch subscription status from DB to keep account type accurate
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) return;
      try {
        const { hasSubscription, error } = await checkUserSubscription(user.id);
        if (error) {
          console.error('Subscription status error:', error);
        }
        setAccountType(hasSubscription ? 'premium' : 'free');
      } catch (err) {
        console.error('Error fetching subscription status:', err);
      }
    };
    fetchSubscriptionStatus();
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
      
      // Update user's auth metadata first
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (userUpdateError) throw userUpdateError;

      // Upsert profile with new avatar URL to keep it in sync
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });
        
      if (profileError) throw profileError;
      
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

  const handleDeleteAccount = async () => {
    if (!user || !window.confirm('Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    let errorMessage = 'Failed to delete account. Please try again or contact support.';
    
    try {
      // Step 1: Cancel any active subscription first
      if (accountType === 'premium') {
        try {
          const response = await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cancel subscription');
        }
          
        } catch (subError) {
          console.error('Error in subscription cancellation:', subError);
          throw new Error(`Subscription cancellation failed: ${subError instanceof Error ? subError.message : 'Unknown error'}`);
        }
      }

      // Step 2: Delete all user-related data from storage and database tables
      await deleteAllUserMoodBoards(user.id);

      if (avatarUrl) {
        try {
          const avatarPath = avatarUrl.split('/').pop();
          if (avatarPath) {
            const { error: storageError } = await supabase.storage
              .from('profile-images')
              .remove([avatarPath]);
            if (storageError) {
              console.warn('Failed to delete profile image during cleanup:', storageError);
            }
          }
        } catch (storageError) {
          console.warn('Error deleting profile image during cleanup:', storageError);
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.warn('Failed to delete profile data during cleanup:', profileError);
      }

      const { error: userTableError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (userTableError) {
        console.warn('Failed to delete user data from users table during cleanup:', userTableError);
      }

      // Step 3: After cleanup, delete the auth user via the API endpoint
      const deleteUserResponse = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!deleteUserResponse.ok) {
        const errorData = await deleteUserResponse.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      // Step 4: Sign out to clear the session and notify the user
      await supabase.auth.signOut();
      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
      });

      navigate('/', { replace: true });

    } catch (error) {
      console.error('Error deleting account:', error);
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const DeleteAccountConfirmation = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-center mb-2">Delete Your Account</h3>
        <div className="space-y-4 mb-6">
          <p className="text-sm text-slate-700 dark:text-slate-200 text-center">
            This action is permanent and cannot be undone.
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium text-center">
            All your data, including mood boards and preferences, will be permanently removed.
          </p>
          {accountType === 'premium' && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                <AlertTriangle className="inline-block w-4 h-4 mr-1 -mt-1" />
                Important: Your active subscription will be canceled (no refunds will be issued).
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="flex items-center justify-center w-full"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Redirect after hooks are set up to maintain consistent hook order
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/" />;
  }

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
                  {/* Account Type Badge */}
                  <div className="mb-2 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      accountType === 'premium' 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {accountType === 'premium' ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Premium Account
                        </>
                      ) : 'Free Account'}
                    </span>
                  </div>
                  
                  <div className="relative mb-6">
                    <div className={`w-32 h-32 mx-auto ${
                      accountType === 'premium' 
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                        : 'bg-gradient-to-r from-gray-400 to-gray-600'
                    } rounded-full flex items-center justify-center shadow-lg overflow-hidden`}>
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
      
      {/* Delete Account Section */}
      <Card className="mt-8 border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-600 dark:text-red-400">
            Delete Account
          </CardTitle>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            Permanently delete your account and all associated data
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-red-300/90 mb-4">
            This action cannot be undone. All your data, including mood boards, payment records, and preferences, will be permanently removed.
            {accountType === 'premium' && (
              <span className="block mt-2 font-medium text-red-600 dark:text-red-400">
                Note: This will cancel your active subscription. No refunds will be issued.
              </span>
            )}
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account
          </Button>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && <DeleteAccountConfirmation />}
    </div>
  );
};

export default UserProfile;
