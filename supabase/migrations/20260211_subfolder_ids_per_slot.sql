-- Add per-slot subfolder arrays to post_schedule_config
-- Each post slot picks its own subfolder; N8N handles which file to post

ALTER TABLE post_schedule_config
  ADD COLUMN IF NOT EXISTS subfolder_ids TEXT[] DEFAULT '{}';

ALTER TABLE post_schedule_config
  ADD COLUMN IF NOT EXISTS subfolder_names TEXT[] DEFAULT '{}';
