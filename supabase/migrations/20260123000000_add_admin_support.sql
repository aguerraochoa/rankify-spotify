-- Migration to add admin support to profiles table

-- Add is_admin column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- UPDATE handle_new_user to preserve is_admin status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, spotify_id, is_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id',
    FALSE -- Default to false for new users
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    spotify_id = EXCLUDED.spotify_id;
    -- Note: we do NOT update is_admin here to preserve existing admin status
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTRUCTIONS: Run the following SQL in the Supabase SQL Editor to make your account an admin:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'aguerraochoa8@gmail.com';
