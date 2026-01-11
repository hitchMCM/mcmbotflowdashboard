-- =====================================================================================
-- Create page_configs table if it doesn't exist
-- Run this in Supabase SQL Editor
-- =====================================================================================

-- Create page_configs table
CREATE TABLE IF NOT EXISTS page_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard')),
    name TEXT NOT NULL,
    selected_message_ids UUID[] DEFAULT '{}',
    selection_mode TEXT DEFAULT 'random' CHECK (selection_mode IN ('random', 'fixed', 'ordered')),
    fixed_message_id UUID,
    messages_count INTEGER DEFAULT 1,
    delay_hours INTEGER[] DEFAULT '{}',
    scheduled_time TIME,
    scheduled_date DATE,
    trigger_keywords TEXT[] DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    times_triggered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for page + category + name
    UNIQUE(page_id, category, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_page_configs_page_id ON page_configs(page_id);
CREATE INDEX IF NOT EXISTS idx_page_configs_category ON page_configs(category);

-- Enable RLS
ALTER TABLE page_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view page_configs" ON page_configs;
DROP POLICY IF EXISTS "Anyone can insert page_configs" ON page_configs;
DROP POLICY IF EXISTS "Anyone can update page_configs" ON page_configs;
DROP POLICY IF EXISTS "Anyone can delete page_configs" ON page_configs;

-- Create permissive policies (for development)
CREATE POLICY "Anyone can view page_configs" ON page_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert page_configs" ON page_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update page_configs" ON page_configs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete page_configs" ON page_configs FOR DELETE USING (true);

-- Verify table exists
SELECT 'page_configs table ready' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'page_configs' ORDER BY ordinal_position;
