import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types basés sur la nouvelle structure Supabase
// Compatible avec les deux formats possibles de la table subscribers
export interface Subscriber {
  id: string;
  // Nouveau format
  page_id?: string;
  facebook_psid?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
  subscribed_at?: string;
  last_message_at?: string | null;
  flow_progress?: number | null;
  flow_total_steps?: number | null;
  // Ancien format (pour compatibilité)
  facebook_id?: string;
  psid?: string;
  name_complet?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_pic?: string | null;
  locale?: string | null;
  timezone?: number | null;
  gender?: string | null;
  is_subscribed?: boolean;
  unsubscribed_at?: string | null;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  last_interaction?: string | null;
  total_messages_received?: number;
  total_messages_sent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WelcomeMessage {
  id: string;
  is_enabled: boolean;
  message_type: string;
  text_content: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  buttons: unknown[];
  messenger_payload: unknown;
  created_at: string;
  updated_at: string;
}

export interface Response {
  id: string;
  name: string;
  is_enabled: boolean;
  trigger_type: string;
  trigger_keywords: string[];
  trigger_postback: string | null;
  message_type: string;
  text_content: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  buttons: unknown[];
  messenger_payload: unknown;
  times_triggered: number;
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  trigger_on: string;
  trigger_tag: string | null;
  total_subscribers: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

export interface SequenceMessage {
  id: string;
  sequence_id: string;
  day: number;
  order_in_day: number;
  delay_hours: number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  buttons: unknown[];
  messenger_payload: unknown;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  created_at: string;
  updated_at: string;
}

export interface Broadcast {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  target_all: boolean;
  target_tags: string[];
  target_segments: Record<string, unknown>;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastMessage {
  id: string;
  broadcast_id: string;
  order_position: number;
  send_time: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  buttons: unknown[];
  messenger_payload: unknown;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  created_at: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  flow_data: unknown;
  total_triggered: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// MESSAGE STATS HOOK (from messages table)
// ============================================
export interface MessageStats {
  sent_count: number;
  delivered_count: number;
  read_count: number;
}

export function useMessageStats(sourceType: 'welcome' | 'response' | 'sequence' | 'broadcast', sourceId?: string) {
  const [stats, setStats] = useState<MessageStats>({ sent_count: 0, delivered_count: 0, read_count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!sourceId) {
      setStats({ sent_count: 0, delivered_count: 0, read_count: 0 });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get stats directly from the messages table
      const { data, error } = await supabase
        .from('messages')
        .select('sent_count, delivered_count, read_count')
        .eq('id', sourceId)
        .maybeSingle();
      
      if (error) throw error;
      
      setStats({
        sent_count: data?.sent_count || 0,
        delivered_count: data?.delivered_count || 0,
        read_count: data?.read_count || 0
      });
    } catch (err) {
      console.error('Error fetching message stats:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// ============================================
// BUTTON CLICKS STATS HOOK (from messages table)
// ============================================
export interface ButtonClickStats {
  button_title: string;
  click_count: number;
  payload?: string;
}

export interface ButtonClicksData {
  total_clicks: number;
  buttons: ButtonClickStats[];
}

export function useButtonClicks(sourceType: 'welcome' | 'response' | 'sequence' | 'broadcast', sourceId?: string) {
  const [data, setData] = useState<ButtonClicksData>({ total_clicks: 0, buttons: [] });
  const [loading, setLoading] = useState(true);

  const fetchClicks = useCallback(async () => {
    if (!sourceId) {
      setData({ total_clicks: 0, buttons: [] });
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get clicked_count from messages table
      const { data: message, error } = await supabase
        .from('messages')
        .select('clicked_count, messenger_payload')
        .eq('id', sourceId)
        .maybeSingle();
      
      if (error) throw error;
      
      const totalClicks = message?.clicked_count || 0;
      
      // Extract button titles from messenger_payload if available
      const buttons: ButtonClickStats[] = [];
      const payload = message?.messenger_payload;
      if (payload?.message?.attachment?.payload?.buttons) {
        payload.message.attachment.payload.buttons.forEach((btn: any) => {
          buttons.push({
            button_title: btn.title || 'Button',
            click_count: Math.round(totalClicks / (payload.message.attachment.payload.buttons.length || 1)),
            payload: btn.payload
          });
        });
      } else if (payload?._message_content?.elements?.[0]?.buttons) {
        payload._message_content.elements[0].buttons.forEach((btn: any) => {
          buttons.push({
            button_title: btn.title || 'Button',
            click_count: Math.round(totalClicks / (payload._message_content.elements[0].buttons.length || 1)),
            payload: btn.payload
          });
        });
      }
      
      setData({
        total_clicks: totalClicks,
        buttons
      });
    } catch (err) {
      console.error('Error fetching button clicks:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  return { data, loading, refetch: fetchClicks };
}

// Hook pour récupérer tous les clics des séquences par message id
export function useAllSequenceClicks() {
  const [clicks, setClicks] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchClicks = useCallback(async () => {
    setLoading(true);
    try {
      // Get clicked_count from messages table for sequence messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, clicked_count')
        .eq('category', 'sequence');
      
      if (error) throw error;
      
      // Map message id to clicked_count
      const clicksMap = new Map<string, number>();
      (messages || []).forEach(msg => {
        if (msg.clicked_count > 0) {
          clicksMap.set(msg.id, msg.clicked_count);
        }
      });
      
      setClicks(clicksMap);
    } catch (err) {
      console.error('Error fetching sequence clicks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  return { clicks, loading, refetch: fetchClicks };
}

// ============================================
// SUBSCRIBERS HOOK
// ============================================
export function useSubscribers(pageId?: string | null, searchTerm?: string) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    console.log('[useSubscribers] Fetching subscribers for pageId:', pageId, 'searchTerm:', searchTerm);
    setLoading(true);
    try {
      // If no pageId, return empty (user has no page selected)
      if (!pageId || pageId === 'demo') {
        console.log('[useSubscribers] No valid pageId, returning empty');
        setSubscribers([]);
        setTotalCount(0);
        setActiveCount(0);
        setSubscribedCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      // Build the data query with optional search
      let dataQuery = supabase
        .from('subscribers')
        .select('*')
        .eq('page_id', pageId);

      // If searching, search in database instead of just filtering loaded data
      if (searchTerm && searchTerm.trim().length >= 2) {
        const search = searchTerm.trim().toLowerCase();
        // Search by name (full_name, name_complet, first_name) or PSID
        dataQuery = dataQuery.or(`full_name.ilike.%${search}%,name_complet.ilike.%${search}%,first_name.ilike.%${search}%,facebook_psid.ilike.%${search}%`);
      }

      // Fetch all counts in parallel for accurate stats (without search filter)
      const [totalResult, activeResult, subscribedResult, dataResult] = await Promise.all([
        // Total count
        supabase
          .from('subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('page_id', pageId),
        // Active count
        supabase
          .from('subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('page_id', pageId)
          .eq('is_active', true),
        // Subscribed count
        supabase
          .from('subscribers')
          .select('id', { count: 'exact', head: true })
          .eq('page_id', pageId)
          .eq('is_subscribed', true),
        // Fetch subscribers with search filter applied
        dataQuery
          .order('subscribed_at', { ascending: false })
          .limit(500)
      ]);

      setTotalCount(totalResult.count || 0);
      setActiveCount(activeResult.count || 0);
      setSubscribedCount(subscribedResult.count || 0);
      
      console.log('[useSubscribers] Response - data:', dataResult.data?.length || 0, 'records, total:', totalResult.count, 'active:', activeResult.count, 'subscribed:', subscribedResult.count);
      
      if (dataResult.error) {
        console.error('[useSubscribers] Query error:', dataResult.error);
        setError(dataResult.error.message);
        return;
      }
      
      setSubscribers(dataResult.data as Subscriber[] || []);
      setError(null);
    } catch (err: any) {
      console.error('[useSubscribers] Exception:', err);
      setError(err?.message || 'Error loading subscribers');
    } finally {
      setLoading(false);
    }
  }, [pageId, searchTerm]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const getStats = () => ({
    total: totalCount,
    active: activeCount,
    inactive: totalCount - activeCount,
    subscribed: subscribedCount,
    unsubscribed: totalCount - subscribedCount,
    loaded: subscribers.length,
  });

  return { subscribers, loading, error, refetch: fetchSubscribers, getStats, totalCount };
}

// ============================================
// WELCOME MESSAGE HOOK
// ============================================
export function useWelcomeMessage() {
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWelcomeMessage = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('welcome_message')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setWelcomeMessage(data as WelcomeMessage | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWelcomeMessage(); }, [fetchWelcomeMessage]);

  const saveWelcomeMessage = async (message: Partial<WelcomeMessage>) => {
    // Toujours chercher d'abord s'il existe un message
    const { data: existing } = await supabase
      .from('welcome_message')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existing?.id) {
      // Update existing record
      const { error } = await supabase
        .from('welcome_message')
        .update(message)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('welcome_message')
        .insert(message);
      if (error) throw error;
    }
    await fetchWelcomeMessage();
  };

  const deleteWelcomeMessage = async () => {
    const { error } = await supabase
      .from('welcome_message')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
    setWelcomeMessage(null);
  };

  return { welcomeMessage, loading, error, refetch: fetchWelcomeMessage, saveWelcomeMessage, deleteWelcomeMessage };
}

// ============================================
// RESPONSES HOOK
// ============================================
export function useResponses() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setResponses((data as Response[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const saveResponse = async (response: Partial<Response>, name: string = "Réponse Standard") => {
    // Check if a response with this name exists
    const { data: existing } = await supabase
      .from('responses')
      .select('id')
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    
    if (existing?.id) {
      // Update existing
      const { error } = await supabase.from('responses').update(response).eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase.from('responses').insert({ ...response, name });
      if (error) throw error;
    }
    await fetchResponses();
  };

  const createResponse = async (response: Partial<Response>) => {
    const { data, error } = await supabase.from('responses').insert(response).select().single();
    if (error) throw error;
    await fetchResponses();
    return data;
  };

  const updateResponse = async (id: string, updates: Partial<Response>) => {
    const { error } = await supabase.from('responses').update(updates).eq('id', id);
    if (error) throw error;
    await fetchResponses();
  };

  const deleteResponse = async (id: string) => {
    const { error } = await supabase.from('responses').delete().eq('id', id);
    if (error) throw error;
    await fetchResponses();
  };

  return { responses, loading, error, refetch: fetchResponses, createResponse, updateResponse, deleteResponse, saveResponse };
}

// ============================================
// SEQUENCES HOOK
// ============================================
export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSequences((data as Sequence[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const saveSequence = async (sequence: Partial<Sequence>, name: string = "Séquence principale") => {
    // Check if a sequence with this name exists
    const { data: existing } = await supabase
      .from('sequences')
      .select('id')
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    
    if (existing?.id) {
      // Update existing
      const { error } = await supabase.from('sequences').update(sequence).eq('id', existing.id);
      if (error) throw error;
      return existing.id;
    } else {
      // Insert new
      const { data, error } = await supabase.from('sequences').insert({ ...sequence, name }).select().single();
      if (error) throw error;
      await fetchSequences();
      return data?.id;
    }
  };

  const createSequence = async (sequence: Partial<Sequence>) => {
    const { data, error } = await supabase.from('sequences').insert(sequence).select().single();
    if (error) throw error;
    await fetchSequences();
    return data;
  };

  const updateSequence = async (id: string, updates: Partial<Sequence>) => {
    const { error } = await supabase.from('sequences').update(updates).eq('id', id);
    if (error) throw error;
    await fetchSequences();
  };

  return { sequences, loading, error, refetch: fetchSequences, createSequence, updateSequence, saveSequence };
}

// ============================================
// SEQUENCE MESSAGES HOOK (All messages without requiring sequenceId)
// ============================================
export function useAllSequenceMessages() {
  const [messages, setMessages] = useState<SequenceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sequence_messages')
        .select('*')
        .order('day', { ascending: true })
        .order('order_in_day', { ascending: true });
      
      if (error) throw error;
      setMessages((data as SequenceMessage[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const saveMessage = async (message: Partial<SequenceMessage>, day: number, orderInDay: number) => {
    // Check if message exists for this day and order
    const { data: existing } = await supabase
      .from('sequence_messages')
      .select('id')
      .eq('day', day)
      .eq('order_in_day', orderInDay)
      .limit(1)
      .maybeSingle();
    
    if (existing?.id) {
      const { error } = await supabase.from('sequence_messages').update(message).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('sequence_messages').insert({ ...message, day, order_in_day: orderInDay });
      if (error) throw error;
    }
    await fetchMessages();
  };

  const deleteMessage = async (day: number, orderInDay: number) => {
    const { error } = await supabase
      .from('sequence_messages')
      .delete()
      .eq('day', day)
      .eq('order_in_day', orderInDay);
    if (error) throw error;
    await fetchMessages();
  };

  const deleteAllMessages = async () => {
    const { error } = await supabase
      .from('sequence_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    setMessages([]);
  };

  return { messages, loading, error, refetch: fetchMessages, saveMessage, deleteMessage, deleteAllMessages };
}

// ============================================
// SEQUENCE MESSAGES HOOK (with sequenceId - legacy)
// ============================================
export function useSequenceMessages(sequenceId?: string) {
  const [messages, setMessages] = useState<SequenceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!sequenceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sequence_messages')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('day', { ascending: true })
        .order('order_in_day', { ascending: true });
      
      if (error) throw error;
      setMessages((data as SequenceMessage[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const saveMessage = async (message: Partial<SequenceMessage>) => {
    if (message.id) {
      const { error } = await supabase.from('sequence_messages').update(message).eq('id', message.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('sequence_messages').insert(message);
      if (error) throw error;
    }
    await fetchMessages();
  };

  return { messages, loading, error, refetch: fetchMessages, saveMessage };
}

// ============================================
// BROADCASTS HOOK
// ============================================
export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBroadcasts((data as Broadcast[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const createBroadcast = async (broadcast: Partial<Broadcast>) => {
    const { data, error } = await supabase.from('broadcasts').insert(broadcast).select().single();
    if (error) throw error;
    await fetchBroadcasts();
    return data;
  };

  const updateBroadcast = async (id: string, updates: Partial<Broadcast>) => {
    const { error } = await supabase.from('broadcasts').update(updates).eq('id', id);
    if (error) throw error;
    await fetchBroadcasts();
  };

  const deleteBroadcast = async (id: string) => {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) throw error;
    await fetchBroadcasts();
  };

  return { broadcasts, loading, error, refetch: fetchBroadcasts, createBroadcast, updateBroadcast, deleteBroadcast };
}

// ============================================
// BROADCAST MESSAGES HOOK
// ============================================
export function useBroadcastMessages(broadcastId?: string) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!broadcastId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      setMessages((data as BroadcastMessage[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [broadcastId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const saveMessage = async (message: Partial<BroadcastMessage>) => {
    if (message.id) {
      await supabase.from('broadcast_messages').update(message).eq('id', message.id);
    } else {
      await supabase.from('broadcast_messages').insert(message);
    }
    await fetchMessages();
  };

  return { messages, loading, refetch: fetchMessages, saveMessage };
}

// ============================================
// FLOWS HOOK
// ============================================
export function useFlows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFlows((data as Flow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const createFlow = async (flow: Partial<Flow>) => {
    const { data, error } = await supabase.from('flows').insert(flow).select().single();
    if (error) throw error;
    await fetchFlows();
    return data;
  };

  const updateFlow = async (id: string, updates: Partial<Flow>) => {
    const { error } = await supabase.from('flows').update(updates).eq('id', id);
    if (error) throw error;
    await fetchFlows();
  };

  return { flows, loading, error, refetch: fetchFlows, createFlow, updateFlow };
}

// ============================================
// RECENT ACTIVITY HOOK (for Live Activity Feed with page_id filtering)
// Uses subscribers and messages tables (no message_logs/button_clicks)
// ============================================
export interface RecentActivity {
  id: string;
  type: "subscriber" | "message_sent" | "message_delivered" | "message_read" | "button_click" | "error" | "success";
  title: string;
  timestamp: Date;
}

export function useRecentActivity(pageId?: string | null, limit: number = 15) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasPage = pageId && pageId !== 'demo';
      
      // Build queries with page filtering - only use subscribers and messages tables
      let subscribersQuery = supabase
        .from('subscribers')
        .select('id, full_name, first_name, created_at, page_id')
        .order('created_at', { ascending: false })
        .limit(15);
      
      // Get recently updated messages with activity
      let messagesQuery = supabase
        .from('messages')
        .select('id, name, category, sent_count, delivered_count, read_count, clicked_count, updated_at')
        .gt('sent_count', 0)
        .order('updated_at', { ascending: false })
        .limit(15);
      
      if (hasPage) {
        subscribersQuery = subscribersQuery.eq('page_id', pageId);
        // For messages, we'd need to filter by page_configs but for simplicity, get all
      }
      
      // Fetch recent data in parallel
      const [subscribersRes, messagesRes] = await Promise.all([
        subscribersQuery,
        messagesQuery,
      ]);

      const allActivities: RecentActivity[] = [];

      // Process subscribers
      (subscribersRes.data || []).forEach(sub => {
        const name = sub.full_name || sub.first_name || 'Someone';
        allActivities.push({
          id: `sub-${sub.id}`,
          type: 'subscriber',
          title: `${name} joined as subscriber`,
          timestamp: new Date(sub.created_at),
        });
      });

      // Process messages - show recent message activity based on counts
      (messagesRes.data || []).forEach(msg => {
        const categoryLabel = {
          'welcome': 'Welcome message',
          'response': 'Response',
          'sequence': 'Sequence message',
          'broadcast': 'Broadcast',
          'standard': 'Standard message',
        }[msg.category] || 'Message';

        const msgName = msg.name || categoryLabel;

        // Add activity entries based on counts
        if (msg.sent_count > 0) {
          allActivities.push({
            id: `sent-${msg.id}`,
            type: 'message_sent',
            title: `${msgName} sent (${msg.sent_count}x)`,
            timestamp: new Date(msg.updated_at),
          });
        }
        if (msg.clicked_count > 0) {
          allActivities.push({
            id: `click-${msg.id}`,
            type: 'button_click',
            title: `${msgName} clicked (${msg.clicked_count}x)`,
            timestamp: new Date(msg.updated_at),
          });
        }
      });

      // Sort by timestamp descending and limit
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, limit));
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [pageId, limit]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // Set up polling since PostgREST doesn't support realtime
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivity();
    }, 30000); // Refresh every 30 seconds

    // Stub for realtime channel compatibility
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscribers' }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchActivity]);

  return { activities, loading, error, refetch: fetchActivity };
}

// ============================================
// DASHBOARD STATS HOOK (with page_id filtering)
// ============================================
export interface DashboardStats {
  // Subscribers
  totalSubscribers: number;
  activeSubscribers: number;
  subscribedCount: number;
  unsubscribedCount: number;
  newSubscribersToday: number;
  // Messages
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesRead: number;
  totalButtonClicks: number;
  // Rates
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  // Configuration (page-specific)
  welcomeMessageEnabled: boolean;
  responsesCount: number;
  sequenceMessagesCount: number;
  broadcastsCount: number;
}

export function useDashboardStats(pageId?: string | null) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    subscribedCount: 0,
    unsubscribedCount: 0,
    newSubscribersToday: 0,
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    totalMessagesRead: 0,
    totalButtonClicks: 0,
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    welcomeMessageEnabled: false,
    responsesCount: 0,
    sequenceMessagesCount: 0,
    broadcastsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Build queries based on whether we have a pageId
      const hasPage = pageId && pageId !== 'demo';

      // ========================================
      // STATISTICS FROM PAGES TABLE (PRIMARY SOURCE)
      // ========================================
      // The pages table contains aggregated statistics:
      // total_sent, total_delivered, total_read, total_clicks, total_subscribers
      
      let pageStatsQuery = supabase.from('pages').select('id, total_sent, total_delivered, total_read, total_clicks, total_subscribers');
      if (hasPage) {
        pageStatsQuery = pageStatsQuery.eq('id', pageId);
      }

      // Subscribers - use COUNT queries for totals (much faster than loading all rows)
      let totalSubscribersQuery = supabase.from('subscribers').select('id', { count: 'exact', head: true });
      let activeSubscribersQuery = supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_subscribed', true);
      let subscribedQuery = supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('is_subscribed', true);
      let unsubscribedQuery = supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('is_subscribed', false);
      let newTodayQuery = supabase.from('subscribers').select('id', { count: 'exact', head: true }).gte('created_at', todayISO);
      
      if (hasPage) {
        totalSubscribersQuery = totalSubscribersQuery.eq('page_id', pageId);
        activeSubscribersQuery = activeSubscribersQuery.eq('page_id', pageId);
        subscribedQuery = subscribedQuery.eq('page_id', pageId);
        unsubscribedQuery = unsubscribedQuery.eq('page_id', pageId);
        newTodayQuery = newTodayQuery.eq('page_id', pageId);
      }

      // Page configs query - filter by page_id for welcome message
      let welcomeConfigQuery = supabase.from('page_configs')
        .select('id, category, is_enabled')
        .eq('category', 'welcome')
        .eq('is_enabled', true);
      if (hasPage) {
        welcomeConfigQuery = welcomeConfigQuery.eq('page_id', pageId);
      }

      // Page configs count by category - filter by page_id
      let responseConfigsQuery = supabase.from('page_configs').select('id').eq('category', 'response');
      let sequenceConfigsQuery = supabase.from('page_configs').select('id').eq('category', 'sequence');
      let broadcastConfigsQuery = supabase.from('page_configs').select('id').eq('category', 'broadcast');
      
      if (hasPage) {
        responseConfigsQuery = responseConfigsQuery.eq('page_id', pageId);
        sequenceConfigsQuery = sequenceConfigsQuery.eq('page_id', pageId);
        broadcastConfigsQuery = broadcastConfigsQuery.eq('page_id', pageId);
      }

      // Fetch all data in parallel with individual error handling
      const results = await Promise.allSettled([
        pageStatsQuery,             // 0: page statistics from pages table
        totalSubscribersQuery,      // 1: total count
        activeSubscribersQuery,     // 2: active count
        subscribedQuery,            // 3: subscribed count
        unsubscribedQuery,          // 4: unsubscribed count
        newTodayQuery,              // 5: new today count
        welcomeConfigQuery.limit(1).maybeSingle(), // 6: welcome config
        responseConfigsQuery,       // 7: responses
        sequenceConfigsQuery,       // 8: sequences
        broadcastConfigsQuery,      // 9: broadcasts
      ]);

      // Extract page statistics from pages table
      const pageStatsRes = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: null };
      const pagesData = (pageStatsRes.data || []) as { 
        id: string; 
        total_sent: number; 
        total_delivered: number; 
        total_read: number; 
        total_clicks: number; 
        total_subscribers: number; 
      }[];

      // Calculate totals from pages table (sum all pages if no specific page selected)
      const totalMessagesSent = pagesData.reduce((sum, p) => sum + (p.total_sent || 0), 0);
      const totalMessagesDelivered = pagesData.reduce((sum, p) => sum + (p.total_delivered || 0), 0);
      const totalMessagesRead = pagesData.reduce((sum, p) => sum + (p.total_read || 0), 0);
      const totalButtonClicks = pagesData.reduce((sum, p) => sum + (p.total_clicks || 0), 0);

      // Extract subscriber counts with default values for errors
      const totalSubscribersCount = results[1].status === 'fulfilled' ? (results[1].value as any).count || 0 : 0;
      const activeSubscribersCount = results[2].status === 'fulfilled' ? (results[2].value as any).count || 0 : 0;
      const subscribedCountVal = results[3].status === 'fulfilled' ? (results[3].value as any).count || 0 : 0;
      const unsubscribedCountVal = results[4].status === 'fulfilled' ? (results[4].value as any).count || 0 : 0;
      const newSubscribersTodayCount = results[5].status === 'fulfilled' ? (results[5].value as any).count || 0 : 0;
      
      const welcomeRes = results[6].status === 'fulfilled' ? results[6].value : { data: null, error: null };
      const responsesRes = results[7].status === 'fulfilled' ? results[7].value : { data: [], error: null };
      const sequenceMessagesRes = results[8].status === 'fulfilled' ? results[8].value : { data: [], error: null };
      const broadcastsRes = results[9].status === 'fulfilled' ? results[9].value : { data: [], error: null };

      // Subscriber calculations - use counts from queries (optimized)
      const totalSubscribers = totalSubscribersCount;
      const activeSubscribers = activeSubscribersCount;
      const subscribedCount = subscribedCountVal;
      const unsubscribedCount = unsubscribedCountVal;
      const newSubscribersToday = newSubscribersTodayCount;

      // Calculate rates from pages table statistics
      const deliveryRate = totalMessagesSent > 0 ? Math.round((totalMessagesDelivered / totalMessagesSent) * 100) : 0;
      const readRate = totalMessagesDelivered > 0 ? Math.round((totalMessagesRead / totalMessagesDelivered) * 100) : 0;
      const clickRate = totalMessagesRead > 0 ? Math.round((totalButtonClicks / totalMessagesRead) * 100) : 0;

      setStats({
        totalSubscribers,
        activeSubscribers,
        subscribedCount,
        unsubscribedCount,
        newSubscribersToday,
        totalMessagesSent,
        totalMessagesDelivered,
        totalMessagesRead,
        totalButtonClicks,
        deliveryRate,
        readRate,
        clickRate,
        welcomeMessageEnabled: welcomeRes.data?.is_enabled || false,
        responsesCount: Array.isArray(responsesRes.data) ? responsesRes.data.length : 0,
        sequenceMessagesCount: Array.isArray(sequenceMessagesRes.data) ? sequenceMessagesRes.data.length : 0,
        broadcastsCount: Array.isArray(broadcastsRes.data) ? broadcastsRes.data.length : 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// ============================================
// MESSAGES BY TYPE HOOK (from messages table with page_id filtering)
// ============================================
export function useMessagesByType(pageId?: string | null) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hasPage = pageId && pageId !== 'demo';
      
      // Get message sent counts by category from messages table
      let query = supabase.from('messages').select('category, sent_count, user_id');
      if (hasPage) {
        // Filter by page via page_configs
        const { data: configs } = await supabase
          .from('page_configs')
          .select('selected_message_ids')
          .eq('page_id', pageId);
        
        const messageIds = (configs || []).flatMap(c => c.selected_message_ids || []);
        if (messageIds.length > 0) {
          query = query.in('id', messageIds);
        }
      }
      
      const { data: messages, error } = await query;
      
      if (error) throw error;

      // Group by category and sum sent_count
      const typeMap = new Map<string, number>();
      const typeLabels: Record<string, string> = {
        'welcome': 'Welcome',
        'response': 'Responses',
        'sequence': 'Sequence',
        'broadcast': 'Broadcast',
        'standard': 'Standard'
      };

      (messages || []).forEach(msg => {
        const type = msg.category || 'other';
        typeMap.set(type, (typeMap.get(type) || 0) + (msg.sent_count || 0));
      });

      const result = Array.from(typeMap.entries())
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({
          name: typeLabels[type] || type,
          value: count
        }));

      setData(result);
    } catch (err) {
      console.error('Error fetching messages by type:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

// ============================================
// SUBSCRIBERS GROWTH HOOK (with page_id filtering)
// ============================================
export function useSubscribersGrowth(pageId?: string | null) {
  const [data, setData] = useState<{ date: string; total: number; new: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hasPage = pageId && pageId !== 'demo';
      
      let query = supabase.from('subscribers')
        .select('created_at, page_id')
        .order('created_at', { ascending: true });
      
      if (hasPage) {
        query = query.eq('page_id', pageId);
      }
      
      const { data: subscribers, error } = await query;
      
      if (error) throw error;

      // Group by day with English format
      const dayMap = new Map<string, number>();
      
      (subscribers || []).forEach(sub => {
        const date = new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });

      // Create cumulative data
      let cumulative = 0;
      const result = Array.from(dayMap.entries()).map(([date, count]) => {
        cumulative += count;
        return { date, new: count, total: cumulative };
      });

      // If not enough data, add placeholder days for chart
      if (result.length < 2) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const yesterdayStr = yesterday.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        
        if (result.length === 0) {
          setData([
            { date: yesterdayStr, total: 0, new: 0 },
            { date: todayStr, total: 0, new: 0 }
          ]);
        } else {
          const existing = result[0];
          setData([
            { date: yesterdayStr, total: 0, new: 0 },
            existing
          ]);
        }
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching subscribers growth:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
