import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Message, 
  MessageInsert, 
  MessageCategory, 
  PageConfig, 
  PageConfigInsert,
  SelectionMode 
} from '@/types/messages';

// Helper to get current user ID from localStorage
const getCurrentUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('mcm_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
  } catch (e) {
    console.error('[useMessages] Error parsing user:', e);
  }
  return null;
};

// =====================================================================================
// useMessages - Manage user's message pool
// =====================================================================================

interface UseMessagesOptions {
  category?: MessageCategory;
  pageId?: string | null;
  filterByPage?: boolean; // If true, only show messages used by the specified page
}

export function useMessages(categoryOrOptions?: MessageCategory | UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse options
  const options: UseMessagesOptions = typeof categoryOrOptions === 'string' 
    ? { category: categoryOrOptions }
    : categoryOrOptions || {};
  
  const { category, pageId, filterByPage } = options;

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      const userId = getCurrentUserId();
      console.log('[useMessages] Fetching messages for userId:', userId, 'category:', category);
      
      // User must be logged in to see messages
      if (!userId) {
        console.log('[useMessages] No user logged in, returning empty');
        setMessages([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (filterByPage && pageId) {
        // Fetch messages used by the specific page
        const { data: configs, error: configError } = await supabase
          .from('page_configs')
          .select('selected_message_ids')
          .eq('page_id', pageId);
        
        if (configError) throw configError;
        
        // Collect all message IDs used by this page
        const messageIds = new Set<string>();
        (configs || []).forEach(config => {
          (config.selected_message_ids || []).forEach(id => messageIds.add(id));
        });
        
        if (messageIds.size === 0) {
          setMessages([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Fetch messages that match IDs and belong to user OR are global
        let query = supabase
          .from('messages')
          .select('*')
          .in('id', Array.from(messageIds))
          .order('created_at', { ascending: false });
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        
        // Filter: user's own messages OR global OR unassigned (null user_id)
        const filtered = (data || []).filter(m => 
          m.user_id === userId || m.is_global === true || m.user_id === null
        );
        setMessages(filtered);
      } else {
        // Fetch user's own messages + global messages + unassigned messages
        let query = supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        
        // Debug: log all messages and their user_ids
        console.log('[useMessages] Raw data from DB:', data?.length, 'messages');
        console.log('[useMessages] Sample user_ids:', data?.slice(0, 5).map(m => ({ id: m.id, user_id: m.user_id, is_global: m.is_global, name: m.name })));
        
        // Filter: user's own messages OR global OR unassigned (null user_id)
        const filtered = (data || []).filter(m => 
          m.user_id === userId || m.is_global === true || m.user_id === null
        );
        console.log('[useMessages] Fetched', data?.length, 'total, filtered to', filtered.length, 'for user', userId);
        setMessages(filtered);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [category, pageId, filterByPage]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const createMessage = async (message: MessageInsert): Promise<Message | null> => {
    try {
      const userId = getCurrentUserId();
      console.log('[useMessages] Creating message for user:', userId);
      
      // Build insert data - include user_id if available
      const insertData = userId 
        ? { ...message, user_id: userId }
        : message;
      
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) {
        console.error('[useMessages] Insert error:', insertError);
        throw insertError;
      }
      
      console.log('[useMessages] Message created:', data);
      setMessages(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('[useMessages] Error creating message:', err);
      return null;
    }
  };

  const updateMessage = async (id: string, updates: Partial<MessageInsert>): Promise<boolean> => {
    try {
      console.log('[useMessages] ========== UPDATE START ==========');
      console.log('[useMessages] Updating message ID:', id);
      console.log('[useMessages] Update data:', JSON.stringify(updates, null, 2));
      
      const { data, error: updateError } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', id)
        .select();
      
      console.log('[useMessages] Response - data:', data);
      console.log('[useMessages] Response - error:', updateError);
      
      if (updateError) {
        console.error('[useMessages] Update error:', updateError);
        throw updateError;
      }
      
      // Check if any row was actually updated
      if (!data || data.length === 0) {
        console.error('[useMessages] No rows updated - data is empty or null');
        return false;
      }
      
      console.log('[useMessages] Update successful, updated row:', data[0]);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...data[0] } as Message : m));
      return true;
    } catch (err) {
      console.error('[useMessages] Exception caught:', err);
      return false;
    }
  };

  const deleteMessage = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setMessages(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateMessage(id, { is_active: isActive });
  };

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    createMessage,
    updateMessage,
    deleteMessage,
    toggleActive,
  };
}

// =====================================================================================
// usePageConfigs - Manage per-page configurations
// =====================================================================================

export function usePageConfigs(pageId: string | null, category?: MessageCategory) {
  const [configs, setConfigs] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!pageId) {
      setConfigs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('page_configs')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setConfigs(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configs');
      console.error('Error fetching page configs:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId, category]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const upsertConfig = async (config: PageConfigInsert): Promise<PageConfig | null> => {
    try {
      console.log('[usePageConfigs] Upserting config:', JSON.stringify(config, null, 2));
      
      // First, try to find existing config by page_id and category only
      // Use .limit(1) instead of .maybeSingle() to handle duplicates gracefully
      const { data: existingList, error: selectError } = await supabase
        .from('page_configs')
        .select('id, name')
        .eq('page_id', config.page_id)
        .eq('category', config.category)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const existing = existingList?.[0] || null;
      console.log('[usePageConfigs] Existing config found:', existing);
      
      if (selectError) {
        console.error('[usePageConfigs] Select error:', selectError);
        throw selectError;
      }

      let resultId: string;

      if (existing?.id) {
        // Update existing config
        console.log('[usePageConfigs] Updating existing config:', existing.id);
        const updateData = {
          name: config.name, // Also update name in case it changed
          selected_message_ids: config.selected_message_ids || [],
          selection_mode: config.selection_mode || 'random',
          fixed_message_id: config.fixed_message_id || null,
          trigger_keywords: config.trigger_keywords || [],
          delay_hours: config.delay_hours || [],
          scheduled_time: config.scheduled_time || null,
          scheduled_times: config.scheduled_times || null,
          messages_count: config.messages_count || 1,
          is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
          updated_at: new Date().toISOString(),
        };
        console.log('[usePageConfigs] Update data:', JSON.stringify(updateData, null, 2));
        
        const { error: updateError } = await supabase
          .from('page_configs')
          .update(updateData)
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('[usePageConfigs] Update error:', updateError);
          throw updateError;
        }
        console.log('[usePageConfigs] Update successful');
        resultId = existing.id;
      } else {
        // Insert new config
        console.log('[usePageConfigs] Inserting new config');
        const { data: inserted, error: insertError } = await supabase
          .from('page_configs')
          .insert({
            page_id: config.page_id,
            category: config.category,
            name: config.name,
            selected_message_ids: config.selected_message_ids || [],
            selection_mode: config.selection_mode || 'random',
            fixed_message_id: config.fixed_message_id || null,
            trigger_keywords: config.trigger_keywords || [],
            delay_hours: config.delay_hours || [],
            scheduled_time: config.scheduled_time || null,
            scheduled_times: config.scheduled_times || null,
            messages_count: config.messages_count || 1,
            is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('[usePageConfigs] Insert error:', insertError);
          throw insertError;
        }
        resultId = inserted.id;
      }

      console.log('[usePageConfigs] Config saved successfully:', resultId);
      
      // Refetch to get the full config
      await fetchConfigs();
      
      return configs.find(c => c.id === resultId) || null;
    } catch (err: any) {
      console.error('[usePageConfigs] Error upserting config:', err);
      throw err; // Re-throw to let caller handle it
    }
  };

  const deleteConfig = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('page_configs')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setConfigs(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting config:', err);
      return false;
    }
  };

  const addKeyword = async (configId: string, keyword: string): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('add_config_keyword', {
        p_config_id: configId,
        p_keyword: keyword,
      });
      
      if (rpcError) throw rpcError;
      await fetchConfigs();
      return true;
    } catch (err) {
      console.error('Error adding keyword:', err);
      return false;
    }
  };

  const removeKeyword = async (configId: string, keyword: string): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('remove_config_keyword', {
        p_config_id: configId,
        p_keyword: keyword,
      });
      
      if (rpcError) throw rpcError;
      await fetchConfigs();
      return true;
    } catch (err) {
      console.error('Error removing keyword:', err);
      return false;
    }
  };

  const addMessage = async (configId: string, messageId: string): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('add_config_message', {
        p_config_id: configId,
        p_message_id: messageId,
      });
      
      if (rpcError) throw rpcError;
      await fetchConfigs();
      return true;
    } catch (err) {
      console.error('Error adding message:', err);
      return false;
    }
  };

  const removeMessage = async (configId: string, messageId: string): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase.rpc('remove_config_message', {
        p_config_id: configId,
        p_message_id: messageId,
      });
      
      if (rpcError) throw rpcError;
      await fetchConfigs();
      return true;
    } catch (err) {
      console.error('Error removing message:', err);
      return false;
    }
  };

  const setMode = async (configId: string, mode: SelectionMode, fixedMessageId?: string): Promise<boolean> => {
    try {
      const updates: Partial<PageConfig> = { selection_mode: mode };
      if (mode === 'fixed' && fixedMessageId) {
        updates.fixed_message_id = fixedMessageId;
      } else if (mode !== 'fixed') {
        updates.fixed_message_id = null;
      }

      const { error: updateError } = await supabase
        .from('page_configs')
        .update(updates)
        .eq('id', configId);
      
      if (updateError) throw updateError;
      await fetchConfigs();
      return true;
    } catch (err) {
      console.error('Error setting mode:', err);
      return false;
    }
  };

  return {
    configs,
    loading,
    error,
    refetch: fetchConfigs,
    upsertConfig,
    deleteConfig,
    addKeyword,
    removeKeyword,
    addMessage,
    removeMessage,
    setMode,
  };
}

