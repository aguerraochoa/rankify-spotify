-- Change default for is_public to TRUE (public by default)
ALTER TABLE public.ranked_lists 
  ALTER COLUMN is_public SET DEFAULT TRUE;

