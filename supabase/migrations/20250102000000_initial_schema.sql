-- Initial Schema Migration
-- This is the base schema for Rankify
-- Run this on a fresh database to set up all tables, indexes, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- RANKED LISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ranked_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  songs JSONB NOT NULL,
  song_count INTEGER NOT NULL,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for ranked_lists
CREATE INDEX IF NOT EXISTS idx_ranked_lists_user_id ON public.ranked_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_created_at ON public.ranked_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_is_public ON public.ranked_lists(is_public);
CREATE INDEX IF NOT EXISTS idx_ranked_lists_share_token ON public.ranked_lists(share_token);

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

-- Indexes for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ============================================================================
-- ALBUMS TABLE (for Beli-style ranking - future feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  musicbrainz_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  cover_art_url TEXT,
  mu NUMERIC(4, 2) DEFAULT 5.0 NOT NULL,
  sigma NUMERIC(4, 2) DEFAULT 2.0 NOT NULL,
  initial_vibe TEXT CHECK (initial_vibe IN ('loved', 'mid', 'didnt_like')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, musicbrainz_id)
);

-- Indexes for albums
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_musicbrainz_id ON public.albums(musicbrainz_id);

-- ============================================================================
-- ALBUM COMPARISONS TABLE (for Beli-style ranking - future feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.album_comparisons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  album_a_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  album_b_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  preferred_album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  result TEXT CHECK (result IN ('preferred_a', 'preferred_b', 'tie')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, album_a_id, album_b_id)
);

-- Indexes for album_comparisons (foreign keys)
CREATE INDEX IF NOT EXISTS idx_album_comparisons_user_id ON public.album_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_album_comparisons_album_a_id ON public.album_comparisons(album_a_id);
CREATE INDEX IF NOT EXISTS idx_album_comparisons_album_b_id ON public.album_comparisons(album_b_id);
CREATE INDEX IF NOT EXISTS idx_album_comparisons_preferred_album_id ON public.album_comparisons(preferred_album_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranked_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_comparisons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (using optimized (select auth.uid()) pattern)
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Ranked lists policies
DROP POLICY IF EXISTS "Users can view ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can view ranked lists"
  ON public.ranked_lists FOR SELECT
  USING (
    (select auth.uid()) = user_id OR 
    is_public = true OR 
    share_token IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can insert own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can insert own ranked lists"
  ON public.ranked_lists FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can update own ranked lists"
  ON public.ranked_lists FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own ranked lists" ON public.ranked_lists;
CREATE POLICY "Users can delete own ranked lists"
  ON public.ranked_lists FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Follows policies
DROP POLICY IF EXISTS "Users can view their follows and followers" ON public.follows;
CREATE POLICY "Users can view their follows and followers"
  ON public.follows FOR SELECT
  USING ((select auth.uid()) = follower_id OR (select auth.uid()) = following_id);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE
  USING ((select auth.uid()) = follower_id);

-- Albums policies
DROP POLICY IF EXISTS "Users can view own albums" ON public.albums;
CREATE POLICY "Users can view own albums"
  ON public.albums FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own albums" ON public.albums;
CREATE POLICY "Users can insert own albums"
  ON public.albums FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own albums" ON public.albums;
CREATE POLICY "Users can update own albums"
  ON public.albums FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own albums" ON public.albums;
CREATE POLICY "Users can delete own albums"
  ON public.albums FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Album comparisons policies
DROP POLICY IF EXISTS "Users can view own album comparisons" ON public.album_comparisons;
CREATE POLICY "Users can view own album comparisons"
  ON public.album_comparisons FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own album comparisons" ON public.album_comparisons;
CREATE POLICY "Users can insert own album comparisons"
  ON public.album_comparisons FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