// =====================================================================================
// useMessagesByCategory - Get messages grouped by category
// =====================================================================================

export function useMessagesByCategory() {
  const [messagesByCategory, setMessagesByCategory] = useState<Record<MessageCategory, Message[]>>({
    welcome: [],
    response: [],
    sequence: [],
    broadcast: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        const grouped: Record<MessageCategory, Message[]> = {
          welcome: [],
          response: [],
          sequence: [],
          broadcast: [],
        };

        (data || []).forEach(msg => {
          if (grouped[msg.category as MessageCategory]) {
            grouped[msg.category as MessageCategory].push(msg);
          }
        });

        setMessagesByCategory(grouped);
      } catch (err) {
        console.error('Error fetching messages by category:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  return { messagesByCategory, loading };
}

// =====================================================================================
// useMessagesSummary - Get summary stats
// =====================================================================================

export function useMessagesSummary() {
  const [summary, setSummary] = useState<Record<MessageCategory, { total: number; active: number }>>({
    welcome: { total: 0, active: 0 },
    response: { total: 0, active: 0 },
    sequence: { total: 0, active: 0 },
    broadcast: { total: 0, active: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages_summary')
          .select('*');
        
        if (error) throw error;

        const result: Record<MessageCategory, { total: number; active: number }> = {
          welcome: { total: 0, active: 0 },
          response: { total: 0, active: 0 },
          sequence: { total: 0, active: 0 },
          broadcast: { total: 0, active: 0 },
        };

        (data || []).forEach(row => {
          if (result[row.category as MessageCategory]) {
            result[row.category as MessageCategory] = {
              total: row.total_messages,
              active: row.active_messages,
            };
          }
        });

        setSummary(result);
      } catch (err) {
        console.error('Error fetching messages summary:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, []);

  return { summary, loading };
}
