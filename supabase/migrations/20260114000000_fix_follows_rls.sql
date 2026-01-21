-- Update Follows policies to allow anyone to view follows
-- This ensures that follower/following counts are consistent for all users
DROP POLICY IF EXISTS "Users can view their follows and followers" ON public.follows;

CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  USING (true);
