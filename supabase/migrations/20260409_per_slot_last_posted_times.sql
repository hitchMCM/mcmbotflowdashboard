-- =====================================================================================
-- Per-slot last_posted_times tracking
-- Fixes: with only 1 minute between slots, last_posted_at (single timestamp) could
-- land in the next slot's minute if N8N processing is slow, blocking that slot.
-- Solution: track a TIMESTAMPTZ per slot in a parallel array.
-- =====================================================================================

ALTER TABLE post_schedule_config
  ADD COLUMN IF NOT EXISTS last_posted_times TIMESTAMPTZ[] DEFAULT NULL;

COMMENT ON COLUMN post_schedule_config.last_posted_times IS
  'Per-slot last post timestamp. Parallel to post_times[]. Updated by N8N after each post. Prevents cross-slot false deduplication.';
