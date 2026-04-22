-- =====================================================================================
-- Facebook Groups table
-- Stores Facebook groups linked to user pages for auto-posting
-- =====================================================================================

CREATE TABLE IF NOT EXISTS facebook_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id TEXT NOT NULL,                        -- Facebook Group ID
  group_name TEXT NOT NULL,                      -- Display name
  is_active BOOLEAN DEFAULT true,
  linked_page_ids UUID[] DEFAULT '{}',           -- Pages that post into this group
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_facebook_groups_user_id ON facebook_groups(user_id);

-- RLS (permissive — app uses custom auth, not Supabase auth.uid())
ALTER TABLE facebook_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_facebook_groups" ON facebook_groups FOR SELECT USING (true);
CREATE POLICY "public_write_facebook_groups" ON facebook_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_facebook_groups" ON facebook_groups FOR UPDATE USING (true);
CREATE POLICY "public_delete_facebook_groups" ON facebook_groups FOR DELETE USING (true);

-- Grant table access to PostgREST role
GRANT ALL ON TABLE facebook_groups TO mcmbotflow;
