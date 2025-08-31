import { useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * Hook for managing image usage data with race condition prevention
 * 
 * Features:
 * - Request cancellation to prevent race conditions
 * - Debouncing to prevent rapid API calls
 * - Memory leak prevention with cleanup
 * - Stale closure prevention with refs
 * - Multiple simultaneous request prevention
 */

export const useImageUsage = () => {
  const { user, isAuthenticated } = useAuth();
  const [imageUsage, setImageUsage] = useState<ImageUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent stale closures and manage request cancellation
  const lastCheckTimeRef = useRef<number>(0);
  const currentRequestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const isCheckingRef = useRef(false); // Prevent multiple simultaneous checks
  const lastUserIdRef = useRef<string | null>(null); // Track last user ID to detect changes

  const checkImageUsage = useCallback(async (forceCheck = false) => {
    if (!user || !isAuthenticated) {
      if (mountedRef.current) {
        setImageUsage(null);
      }
      return;
    }

    // Prevent multiple simultaneous checks
    if (isCheckingRef.current && !forceCheck) {
      return;
    }

    // Prevent rapid API calls - only check if 2 seconds have passed since last check
    const now = Date.now();
    if (!forceCheck && now - lastCheckTimeRef.current < 2000) {
      return;
    }

    // Cancel any ongoing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    isCheckingRef.current = true;

    // Create new abort controller for this request
    currentRequestRef.current = new AbortController();
    const abortController = currentRequestRef.current;

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    lastCheckTimeRef.current = now;

    try {
      const response = await fetch('/api/image-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'check' }),
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (mountedRef.current) {
          setImageUsage(data);
        }
      } else {
        const errorData = await response.json();
        if (mountedRef.current) {
          setError(errorData.error || 'Failed to check image usage');
        }
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      console.error('Error checking image usage:', err);
      if (mountedRef.current) {
        setError('Failed to check image usage');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      // Clear the current request reference if it's still ours
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
      isCheckingRef.current = false;
    }
  }, [user?.id, isAuthenticated]); // Only depend on user.id, not the entire user object

  const incrementImageUsage = useCallback(async () => {
    if (!user || !isAuthenticated) {
      throw new Error('User not authenticated');
    }

    // Cancel any ongoing check request before incrementing
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    try {
      const response = await fetch('/api/image-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'increment' }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state if component is still mounted
        if (mountedRef.current && imageUsage) {
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
  }, [user?.id, isAuthenticated, imageUsage]);

  // Check image usage when user changes or component mounts
  useEffect(() => {
    // Reset state when user changes
    const currentUserId = user?.id;
    if (currentUserId && currentUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentUserId;
      lastCheckTimeRef.current = 0; // Reset debounce timer for new user
      isCheckingRef.current = false; // Reset checking flag
    }

    if (user && isAuthenticated) {
      checkImageUsage();
    } else {
      if (mountedRef.current) {
        setImageUsage(null);
        setError(null);
      }
    }
  }, [user?.id, isAuthenticated, checkImageUsage]);

  // Refresh image usage when subscription status changes
  const refreshImageUsage = useCallback(async () => {
    if (user && isAuthenticated) {
      await checkImageUsage(true); // Force check to bypass debouncing
    }
  }, [checkImageUsage]);

  // Cleanup effect to prevent memory leaks and cancel ongoing requests
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      isCheckingRef.current = false;
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  return {
    imageUsage,
    isLoading,
    error,
    checkImageUsage,
    incrementImageUsage,
    refreshImageUsage,
    canGenerateImage: imageUsage?.canGenerateImage ?? false,
    remainingImages: imageUsage?.remainingImages ?? 0,
    imagesUsed: imageUsage?.imagesUsed ?? 0,
    imagesLimit: imageUsage?.imagesLimit ?? 0,
    subscriptionTier: imageUsage?.subscriptionTier ?? 'free',
  };
};



