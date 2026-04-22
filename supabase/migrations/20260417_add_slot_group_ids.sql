-- Add slot_group_ids to post_schedule_config
-- Stores per-slot group IDs as JSONB array of string arrays
-- e.g. [["groupId1"], [], ["groupId1", "groupId2"]]

ALTER TABLE post_schedule_config
  ADD COLUMN IF NOT EXISTS slot_group_ids JSONB DEFAULT '[]'::JSONB;
