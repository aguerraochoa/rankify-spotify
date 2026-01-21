-- Add status field to ranked_lists for draft rankings
ALTER TABLE public.ranked_lists 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed'));

-- Add ranking_state field to store draft ranking state
ALTER TABLE public.ranked_lists
ADD COLUMN IF NOT EXISTS ranking_state JSONB;

-- Add index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_ranked_lists_status ON public.ranked_lists(user_id, status) WHERE status = 'draft';

-- Update existing rows to have 'completed' status
UPDATE public.ranked_lists SET status = 'completed' WHERE status IS NULL;

