// =====================================================================================
// Types for Auto Post System: Google Drive → Facebook
// =====================================================================================

// Google Drive Connection (linked in Settings)
export interface GoogleDriveConnection {
  id: string;
  page_id: string;
  user_id: string;
  root_folder_id: string;
  root_folder_url: string | null;
  folder_name: string;
  is_connected: boolean;
  needs_scan: boolean;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleDriveConnectionInsert {
  page_id: string;
  user_id: string;
  root_folder_id: string;
  root_folder_url?: string;
  folder_name?: string;
  is_connected?: boolean;
  needs_scan?: boolean;
}

// Subfolders (populated by N8N after scanning)
export interface GoogleDriveSubfolder {
  id: string;
  connection_id: string;
  page_id: string;
  subfolder_drive_id: string;
  name: string;
  file_count: number;
  created_at: string;
}

// Post Schedule Configuration
export interface PostScheduleConfig {
  id: string;
  page_id: string;
  subfolder_id: string;
  subfolder_name: string | null;
  post_times: string[];   // TIME[] e.g. ["09:00", "14:00"]
  captions: string[];          // Caption per slot (parallel array)
  subfolder_ids: string[];     // Subfolder Drive ID per slot
  subfolder_names: string[];   // Subfolder name per slot
  current_file_index: number;
  custom_caption: string | null;
  default_caption: string;
  is_active: boolean;
  last_posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostScheduleConfigInsert {
  page_id: string;
  subfolder_id: string;
  subfolder_name?: string;
  post_times: string[];
  captions?: string[];
  subfolder_ids?: string[];
  subfolder_names?: string[];
  custom_caption?: string | null;
  is_active?: boolean;
}

// A single scheduled post slot (time + caption + subfolder)
export interface PostSlot {
  time: string;              // HH:MM format
  caption: string;           // Caption for this slot
  subfolder_drive_id: string; // Subfolder to pull file from
  subfolder_name: string;     // Subfolder display name
}

// Posted Files History
export interface PostedFile {
  id: string;
  page_id: string;
  google_drive_file_id: string;
  file_name: string;
  file_type: 'image' | 'video';
  posted_at: string;
  facebook_post_id: string | null;
  status: 'success' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

// Helper: Extract folder ID from Google Drive URL
export function extractGoogleDriveFolderId(input: string): string | null {
  if (!input) return null;
  
  // Try to extract from URL format: https://drive.google.com/drive/folders/FOLDER_ID
  const urlMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  
  // Try to extract from URL with query params
  const queryMatch = input.match(/id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  
  // If it looks like a raw folder ID (alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) {
    return input.trim();
  }
  
  return null;
}

// Supported file extensions
export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];
export const SUPPORTED_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_VIDEO_EXTENSIONS];
