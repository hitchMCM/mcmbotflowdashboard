import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  GoogleDriveConnection,
  GoogleDriveConnectionInsert,
  GoogleDriveSubfolder,
  PostScheduleConfig,
  PostScheduleConfigInsert,
  PostedFile,
  extractGoogleDriveFolderId,
} from '@/types/autoPost';

// Helper to get current user ID from localStorage
const getCurrentUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('mcm_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
  } catch (e) {
    console.error('[useAutoPost] Error parsing user:', e);
  }
  return null;
};

// =====================================================================================
// useGoogleDriveConnection - Manage Google Drive connection for a page
// =====================================================================================

export function useGoogleDriveConnection(pageId: string | null) {
  const [connection, setConnection] = useState<GoogleDriveConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = getCurrentUserId();

  const fetchConnection = useCallback(async () => {
    if (!userId) {
      setConnection(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Connection is per-user, not per-page
      const { data, error: fetchError } = await supabase
        .from('google_drive_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_connected', true)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setConnection(data);
    } catch (err: any) {
      setError(err.message);
      console.error('[useGoogleDriveConnection] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = async (folderUrl: string, folderName?: string): Promise<boolean> => {
    if (!userId) return false;

    const folderId = extractGoogleDriveFolderId(folderUrl);
    if (!folderId) {
      setError('Invalid Google Drive folder URL or ID');
      return false;
    }

    try {
      setError(null);

      // Check if connection already exists for this user
      if (connection) {
        // Update existing
        const { data, error: updateError } = await supabase
          .from('google_drive_connections')
          .update({
            root_folder_id: folderId,
            root_folder_url: folderUrl,
            folder_name: folderName || 'Google Drive Folder',
            is_connected: true,
            needs_scan: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();

        if (updateError) throw updateError;
        setConnection(data);
      } else {
        // Insert new — use pageId as reference but connection is per-user
        const insertData: GoogleDriveConnectionInsert = {
          page_id: pageId || userId,
          user_id: userId,
          root_folder_id: folderId,
          root_folder_url: folderUrl,
          folder_name: folderName || 'Google Drive Folder',
          is_connected: true,
          needs_scan: true,
        };

        const { data, error: insertError } = await supabase
          .from('google_drive_connections')
          .insert(insertData)
          .select('*')
          .maybeSingle();

        if (insertError) throw insertError;
        setConnection(data);
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('[useGoogleDriveConnection] Connect error:', err);
      return false;
    }
  };

  const disconnect = async (): Promise<boolean> => {
    if (!userId || !connection) return false;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('google_drive_connections')
        .update({ is_connected: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) throw updateError;
      setConnection(prev => prev ? { ...prev, is_connected: false } : null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteConnection = async (): Promise<boolean> => {
    if (!userId || !connection) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('google_drive_connections')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      setConnection(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  return {
    connection,
    loading,
    error,
    connect,
    disconnect,
    deleteConnection,
    refresh: fetchConnection,
  };
}

// =====================================================================================
// useGoogleDriveSubfolders - List subfolders (manual refresh only)
// Subfolders belong to the user's Drive connection, not a specific page
// =====================================================================================

export function useGoogleDriveSubfolders(connectionId: string | null) {
  const [subfolders, setSubfolders] = useState<GoogleDriveSubfolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubfolders = useCallback(async () => {
    if (!connectionId) {
      setSubfolders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_drive_subfolders')
        .select('*')
        .eq('connection_id', connectionId)
        .order('name', { ascending: true });

      if (error) throw error;
      setSubfolders(data || []);
    } catch (err: any) {
      console.error('[useGoogleDriveSubfolders] Error:', err);
      setSubfolders([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    fetchSubfolders();
  }, [fetchSubfolders]);

  return { subfolders, loading, refresh: fetchSubfolders };
}

// =====================================================================================
// usePostSchedule - Manage post schedule config
// =====================================================================================

export function usePostSchedule(pageId: string | null) {
  const [config, setConfig] = useState<PostScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!pageId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('post_schedule_config')
        .select('*')
        .eq('page_id', pageId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
      console.error('[usePostSchedule] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (configData: PostScheduleConfigInsert): Promise<boolean> => {
    if (!pageId) return false;

    try {
      setError(null);

      if (config) {
        // Update existing
        const { data, error: updateError } = await supabase
          .from('post_schedule_config')
          .update({
            ...configData,
            updated_at: new Date().toISOString(),
          })
          .eq('page_id', pageId)
          .select('*')
          .maybeSingle();

        if (updateError) throw updateError;
        setConfig(data);
      } else {
        // Insert new
        const { data, error: insertError } = await supabase
          .from('post_schedule_config')
          .insert(configData)
          .select('*')
          .maybeSingle();

        if (insertError) throw insertError;
        setConfig(data);
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('[usePostSchedule] Save error:', err);
      return false;
    }
  };

  const toggleActive = async (): Promise<boolean> => {
    if (!pageId || !config) return false;

    try {
      const newActive = !config.is_active;
      const { error: updateError } = await supabase
        .from('post_schedule_config')
        .update({ is_active: newActive, updated_at: new Date().toISOString() })
        .eq('page_id', pageId);

      if (updateError) throw updateError;
      setConfig(prev => prev ? { ...prev, is_active: newActive } : null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteConfig = async (): Promise<boolean> => {
    if (!pageId || !config) return false;

    try {
      const { error: deleteError } = await supabase
        .from('post_schedule_config')
        .delete()
        .eq('page_id', pageId);

      if (deleteError) throw deleteError;
      setConfig(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  return {
    config,
    loading,
    error,
    saveConfig,
    toggleActive,
    deleteConfig,
    refresh: fetchConfig,
  };
}

// =====================================================================================
// duplicateConfigToPages - Clone current config to other pages
// =====================================================================================

export async function duplicateConfigToPages(
  sourceConfig: PostScheduleConfig,
  targetPageIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const targetPageId of targetPageIds) {
    try {
      // Check if target page already has a config
      const { data: existing } = await supabase
        .from('post_schedule_config')
        .select('id')
        .eq('page_id', targetPageId)
        .maybeSingle();

      const configData = {
        page_id: targetPageId,
        subfolder_id: sourceConfig.subfolder_id,
        subfolder_name: sourceConfig.subfolder_name,
        post_times: sourceConfig.post_times,
        captions: sourceConfig.captions,
        subfolder_ids: sourceConfig.subfolder_ids,
        subfolder_names: sourceConfig.subfolder_names,
        custom_caption: sourceConfig.custom_caption,
        is_active: false, // cloned configs start paused
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing config
        const { error } = await supabase
          .from('post_schedule_config')
          .update(configData)
          .eq('page_id', targetPageId);
        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from('post_schedule_config')
          .insert(configData);
        if (error) throw error;
      }

      success.push(targetPageId);
    } catch (err: any) {
      console.error(`[duplicateConfig] Failed for page ${targetPageId}:`, err);
      failed.push(targetPageId);
    }
  }

  return { success, failed };
}

// =====================================================================================
// cloneConfigFromPage - Copy config from a source page to the current page
// =====================================================================================

export async function cloneConfigFromPage(
  sourcePageId: string,
  targetPageId: string
): Promise<boolean> {
  try {
    // Fetch source config
    const { data: source, error: fetchError } = await supabase
      .from('post_schedule_config')
      .select('*')
      .eq('page_id', sourcePageId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!source) return false;

    // Check if target already has config
    const { data: existing } = await supabase
      .from('post_schedule_config')
      .select('id')
      .eq('page_id', targetPageId)
      .maybeSingle();

    const configData = {
      page_id: targetPageId,
      subfolder_id: source.subfolder_id,
      subfolder_name: source.subfolder_name,
      post_times: source.post_times,
      captions: source.captions,
      subfolder_ids: source.subfolder_ids,
      subfolder_names: source.subfolder_names,
      custom_caption: source.custom_caption,
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('post_schedule_config')
        .update(configData)
        .eq('page_id', targetPageId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('post_schedule_config')
        .insert(configData);
      if (error) throw error;
    }

    return true;
  } catch (err: any) {
    console.error('[cloneConfigFromPage] Error:', err);
    return false;
  }
}

// =====================================================================================
// usePostedFiles - View posting history
// =====================================================================================

export function usePostedFiles(pageId: string | null, limit = 20) {
  const [files, setFiles] = useState<PostedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });

  const fetchFiles = useCallback(async () => {
    if (!pageId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('posted_files')
        .select('*')
        .eq('page_id', pageId)
        .order('posted_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      const filesList = data || [];
      setFiles(filesList);
      
      // Calculate stats
      setStats({
        total: filesList.length,
        success: filesList.filter(f => f.status === 'success').length,
        failed: filesList.filter(f => f.status === 'failed').length,
      });
    } catch (err: any) {
      console.error('[usePostedFiles] Error:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [pageId, limit]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, stats, refresh: fetchFiles };
}
