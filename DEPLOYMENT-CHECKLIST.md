# Deployment Checklist

## Before Deployment

### Environment Variables
- [ ] Update all environment variables in Vercel dashboard
- [ ] Verify Stripe keys are set to production (not test mode)
- [ ] Ensure Supabase service key has proper permissions
- [ ] Set `NODE_ENV=production` in production environment

### Stripe Configuration
- [ ] Webhook endpoint is set to: `https://www.moodboardgenerator.com/api/webhook`
- [ ] Webhook events are properly configured:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Test webhook signing secret is set in environment variables

### Supabase Configuration
- [ ] RLS (Row Level Security) policies are properly set
- [ ] CORS origins are configured in Supabase dashboard
- [ ] Service role key has appropriate permissions

## Deployment Steps

1. **Push to Main Branch**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Verify Vercel Deployment**
   - Go to Vercel dashboard
   - Check deployment logs for errors
   - Verify environment variables are properly set

3. **Test Production**
   - Visit https://www.moodboardgenerator.com
   - Test signup/login flow
   - Test subscription flow with Stripe test card: `4242 4242 4242 4242`
   - Verify webhook events are being received in Stripe dashboard
   - Check Vercel logs for any errors

4. **Monitor**
   - Set up error tracking (e.g., Sentry)
   - Monitor Stripe dashboard for failed payments
   - Check Supabase logs for any database issues

## Post-Deployment Tests

1. **Payment Flow**
   - [ ] New subscription
   - [ ] Upgrade subscription
   - [ ] Cancel subscription
   - [ ] Payment failure handling

2. **User Experience**
   - [ ] Loading states work correctly
   - [ ] Error messages are user-friendly
   - [ ] Success states are clear

3. **Security**
   - [ ] All API routes are protected
   - [ ] Sensitive data is not exposed in client-side code
   - [ ] CORS is properly configured

## Rollback Plan

If something goes wrong:

1. Revert to previous working commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. If needed, rollback database changes in Supabase

3. Contact support@stripe.com if there are payment processing issues

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com/
- **Supabase Support**: https://supabase.com/support
