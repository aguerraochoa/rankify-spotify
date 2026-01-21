# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be fully provisioned

## 2. Get Your API Keys

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** (for `SUPABASE_SERVICE_ROLE_KEY` - keep this secret!)

## 3. Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`

## 4. Run the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Paste and run it in the SQL Editor

This will create:
- All necessary tables (profiles, songs, albums, comparisons, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- A trigger to automatically create user profiles on signup

## 5. Configure Authentication

1. Go to Authentication → URL Configuration
2. Add your app URL to "Site URL" (e.g., `http://localhost:3000` for development)
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback` (for development)
   - Your production URL + `/auth/callback` (for production)

## 6. Enable Email Auth

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Configure email templates if desired

That's it! Your Supabase setup is complete.

