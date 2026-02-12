-- =====================================================================================
-- Auto Post System: Google Drive → Facebook
-- Tables for scheduling automatic posts from Google Drive to Facebook pages
-- Run this in psql: psql -U postgres -d MCMBotFlow -f this_file.sql
-- =====================================================================================

-- =====================================================================================
-- Table 1: google_drive_connections
-- Stores the Google Drive folder connections per page (linked in Settings)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  root_folder_id TEXT NOT NULL,           -- Google Drive folder ID extracted from URL
  root_folder_url TEXT,                    -- Original URL pasted by user
  folder_name TEXT DEFAULT 'Google Drive Folder',  -- Display name
  is_connected BOOLEAN DEFAULT true,
  needs_scan BOOLEAN DEFAULT true,         -- Flag for N8N to scan subfolders
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id)                          -- One connection per page
);

-- =====================================================================================
-- Table 2: google_drive_subfolders
-- Populated by N8N after scanning the root folder
-- =====================================================================================
CREATE TABLE IF NOT EXISTS google_drive_subfolders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_drive_connections(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  subfolder_drive_id TEXT NOT NULL,         -- Google Drive subfolder ID
  name TEXT NOT NULL,                       -- Subfolder name
  file_count INTEGER DEFAULT 0,            -- Number of media files found
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, subfolder_drive_id)
);

-- =====================================================================================
-- Table 3: post_schedule_config
-- Configuration for automatic posting schedule
-- =====================================================================================
CREATE TABLE IF NOT EXISTS post_schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  subfolder_id TEXT NOT NULL,              -- Google Drive subfolder ID selected
  subfolder_name TEXT,                      -- Subfolder display name
  post_times TIME[] NOT NULL DEFAULT ARRAY['09:00'::TIME],  -- Array of posting times
  current_file_index INTEGER DEFAULT 0,    -- Index for file rotation
  custom_caption TEXT,                      -- Custom caption (optional)
  default_caption TEXT DEFAULT '📸 Nouveau contenu !',  -- Default caption
  is_active BOOLEAN DEFAULT true,
  last_posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id)                          -- One schedule per page
);

-- =====================================================================================
-- Table 4: posted_files
-- History of files that have been posted
-- =====================================================================================
CREATE TABLE IF NOT EXISTS posted_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  google_drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'video')),
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  facebook_post_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- Indexes for performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_gdrive_connections_page ON google_drive_connections(page_id);
CREATE INDEX IF NOT EXISTS idx_gdrive_connections_user ON google_drive_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gdrive_subfolders_connection ON google_drive_subfolders(connection_id);
CREATE INDEX IF NOT EXISTS idx_gdrive_subfolders_page ON google_drive_subfolders(page_id);
CREATE INDEX IF NOT EXISTS idx_post_schedule_page ON post_schedule_config(page_id);
CREATE INDEX IF NOT EXISTS idx_post_schedule_active ON post_schedule_config(is_active);
CREATE INDEX IF NOT EXISTS idx_posted_files_page ON posted_files(page_id);
CREATE INDEX IF NOT EXISTS idx_posted_files_status ON posted_files(status);
CREATE INDEX IF NOT EXISTS idx_posted_files_drive_id ON posted_files(google_drive_file_id);

-- =====================================================================================
-- RLS Policies (Row Level Security)
-- =====================================================================================

-- Enable RLS
ALTER TABLE google_drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_subfolders ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE posted_files ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (matching existing pattern in this project)
CREATE POLICY "public_read_google_drive_connections" ON google_drive_connections FOR SELECT USING (true);
CREATE POLICY "public_write_google_drive_connections" ON google_drive_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_google_drive_connections" ON google_drive_connections FOR UPDATE USING (true);
CREATE POLICY "public_delete_google_drive_connections" ON google_drive_connections FOR DELETE USING (true);

CREATE POLICY "public_read_google_drive_subfolders" ON google_drive_subfolders FOR SELECT USING (true);
CREATE POLICY "public_write_google_drive_subfolders" ON google_drive_subfolders FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_google_drive_subfolders" ON google_drive_subfolders FOR UPDATE USING (true);
CREATE POLICY "public_delete_google_drive_subfolders" ON google_drive_subfolders FOR DELETE USING (true);

CREATE POLICY "public_read_post_schedule_config" ON post_schedule_config FOR SELECT USING (true);
CREATE POLICY "public_write_post_schedule_config" ON post_schedule_config FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_post_schedule_config" ON post_schedule_config FOR UPDATE USING (true);
CREATE POLICY "public_delete_post_schedule_config" ON post_schedule_config FOR DELETE USING (true);

CREATE POLICY "public_read_posted_files" ON posted_files FOR SELECT USING (true);
CREATE POLICY "public_write_posted_files" ON posted_files FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_posted_files" ON posted_files FOR UPDATE USING (true);
CREATE POLICY "public_delete_posted_files" ON posted_files FOR DELETE USING (true);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('google_drive_connections', 'google_drive_subfolders', 'post_schedule_config', 'posted_files')
ORDER BY table_name;
