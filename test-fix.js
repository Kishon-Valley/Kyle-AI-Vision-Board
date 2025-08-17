// Test script to verify the subscription fix
// Run this in your browser console or as a Node.js script

const testSubscriptionFix = async () => {
  try {
    // Test the fix-corrupted-subscriptions endpoint
    console.log('Testing fix-corrupted-subscriptions endpoint...');
    
    const response = await fetch('/api/fix-corrupted-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('Fix result:', result);
    
    if (result.success) {
      console.log('✅ Corrupted subscriptions fixed successfully!');
      console.log(`Fixed ${result.results.fixed} out of ${result.results.processed} users`);
    } else {
      console.error('❌ Failed to fix corrupted subscriptions:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing fix:', error);
  }
};

// Test the check-subscription endpoint for a specific user
const testSubscriptionCheck = async (userId) => {
  try {
    console.log(`Testing subscription check for user: ${userId}`);
    
    const response = await fetch('/api/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const result = await response.json();
    console.log('Subscription check result:', result);
    
    if (result.debug && result.debug.wasFixed) {
      console.log('✅ Subscription ID was automatically fixed!');
      console.log('Original:', result.debug.originalSubscriptionId);
      console.log('Fixed:', result.debug.cleanSubscriptionId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testSubscriptionFix = testSubscriptionFix;
  window.testSubscriptionCheck = testSubscriptionCheck;
  console.log('Test functions available: testSubscriptionFix(), testSubscriptionCheck(userId)');
}

module.exports = { testSubscriptionFix, testSubscriptionCheck };
