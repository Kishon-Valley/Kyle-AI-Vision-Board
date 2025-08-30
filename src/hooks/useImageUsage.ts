import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ImageUsageData {
  subscriptionTier: string;
  subscriptionStatus: string;
  imagesUsed: number;
  imagesLimit: number;
  remainingImages: number;
  canGenerateImage: boolean;
  isNewMonth: boolean;
}

export const useImageUsage = () => {
  const { user, isAuthenticated } = useAuth();
  const [imageUsage, setImageUsage] = useState<ImageUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkImageUsage = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setImageUsage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/image-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'check' }),
      });

      if (response.ok) {
        const data = await response.json();
        setImageUsage(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to check image usage');
      }
    } catch (err) {
      console.error('Error checking image usage:', err);
      setError('Failed to check image usage');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  const incrementImageUsage = useCallback(async () => {
    if (!user || !isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch('/api/image-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'increment' }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        if (imageUsage) {
          setImageUsage({
            ...imageUsage,
            imagesUsed: data.imagesUsed,
            remainingImages: data.remainingImages,
          });
        }
        return data;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to increment image usage');
      }
    } catch (err) {
      console.error('Error incrementing image usage:', err);
      throw err;
    }
  }, [user, isAuthenticated, imageUsage]);

  // Check image usage when user changes or component mounts
  useEffect(() => {
    checkImageUsage();
  }, [checkImageUsage]);

  return {
    imageUsage,
    isLoading,
    error,
    checkImageUsage,
    incrementImageUsage,
    canGenerateImage: imageUsage?.canGenerateImage ?? false,
    remainingImages: imageUsage?.remainingImages ?? 0,
    imagesUsed: imageUsage?.imagesUsed ?? 0,
    imagesLimit: imageUsage?.imagesLimit ?? 0,
    subscriptionTier: imageUsage?.subscriptionTier ?? 'free',
  };
};



