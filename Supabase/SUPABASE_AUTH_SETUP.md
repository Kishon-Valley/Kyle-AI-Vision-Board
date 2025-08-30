# Supabase Authentication Setup Guide

This guide explains how to set up Supabase authentication with Google login for the Vision Board AI application.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Note your Supabase URL and anon key (found in Project Settings > API)
4. Update the `.env` file with your credentials:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 2. Set Up Google OAuth Provider

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Configure the OAuth consent screen if prompted
6. For Application type, select "Web application"
7. Add your application name
8. Add authorized JavaScript origins:
   - `http://localhost:5173` (for local development)
   - Your production URL when deployed
9. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (for local development)
   - `https://your-production-url.com/auth/callback` (for production)
10. Click "Create" and note your Client ID and Client Secret

## 3. Configure Supabase Auth

1. In your Supabase dashboard, go to Authentication > Providers
2. Find Google in the list and enable it
3. Enter your Google Client ID and Client Secret
4. Save changes

## 4. Set Up Database Tables

Run the SQL commands in `supabase_profiles_setup.sql` in the Supabase SQL editor to:
- Create the profiles table
- Set up Row Level Security
- Create appropriate policies
- Set up triggers for new user registration

## 5. Testing Authentication

1. Start your application with `npm run dev`
2. Click the "Login" button in the navbar
3. Select "Login with Google"
4. Complete the Google authentication flow
5. You should be redirected back to the application and logged in

## Troubleshooting

- Check browser console for any errors
- Verify that your redirect URIs are correctly configured in Google Cloud Console
- Ensure your Supabase URL and anon key are correctly set in the `.env` file
- Check that the Google provider is enabled in Supabase Authentication settings
