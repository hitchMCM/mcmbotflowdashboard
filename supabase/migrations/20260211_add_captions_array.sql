-- =====================================================================================
-- Add captions[] column to post_schedule_config
-- Each posting time can have its own caption
-- Run: docker exec -i nks-postgres-v2 psql -U postgres -d MCMBotFlow -f this_file.sql
-- =====================================================================================

ALTER TABLE post_schedule_config ADD COLUMN IF NOT EXISTS captions TEXT[] DEFAULT '{}';

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'post_schedule_config' AND column_name = 'captions';
