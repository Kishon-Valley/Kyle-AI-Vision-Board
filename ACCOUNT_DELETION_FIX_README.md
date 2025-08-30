# Account Deletion Fix for Google OAuth Users

## Problem Description

When a user signs in with Google OAuth and then deletes their account on the profile page, they encounter an "Authentication Failed" error when trying to sign up again. This happens because:

1. **Foreign Key Constraint Issues**: The database tables have foreign key references to `auth.users(id)` without proper CASCADE DELETE
2. **Incomplete Cleanup**: When account deletion fails due to constraints, orphaned records remain in the database
3. **Google OAuth State Conflicts**: The Google OAuth provider may have cached information about the deleted user

## Root Cause Analysis

### Database Schema Issues
- `profiles` table: `id UUID REFERENCES auth.users(id)` - No CASCADE
- `users` table: `id UUID REFERENCES auth.users(id)` - No CASCADE  
- `mood_boards` table: `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` - Has CASCADE

### Deletion Process Problems
1. **Wrong Order**: Trying to delete from `users` and `profiles` before deleting the auth user
2. **Constraint Violations**: Foreign key constraints prevent deletion when auth user still exists
3. **Partial Cleanup**: Some tables get cleaned up while others fail, leaving orphaned records

## Complete Solution

### 1. Database Schema Fixes

Run the SQL migration script to fix foreign key constraints:

```sql
-- Execute: Supabase/supabase_fix_account_deletion.sql
```

This script:
- Drops existing foreign key constraints without CASCADE
- Recreates them with `ON DELETE CASCADE`
- Creates cleanup functions and triggers
- Adds performance indexes

### 2. API Endpoint Improvements

The `api/delete-account.js` has been enhanced with:
- **Proper deletion order**: Children tables first, then parent tables
- **Error handling**: Continues cleanup even if some operations fail
- **Retry mechanism**: Attempts auth user deletion again after cleanup
- **Verification**: Checks if cleanup was successful
- **Storage cleanup**: Removes both user uploads and profile images
- **Consolidated cleanup operations**: Includes orphaned record checking and cleanup (stays within 12-function limit)

### 3. Frontend Component Updates

The `UserProfile.tsx` component now:
- Uses the improved delete-account API
- Removes manual table deletion logic
- Provides better error messages
- Ensures proper session cleanup

### 4. Admin Cleanup Utility

New components for database maintenance:

- **`AdminCleanup.tsx`**: React component for admin use to manage database cleanup
- **Consolidated API**: Uses the same `delete-account` endpoint for both deletion and cleanup operations

## Implementation Steps

### Step 1: Apply Database Fixes
```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f Supabase/supabase_fix_account_deletion.sql
```

### Step 2: Deploy Updated API Endpoints
- Update `api/delete-account.js` (now includes cleanup functionality)

### Step 3: Update Frontend Components
- Update `src/pages/UserProfile.tsx`
- Deploy `src/components/AdminCleanup.tsx` (optional, for admin use)

### Step 4: Test the Fix
1. Create a test user with Google OAuth
2. Delete the account
3. Try to sign up again with the same Google account
4. Verify no errors occur

## Testing the Solution

### Manual Testing
1. **Account Creation**: Sign up with Google OAuth
2. **Account Deletion**: Delete account from profile page
3. **Re-registration**: Try to sign up again with same Google account
4. **Verification**: Ensure successful registration

### Database Verification
Use the admin cleanup utility to check for orphaned records:

```javascript
// Check for orphaned records
fetch('/api/delete-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'check' })
});

// Clean up if needed
fetch('/api/delete-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'cleanup' })
});
```

## Prevention Measures

### 1. Database Constraints
- All foreign key references to `auth.users(id)` now have `ON DELETE CASCADE`
- Automatic cleanup when auth user is deleted

### 2. Cleanup Triggers
- Database triggers automatically clean up orphaned records
- Prevents accumulation of invalid data

### 3. API Robustness
- Improved error handling in deletion process
- Retry mechanisms for failed operations
- Comprehensive cleanup verification

## Monitoring and Maintenance

### Regular Checks
- Monitor for orphaned records using the cleanup utility
- Check database logs for deletion errors
- Verify foreign key constraints are properly maintained

### Performance Considerations
- Indexes added for faster deletion operations
- Batch operations for large cleanup tasks
- Efficient foreign key constraint handling

## Troubleshooting

### Common Issues

1. **"Foreign key constraint violation"**
   - Run the database migration script
   - Check if all tables have proper CASCADE constraints

2. **"User already exists" errors**
   - Use the cleanup utility to remove orphaned records
   - Verify auth user was properly deleted

3. **Partial cleanup failures**
   - Check database logs for specific error messages
   - Use the cleanup utility to manually clean remaining records

### Debug Commands

```sql
-- Check for orphaned records
SELECT * FROM public.profiles p LEFT JOIN auth.users a ON p.id = a.id WHERE a.id IS NULL;
SELECT * FROM public.users u LEFT JOIN auth.users a ON u.id = a.id WHERE a.id IS NULL;
SELECT * FROM public.mood_boards mb LEFT JOIN auth.users a ON mb.user_id = a.id WHERE a.id IS NULL;

-- Verify foreign key constraints
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('profiles', 'users', 'mood_boards');
```

## Security Considerations

- **Service Role Access**: Cleanup functions require service role permissions
- **Admin Only**: Cleanup utility should only be accessible to administrators
- **Audit Logging**: All deletion operations are logged for security purposes
- **Data Validation**: Verification steps ensure complete cleanup

## Vercel Deployment Considerations

### Function Limit Compliance
- **Hobby Plan**: Limited to 12 serverless functions
- **Consolidated Approach**: Cleanup functionality integrated into existing `delete-account` API
- **No Additional Functions**: Stays within the 12-function limit

### Alternative Solutions
If you need more functions in the future:
1. **Upgrade to Pro Plan**: Allows unlimited serverless functions
2. **Consolidate More APIs**: Combine related functionality into single endpoints
3. **Use Edge Functions**: Some operations can be moved to Edge Functions (different limit)

## Conclusion

This comprehensive solution addresses the root causes of account deletion failures:

1. **Fixed database constraints** with proper CASCADE DELETE
2. **Improved deletion process** with better error handling
3. **Added cleanup utilities** for maintenance and troubleshooting
4. **Enhanced monitoring** to prevent future issues
5. **Stays within Vercel Hobby plan limits** through API consolidation

The solution ensures that users can successfully delete their accounts and re-register without encountering authentication errors, while maintaining data integrity and providing tools for ongoing database maintenance.
