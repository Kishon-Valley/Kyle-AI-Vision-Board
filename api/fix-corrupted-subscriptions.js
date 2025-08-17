import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Guard against missing backend credentials
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase admin credentials are not configured.');
      return res.status(500).json({ error: 'Server mis-configuration' });
    }

    // Admin client (service role)
    const adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find users with corrupted subscription_id (contains JSON)
    const { data: users, error: fetchError } = await adminClient
      .from('users')
      .select('id, email, subscription_id, subscription_status')
      .not('subscription_id', 'is', null)
      .like('subscription_id', '{%');

    if (fetchError) {
      console.error('Error fetching users with corrupted subscription IDs:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    console.log(`Found ${users.length} users with corrupted subscription IDs`);

    const results = {
      processed: 0,
      fixed: 0,
      errors: [],
      details: []
    };

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.id} with corrupted subscription_id`);
        
        let cleanSubscriptionId;
        try {
          const parsedSubscription = JSON.parse(user.subscription_id);
          cleanSubscriptionId = parsedSubscription.id;
          console.log(`Extracted clean ID: ${cleanSubscriptionId} from corrupted data`);
        } catch (parseError) {
          console.error(`Failed to parse subscription_id for user ${user.id}:`, parseError);
          results.errors.push({
            userId: user.id,
            error: 'Failed to parse subscription_id',
            details: parseError.message
          });
          continue;
        }

        if (!cleanSubscriptionId || !cleanSubscriptionId.startsWith('sub_')) {
          console.error(`Invalid subscription ID extracted for user ${user.id}:`, cleanSubscriptionId);
          results.errors.push({
            userId: user.id,
            error: 'Invalid subscription ID extracted',
            details: `Extracted: ${cleanSubscriptionId}`
          });
          continue;
        }

        // Update the user with the clean subscription ID
        const { error: updateError } = await adminClient
          .from('users')
          .update({
            subscription_id: cleanSubscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error updating user ${user.id}:`, updateError);
          results.errors.push({
            userId: user.id,
            error: 'Failed to update database',
            details: updateError.message
          });
        } else {
          console.log(`Fixed subscription ID for user ${user.id}: ${user.subscription_id} -> ${cleanSubscriptionId}`);
          results.fixed++;
          results.details.push({
            userId: user.id,
            email: user.email,
            oldSubscriptionId: user.subscription_id,
            newSubscriptionId: cleanSubscriptionId
          });
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.errors.push({
          userId: user.id,
          error: 'Processing error',
          details: error.message
        });
      }
    }

    console.log('Fix corrupted subscriptions completed:', results);

    return res.status(200).json({
      success: true,
      message: `Processed ${results.processed} users, fixed ${results.fixed}`,
      results: results
    });

  } catch (err) {
    console.error('Unhandled error in fix-corrupted-subscriptions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
