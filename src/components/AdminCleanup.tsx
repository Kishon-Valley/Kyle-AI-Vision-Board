import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface OrphanedRecords {
  profiles?: number;
  users?: number;
  mood_boards?: number;
  user_preferences?: number | string;
}

const AdminCleanup = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [orphanedRecords, setOrphanedRecords] = useState<OrphanedRecords | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const checkOrphanedRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cleanup-orphaned-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrphanedRecords(data.orphanedRecords);
        setLastAction('check');
        toast({
          title: 'Check Completed',
          description: 'Orphaned records check completed successfully.',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check orphaned records');
      }
    } catch (error) {
      console.error('Error checking orphaned records:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupOrphanedRecords = async () => {
    if (!orphanedRecords) {
      toast({
        title: 'No Data',
        description: 'Please check for orphaned records first.',
        variant: 'destructive',
      });
      return;
    }

    const hasOrphanedRecords = Object.values(orphanedRecords).some(
      count => typeof count === 'number' && count > 0
    );

    if (!hasOrphanedRecords) {
      toast({
        title: 'No Cleanup Needed',
        description: 'No orphaned records found to clean up.',
      });
      return;
    }

    if (!window.confirm('Are you sure you want to clean up all orphaned records? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/cleanup-orphaned-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastAction('cleanup');
        setOrphanedRecords(null);
        toast({
          title: 'Cleanup Completed',
          description: data.message,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup orphaned records');
      }
    } catch (error) {
      console.error('Error cleaning up orphaned records:', error);
      toast({
        title: 'Cleanup Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalOrphanedCount = () => {
    if (!orphanedRecords) return 0;
    
    return Object.values(orphanedRecords).reduce((total, count) => {
      if (typeof count === 'number') {
        return total + count;
      }
      return total;
    }, 0);
  };

  const hasOrphanedRecords = getTotalOrphanedCount() > 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Database Cleanup Utility
        </CardTitle>
        <CardDescription>
          Check and clean up orphaned records that may prevent users from signing up after account deletion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={checkOrphanedRecords}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Orphaned Records
          </Button>
          
          <Button
            onClick={cleanupOrphanedRecords}
            disabled={isLoading || !hasOrphanedRecords}
            variant="destructive"
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Up All
          </Button>
        </div>

        {orphanedRecords && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="font-medium">Total Orphaned Records:</span>
              <span className={`font-bold ${hasOrphanedRecords ? 'text-red-600' : 'text-green-600'}`}>
                {getTotalOrphanedCount()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Profiles</div>
                <div className="text-lg font-semibold">
                  {typeof orphanedRecords.profiles === 'number' ? orphanedRecords.profiles : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Users</div>
                <div className="text-lg font-semibold">
                  {typeof orphanedRecords.users === 'number' ? orphanedRecords.users : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Mood Boards</div>
                <div className="text-lg font-semibold">
                  {typeof orphanedRecords.mood_boards === 'number' ? orphanedRecords.mood_boards : 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">User Preferences</div>
                <div className="text-lg font-semibold">
                  {typeof orphanedRecords.user_preferences === 'number' 
                    ? orphanedRecords.user_preferences 
                    : orphanedRecords.user_preferences === 'table_not_found' 
                      ? 'N/A' 
                      : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {lastAction === 'check' && !hasOrphanedRecords && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200">
              No orphaned records found. Database is clean!
            </span>
          </div>
        )}

        {lastAction === 'cleanup' && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 dark:text-blue-200">
              Cleanup completed successfully. All orphaned records have been removed.
            </span>
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          This utility helps resolve issues where users cannot sign up after deleting their accounts.
          Run the check first to see if cleanup is needed.
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCleanup;
