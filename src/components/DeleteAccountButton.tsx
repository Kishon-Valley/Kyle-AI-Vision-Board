import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: localStorage.getItem('userId')
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();

      // Sign out the user
      await signOut();

      // Show success message
      toast.success('Account deleted successfully');

      // Redirect to home page
      navigate('/', { replace: true });
      
      // Force a full page reload to clear all state
      window.location.reload();

    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={isDeleting}
      variant="destructive"
      className="w-full"
    >
      {isDeleting ? 'Deleting...' : 'Delete Account'}
    </Button>
  );
} 