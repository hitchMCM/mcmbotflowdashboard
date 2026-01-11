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

// =====================================================================================
// useMessages - Manage global message pool
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
        
        // Fetch the actual messages
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
        setMessages(data || []);
      } else {
        // Fetch all messages (global pool)
        let query = supabase.from('messages').select('*').order('created_at', { ascending: false });
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        setMessages(data || []);
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
      console.log('[useMessages] Creating message:', message);
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert(message)
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
      const { error: updateError } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } as Message : m));
      return true;
    } catch (err) {
      console.error('Error updating message:', err);
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
      // Use RPC function for upsert
      const { data, error: rpcError } = await supabase.rpc('upsert_page_config', {
        p_page_id: config.page_id,
        p_category: config.category,
        p_name: config.name,
        p_selected_message_ids: config.selected_message_ids || null,
        p_selection_mode: config.selection_mode || 'random',
        p_fixed_message_id: config.fixed_message_id || null,
        p_trigger_keywords: config.trigger_keywords || null,
        p_delay_hours: config.delay_hours || null,
        p_scheduled_time: config.scheduled_time || null,
        p_messages_count: config.messages_count || 1,
        p_is_enabled: config.is_enabled !== undefined ? config.is_enabled : true,
      });

      if (rpcError) throw rpcError;

      // Refetch to get the full config
      await fetchConfigs();
      
      return configs.find(c => c.id === data) || null;
    } catch (err) {
      console.error('Error upserting config:', err);
      return null;
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
    standard: { total: 0, active: 0 },
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
          standard: { total: 0, active: 0 },
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
