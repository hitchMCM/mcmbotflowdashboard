// =====================================================================================
// Types for Unified Message Architecture
// Based on migration: 20260108_unified_message_architecture.sql
// =====================================================================================

// 4 categories: Welcome, Standard Reply (response), Sequence, Broadcast
export type MessageCategory = 'welcome' | 'response' | 'sequence' | 'broadcast';
export type SelectionMode = 'random' | 'fixed';
export type MediaType = 'image' | 'video' | 'audio' | 'file' | null;

// =====================================================================================
// MESSAGES (Global Pool)
// =====================================================================================

export interface Message {
  id: string;
  name: string;
  category: MessageCategory;
  title: string | null;
  subtitle: string | null;
  text_content: string | null;
  image_url: string | null;
  media_url: string | null;
  media_type: MediaType;
  buttons: any[];
  messenger_payload: any | null;
  
  // For sequences (optional metadata, not for scheduling)
  day_number: number | null;
  message_order: number | null;
  default_delay_hours: number;
  
  // Selection & Status
  weight: number;
  is_active: boolean;
  is_global: boolean;
  
  // Statistics
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface MessageInsert {
  id?: string;
  name: string;
  category: MessageCategory;
  title?: string | null;
  subtitle?: string | null;
  text_content?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: MediaType;
  buttons?: any[];
  messenger_payload?: any | null;
  day_number?: number | null;
  message_order?: number | null;
  default_delay_hours?: number;
  weight?: number;
  is_active?: boolean;
  is_global?: boolean;
}

export interface MessageUpdate extends Partial<MessageInsert> {}

// =====================================================================================
// PAGE CONFIGS
// =====================================================================================

export interface PageConfig {
  id: string;
  page_id: string;
  category: MessageCategory;
  name: string;
  
  // Message selection
  selected_message_ids: string[];
  selection_mode: SelectionMode;
  fixed_message_id: string | null;
  
  // Count
  messages_count: number;
  
  // Timing (sequences)
  delay_hours: number[];
  
  // Timing (broadcasts)
  scheduled_time: string | null;
  scheduled_times: string[] | null;
  scheduled_date: string | null;
  
  // Keywords (responses)
  trigger_keywords: string[];
  
  // Status
  is_enabled: boolean;
  times_triggered: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PageConfigInsert {
  page_id: string;
  category: MessageCategory;
  name: string;
  selected_message_ids?: string[];
  selection_mode?: SelectionMode;
  fixed_message_id?: string | null;
  messages_count?: number;
  delay_hours?: number[];
  scheduled_time?: string | null;
  scheduled_times?: string[] | null;
  scheduled_date?: string | null;
  trigger_keywords?: string[];
  is_enabled?: boolean;
}

export interface PageConfigUpdate extends Partial<PageConfigInsert> {}

// =====================================================================================
// VIEWS
// =====================================================================================

export interface PageConfigDetail {
  id: string;
  page_id: string;
  page_name: string;
  category: MessageCategory;
  config_name: string;
  selection_mode: SelectionMode;
  fixed_message_id: string | null;
  fixed_message_name: string | null;
  selected_count: number | null;
  trigger_keywords: string[];
  delay_hours: number[];
  scheduled_time: string | null;
  messages_count: number;
  is_enabled: boolean;
  times_triggered: number;
  created_at: string;
  updated_at: string;
}

export interface MessagesSummary {
  category: MessageCategory;
  total_messages: number;
  active_messages: number;
  global_messages: number;
  total_sent: number;
  total_delivered: number;
  total_read: number;
}

// =====================================================================================
// RPC FUNCTION PARAMETERS
// =====================================================================================

export interface UpsertPageConfigParams {
  p_page_id: string;
  p_category: MessageCategory;
  p_name: string;
  p_selected_message_ids?: string[] | null;
  p_selection_mode?: SelectionMode;
  p_fixed_message_id?: string | null;
  p_trigger_keywords?: string[] | null;
  p_delay_hours?: number[] | null;
  p_scheduled_time?: string | null;
  p_messages_count?: number;
  p_is_enabled?: boolean;
}

// =====================================================================================
// HELPER TYPES
// =====================================================================================

export interface MessageWithStats extends Message {
  usage_count?: number;
  last_used_at?: string | null;
}

export interface PageConfigWithMessages extends PageConfig {
  selected_messages?: Message[];
  fixed_message?: Message | null;
}

// Category display names
export const CATEGORY_LABELS: Record<MessageCategory, string> = {
  welcome: 'Welcome Message',
  response: 'Standard Reply',
  sequence: 'Sequences',
  broadcast: 'Broadcasts',
};

// Category descriptions
export const CATEGORY_DESCRIPTIONS: Record<MessageCategory, string> = {
  welcome: 'Messages sent to new subscribers',
  response: 'Auto-responses triggered by keywords',
  sequence: 'Scheduled follow-up messages',
  broadcast: 'One-time or scheduled mass messages',
};

// Selection mode labels
export const SELECTION_MODE_LABELS: Record<SelectionMode, string> = {
  random: 'Random',
  fixed: 'Fixed',
};

// Selection mode descriptions
export const SELECTION_MODE_DESCRIPTIONS: Record<SelectionMode, string> = {
  random: 'Pick a random message from the selection (weighted)',
  fixed: 'Always use the same specific message',
};
