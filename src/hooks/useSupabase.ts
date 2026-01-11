import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types basés sur la nouvelle structure Supabase
export interface Subscriber {
  id: string;
  facebook_id: string;
  psid: string;
  name_complet: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_pic: string | null;
  locale: string | null;
  timezone: number | null;
  gender: string | null;
  is_active: boolean;
  is_subscribed: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  last_interaction: string | null;
  total_messages_received: number;
  total_messages_sent: number;
  created_at: string;
  updated_at: string;
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
// MESSAGE STATS HOOK (from message_logs)
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
      const { data, error } = await supabase
        .from('message_logs')
        .select('status')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);
      
      if (error) throw error;
      
      const logs = data || [];
      setStats({
        sent_count: logs.length,
        delivered_count: logs.filter(l => l.status === 'delivered' || l.status === 'read').length,
        read_count: logs.filter(l => l.status === 'read').length
      });
    } catch (err) {
      console.error('Error fetching message stats:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// ============================================
// BUTTON CLICKS STATS HOOK
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
      const { data: clicks, error } = await supabase
        .from('button_clicks')
        .select('button_title, payload')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);
      
      if (error) throw error;
      
      const clicksList = clicks || [];
      
      // Grouper par button_title
      const buttonMap = new Map<string, { count: number; payload?: string }>();
      clicksList.forEach(click => {
        const title = click.button_title || 'Unknown';
        const existing = buttonMap.get(title) || { count: 0, payload: click.payload };
        buttonMap.set(title, { count: existing.count + 1, payload: click.payload });
      });
      
      // Convertir en array et trier par nombre de clics
      const buttons: ButtonClickStats[] = Array.from(buttonMap.entries())
        .map(([button_title, { count, payload }]) => ({ button_title, click_count: count, payload }))
        .sort((a, b) => b.click_count - a.click_count);
      
      setData({
        total_clicks: clicksList.length,
        buttons
      });
    } catch (err) {
      console.error('Error fetching button clicks:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  return { data, loading, refetch: fetchClicks };
}

// Hook pour récupérer tous les clics des séquences par source_id
export function useAllSequenceClicks() {
  const [clicks, setClicks] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchClicks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: clicksData, error } = await supabase
        .from('button_clicks')
        .select('source_id')
        .eq('source_type', 'sequence');
      
      if (error) throw error;
      
      // Grouper par source_id et compter
      const clicksMap = new Map<string, number>();
      (clicksData || []).forEach(click => {
        const sourceId = click.source_id || '';
        clicksMap.set(sourceId, (clicksMap.get(sourceId) || 0) + 1);
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
export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      
      if (error) throw error;
      setSubscribers((data as Subscriber[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const getStats = () => ({
    total: subscribers.length,
    active: subscribers.filter(s => s.is_active).length,
    inactive: subscribers.filter(s => !s.is_active).length,
  });

  return { subscribers, loading, error, refetch: fetchSubscribers, getStats };
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
      
      // Build queries with page filtering
      let subscribersQuery = supabase
        .from('subscribers')
        .select('id, name_complet, first_name, created_at, page_id')
        .order('created_at', { ascending: false })
        .limit(10);
      
      let messagesQuery = supabase
        .from('message_logs')
        .select('id, status, source_type, sent_at, delivered_at, read_at, page_id')
        .order('sent_at', { ascending: false })
        .limit(20);
      
      let clicksQuery = supabase
        .from('button_clicks')
        .select('id, button_title, clicked_at, page_id')
        .order('clicked_at', { ascending: false })
        .limit(10);
      
      if (hasPage) {
        subscribersQuery = subscribersQuery.eq('page_id', pageId);
        messagesQuery = messagesQuery.eq('page_id', pageId);
        clicksQuery = clicksQuery.eq('page_id', pageId);
      }
      
      // Fetch recent data in parallel
      const [subscribersRes, messagesRes, clicksRes] = await Promise.all([
        subscribersQuery,
        messagesQuery,
        clicksQuery,
      ]);

      const allActivities: RecentActivity[] = [];

      // Process subscribers
      (subscribersRes.data || []).forEach(sub => {
        const name = sub.name_complet || sub.first_name || 'Someone';
        allActivities.push({
          id: `sub-${sub.id}`,
          type: 'subscriber',
          title: `${name} joined as subscriber`,
          timestamp: new Date(sub.created_at),
        });
      });

      // Process message logs
      (messagesRes.data || []).forEach(msg => {
        const sourceLabel = {
          'welcome': 'Welcome message',
          'response': 'Response',
          'sequence': 'Sequence message',
          'broadcast': 'Broadcast',
          'standard': 'Standard message',
        }[msg.source_type] || 'Message';

        if (msg.read_at) {
          allActivities.push({
            id: `read-${msg.id}`,
            type: 'message_read',
            title: `${sourceLabel} was read`,
            timestamp: new Date(msg.read_at),
          });
        } else if (msg.delivered_at) {
          allActivities.push({
            id: `del-${msg.id}`,
            type: 'message_delivered',
            title: `${sourceLabel} was delivered`,
            timestamp: new Date(msg.delivered_at),
          });
        } else if (msg.sent_at) {
          allActivities.push({
            id: `sent-${msg.id}`,
            type: 'message_sent',
            title: `${sourceLabel} was sent`,
            timestamp: new Date(msg.sent_at),
          });
        }
      });

      // Process button clicks
      (clicksRes.data || []).forEach(click => {
        allActivities.push({
          id: `click-${click.id}`,
          type: 'button_click',
          title: `"${click.button_title || 'Button'}" was clicked`,
          timestamp: new Date(click.clicked_at),
        });
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

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscribers' }, () => {
        fetchActivity();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_logs' }, () => {
        fetchActivity();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_logs' }, () => {
        fetchActivity();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'button_clicks' }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => {
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

      // Subscribers query - filter by page_id if available
      let subscribersQuery = supabase.from('subscribers').select('id, is_active, is_subscribed, created_at, page_id');
      if (hasPage) {
        subscribersQuery = subscribersQuery.eq('page_id', pageId);
      }

      // Message logs query - filter by page_id if available
      let messageLogsQuery = supabase.from('message_logs').select('id, status, sent_at, delivered_at, read_at, page_id');
      if (hasPage) {
        messageLogsQuery = messageLogsQuery.eq('page_id', pageId);
      }

      // Button clicks query - filter by page_id if available
      let buttonClicksQuery = supabase.from('button_clicks').select('id, page_id');
      if (hasPage) {
        buttonClicksQuery = buttonClicksQuery.eq('page_id', pageId);
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
        subscribersQuery,
        messageLogsQuery,
        buttonClicksQuery,
        welcomeConfigQuery.limit(1).maybeSingle(),
        responseConfigsQuery,
        sequenceConfigsQuery,
        broadcastConfigsQuery,
      ]);

      // Extract data with default values for errors
      const subscribersRes = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: null };
      const messagLogsRes = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: null };
      const buttonClicksRes = results[2].status === 'fulfilled' ? results[2].value : { data: [], error: null };
      const welcomeRes = results[3].status === 'fulfilled' ? results[3].value : { data: null, error: null };
      const responsesRes = results[4].status === 'fulfilled' ? results[4].value : { data: [], error: null };
      const sequenceMessagesRes = results[5].status === 'fulfilled' ? results[5].value : { data: [], error: null };
      const broadcastsRes = results[6].status === 'fulfilled' ? results[6].value : { data: [], error: null };

      const subscribers = subscribersRes.data || [];
      const messages = messagLogsRes.data || [];
      const clicks = buttonClicksRes.data || [];

      // Calculations
      const totalSubscribers = subscribers.length;
      const activeSubscribers = subscribers.filter(s => s.is_active && s.is_subscribed).length;
      const newSubscribersToday = subscribers.filter(s => s.created_at >= todayISO).length;

      const totalMessagesSent = messages.length;
      const totalMessagesDelivered = messages.filter(m => m.delivered_at || m.status === 'delivered' || m.status === 'read').length;
      const totalMessagesRead = messages.filter(m => m.read_at || m.status === 'read').length;
      const totalButtonClicks = clicks.length;

      const deliveryRate = totalMessagesSent > 0 ? Math.round((totalMessagesDelivered / totalMessagesSent) * 100) : 0;
      const readRate = totalMessagesDelivered > 0 ? Math.round((totalMessagesRead / totalMessagesDelivered) * 100) : 0;
      const clickRate = totalMessagesRead > 0 ? Math.round((totalButtonClicks / totalMessagesRead) * 100) : 0;

      setStats({
        totalSubscribers,
        activeSubscribers,
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
// ============================================
// MESSAGES BY TYPE HOOK (with page_id filtering)
// ============================================
export function useMessagesByType(pageId?: string | null) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const hasPage = pageId && pageId !== 'demo';
      
      let query = supabase.from('message_logs').select('source_type, page_id');
      if (hasPage) {
        query = query.eq('page_id', pageId);
      }
      
      const { data: messages, error } = await query;
      
      if (error) throw error;

      // Group by source_type
      const typeMap = new Map<string, number>();
      const typeLabels: Record<string, string> = {
        'welcome': 'Welcome',
        'response': 'Responses',
        'sequence': 'Sequence',
        'broadcast': 'Broadcast',
        'standard': 'Standard'
      };

      (messages || []).forEach(msg => {
        const type = msg.source_type || 'other';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      const result = Array.from(typeMap.entries()).map(([type, count]) => ({
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
