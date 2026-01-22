-- Migration: Add status and ranking_state columns to ranked_lists
-- This adds support for draft rankings

-- Add status column
ALTER TABLE public.ranked_lists 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed'));

-- Add ranking_state column for storing draft state
ALTER TABLE public.ranked_lists 
ADD COLUMN IF NOT EXISTS ranking_state JSONB;

-- Make name and source_type nullable (for backwards compatibility with drafts)
ALTER TABLE public.ranked_lists 
ALTER COLUMN name DROP NOT NULL;

-- Create index on status for faster draft queries
CREATE INDEX IF NOT EXISTS idx_ranked_lists_status ON public.ranked_lists(status);
