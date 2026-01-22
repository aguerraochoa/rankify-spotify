-- Initial Schema Migration for Spotify-first Rankify
-- This schema focuses on Spotify IDs and tokens

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  spotify_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_spotify_id ON public.profiles(spotify_id);

-- ============================================================================
-- RANKED LISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ranked_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  source_type TEXT CHECK (source_type IN ('album', 'playlist', 'custom')),
  source_id TEXT, -- Spotify ID for album or playlist
  songs JSONB NOT NULL, -- Array of ranked songs
  song_count INTEGER NOT NULL,
  cover_art_url TEXT,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  share_token TEXT UNIQUE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
  ranking_state JSONB, -- Full ranking state for drafts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for ranked_lists
CREATE INDEX IF NOT EXISTS idx_ranked_lists_user_id ON public.ranked_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_source_id ON public.ranked_lists(source_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_is_public ON public.ranked_lists(is_public);

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Ranked lists policies
CREATE POLICY "Anyone can view public lists" ON public.ranked_lists 
  FOR SELECT USING (is_public = true OR auth.uid() = user_id OR share_token IS NOT NULL);
CREATE POLICY "Users can manage own lists" ON public.ranked_lists 
  FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON public.follows 
  FOR ALL USING (auth.uid() = follower_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to handle profile creation and updates from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, spotify_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id' -- Supabase stores the provider ID (Spotify ID) here
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    spotify_id = EXCLUDED.spotify_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
