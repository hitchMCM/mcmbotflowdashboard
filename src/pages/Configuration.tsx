import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Settings2, 
  MessageSquare, 
  Zap, 
  Radio, 
  Save,
  Shuffle,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  MessageCircle,
  Brain,
  Plus,
  X
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePage } from "@/contexts/PageContext";
import { useMessages, usePageConfigs } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCategory, 
  CATEGORY_LABELS, 
  CATEGORY_DESCRIPTIONS,
  Message,
  SelectionMode,
  SELECTION_MODE_LABELS,
  SELECTION_MODE_DESCRIPTIONS
} from "@/types/messages";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 6 categories for trigger configuration
const TRIGGER_CATEGORIES: MessageCategory[] = ['welcome', 'response', 'comment_reply', 'sequence', 'broadcast', 'utility'];

const CATEGORY_ICONS: Record<MessageCategory, React.ElementType> = {
  welcome: MessageSquare,
  response: Zap,
  sequence: Settings2,
  broadcast: Radio,
  comment_reply: MessageCircle,
  utility: Zap,
};

const MODE_ICONS: Record<SelectionMode, React.ElementType> = {
  random: Shuffle,
  fixed: Target,
  ai: Brain,
};

const DEFAULT_AI_PROMPT = `You are a warm, engaging chatbot for a dating/social platform.

CRITICAL RULES:
- Respond in the SAME language the user wrote in (ONE language only!)
- Use the user's first name ONLY if it looks like a real name (not "Good", "there", etc.)
- If the name doesn't look real, use a casual greeting instead ("Hey!" not "Hey Good!")
- Keep responses SHORT (2-3 sentences max)
- Be conversational and warm, NOT overly enthusiastic
- Match the user's energy (if they say "good evening" → calm tone, if "hey!!!" → excited)
- End with invitation + link on NEW LINE

GOOD greetings when name is unclear:
✅ "Hey! How's it going?"
✅ "Hi there! What's up?"
❌ "Hey Good!" (using a word as a name)

Response structure:
1. Greeting (with name only if real, otherwise casual "Hey!")
2. Natural reaction to their message
3. NEW LINE + invitation + plain link`;

interface TriggerConfig {
  category: MessageCategory;
  is_enabled: boolean;
  selection_mode: SelectionMode;
  messages_count: number;
  delay_seconds: number;
  reset_period_hours: number;
  delay_hours: number[];
  scheduled_time: string | null;
  selected_message_ids: string[];
  ai_prompt: string;
  ai_links: string[];
  ai_images: string[];
}

// Small reusable component to add/remove URL items in the AI section
function AiResourceList({
  category,
  field,
  items,
  placeholder,
  onUpdate,
}: {
  category: string;
  field: string;
  items: string[];
  placeholder: string;
  onUpdate: (items: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onUpdate([...items, trimmed]);
      setInputValue("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          onBlur={handleAdd}
          className="text-sm"
        />
        <Button type="button" size="icon" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 text-sm group">
              <span className="flex-1 truncate text-muted-foreground">{item}</span>
              <button
                type="button"
                onClick={() => onUpdate(items.filter((_, i) => i !== idx))}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Configuration() {
  const { currentPage, pages } = usePage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<MessageCategory>("welcome");
  const [saving, setSaving] = useState(false);
  // Use a ref for dirty tracking — immune to React batching / async effect races
  const dirtyRef = useRef<Set<MessageCategory>>(new Set());
  const [, forceUpdate] = useState(0); // used only to trigger re-renders when dirtyRef changes
  const markDirty = (category: MessageCategory) => { dirtyRef.current.add(category); forceUpdate(n => n + 1); };
  const clearDirty = (category: MessageCategory) => { dirtyRef.current.delete(category); forceUpdate(n => n + 1); };
  const clearAllDirty = () => { dirtyRef.current.clear(); forceUpdate(n => n + 1); };
  const isDirty = (category: MessageCategory) => dirtyRef.current.has(category);
  const { timezone, t } = useSettings();
  
  // Clone configuration dialog state
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneFromPageId, setCloneFromPageId] = useState<string>("");
  const [cloning, setCloning] = useState(false);
  
  // Timezone offset mapping (in hours from UTC)
  const timezoneOffsets: Record<string, number> = {
    'utc': 0,
    'paris': 1,
    'madrid': 1,
    'casablanca': 1,
    'dubai': 4
  };
  
  const getTimezoneOffset = () => timezoneOffsets[timezone] || 0;
  
  // Store original configs for change detection
  const originalConfigsRef = useRef<string>("");
  
  // Load messages for each category
  const welcomeMessages = useMessages('welcome');
  const responseMessages = useMessages('response');
  const sequenceMessages = useMessages('sequence');
  const broadcastMessages = useMessages('broadcast');
  const commentReplyMessages = useMessages('comment_reply');
  const utilityMessagesRaw = useMessages('utility');
  
  // Load page configs - pass the pageId
  console.log('[Configuration] Current page for usePageConfigs:', currentPage?.id, currentPage?.name);
  const { 
    configs, 
    loading: configsLoading, 
    upsertConfig,
    addMessage,
    removeMessage,
    setMode 
  } = usePageConfigs(currentPage?.id || null);
  
  // Local state for editing
  const [triggerConfigs, setTriggerConfigs] = useState<Record<MessageCategory, TriggerConfig>>({
    welcome: { category: 'welcome', is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0], scheduled_time: null, selected_message_ids: [], ai_prompt: '', ai_links: [], ai_images: [] },
    response: { category: 'response', is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0], scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
    comment_reply: { category: 'comment_reply', is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0], scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
    sequence: { category: 'sequence', is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [1440], scheduled_time: null, selected_message_ids: [], ai_prompt: '', ai_links: [], ai_images: [] },
    broadcast: { category: 'broadcast', is_enabled: true, selection_mode: 'fixed', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0], scheduled_time: null, selected_message_ids: [], ai_prompt: '', ai_links: [], ai_images: [] },
    utility: { category: 'utility', is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [540], scheduled_time: null, selected_message_ids: [], ai_prompt: '', ai_links: [], ai_images: [] },
  });

  // Get messages for current category
  const getMessagesForCategory = (category: MessageCategory): Message[] => {
    switch (category) {
      case 'welcome': return welcomeMessages.messages;
      case 'response': return responseMessages.messages;
      case 'comment_reply': return commentReplyMessages.messages;
      case 'sequence': return sequenceMessages.messages;
      case 'broadcast': return broadcastMessages.messages;
      case 'utility': return utilityMessagesRaw.messages.filter((m: any) => {
        const payload = m.messenger_payload as any;
        // Only show templates scoped to the current page and approved by Meta
        if (payload?._page_id !== currentPage?.id) return false;
        if (payload?._meta_template?.template_status !== 'APPROVED') return false;
        return true;
      });
      default: return [];
    }
  };

  // Reset original ref when page changes so stale change-tracking is cleared
  useEffect(() => {
    originalConfigsRef.current = "";
    clearAllDirty();
  }, [currentPage?.id]);

  // Load configs into local state when they arrive — ONLY on first load per page
  useEffect(() => {
    // If originalConfigsRef is already set, data was already loaded for this page.
    // Don't overwrite — the user may have unsaved edits in triggerConfigs.
    if (originalConfigsRef.current) return;

    if (configs.length > 0) {
      // Build the new config map from DB data — start from fixed defaults
      const newConfigs: Record<MessageCategory, TriggerConfig> = {
        welcome:       { category: 'welcome',       is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        response:      { category: 'response',      is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
        comment_reply: { category: 'comment_reply', is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
        sequence:      { category: 'sequence',      is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [1440], scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        broadcast:     { category: 'broadcast',     is_enabled: true, selection_mode: 'fixed',  messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        utility:       { category: 'utility',       is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [540],  scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
      };
      configs.forEach(cfg => {
        if (TRIGGER_CATEGORIES.includes(cfg.category)) {
          newConfigs[cfg.category] = {
            category: cfg.category,
            is_enabled: cfg.is_enabled,
            selection_mode: (cfg.selection_mode as SelectionMode) || 'random',
            messages_count: cfg.messages_count ?? 0,
            delay_seconds: (cfg.category === 'response' || cfg.category === 'comment_reply')
              ? (cfg.delay_seconds ?? cfg.delay_hours?.[0] ?? 0)
              : (cfg.delay_seconds ?? 0),
            reset_period_hours: (cfg.category === 'response' || cfg.category === 'comment_reply')
              ? (cfg.reset_period_hours ?? cfg.delay_hours?.[1] ?? 24)
              : (cfg.reset_period_hours ?? 24),
            delay_hours: cfg.delay_hours || [0],
            scheduled_time: cfg.scheduled_time || null,
            selected_message_ids: cfg.selected_message_ids || [],
            ai_prompt: (cfg as any).ai_prompt || DEFAULT_AI_PROMPT,
            ai_links: (cfg as any).ai_links || [],
            ai_images: (cfg as any).ai_images || [],
          };
        }
      });

      setTriggerConfigs(newConfigs);
      originalConfigsRef.current = JSON.stringify(newConfigs);
    } else if (!configsLoading && !originalConfigsRef.current) {
      // No configs exist yet - initialize both state and original ref from the same defaults
      const defaultConfigs: Record<MessageCategory, TriggerConfig> = {
        welcome:       { category: 'welcome',       is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        response:      { category: 'response',      is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
        comment_reply: { category: 'comment_reply', is_enabled: true, selection_mode: 'random', messages_count: 0, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: DEFAULT_AI_PROMPT, ai_links: [], ai_images: [] },
        sequence:      { category: 'sequence',      is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [1440], scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        broadcast:     { category: 'broadcast',     is_enabled: true, selection_mode: 'fixed',  messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [0],    scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
        utility:       { category: 'utility',       is_enabled: true, selection_mode: 'random', messages_count: 1, delay_seconds: 0, reset_period_hours: 24, delay_hours: [540],  scheduled_time: null, selected_message_ids: [], ai_prompt: '',               ai_links: [], ai_images: [] },
      };
      setTriggerConfigs(defaultConfigs);
      originalConfigsRef.current = JSON.stringify(defaultConfigs);
    }
  }, [configs, configsLoading]);

  const updateLocalConfig = (category: MessageCategory, field: keyof TriggerConfig, value: any) => {
    setTriggerConfigs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    markDirty(category);
  };

  const toggleMessageSelection = (category: MessageCategory, messageId: string) => {
    const current = triggerConfigs[category].selected_message_ids;
    const mode = triggerConfigs[category].selection_mode;
    
    if (current.includes(messageId)) {
      // Removing message
      const newSelection = current.filter(id => id !== messageId);
      updateLocalConfig(category, 'selected_message_ids', newSelection);
    } else {
      // Adding message
      let newSelection: string[];
      
      // If mode is 'fixed', only allow 1 message
      if (mode === 'fixed') {
        newSelection = [messageId]; // Replace all with this one
      } else {
        // For 'random' mode, allow multiple
        newSelection = [...current, messageId];
      }
      
      updateLocalConfig(category, 'selected_message_ids', newSelection);
    }
  };

  const handleSave = async (category: MessageCategory) => {
    console.log('[Configuration] handleSave called for category:', category);
    console.log('[Configuration] currentPage:', currentPage);
    
    if (!currentPage?.id) {
      console.error('[Configuration] No currentPage.id available!');
      toast({
        title: "❌ Error",
        description: "No page selected. Please select a page first.",
        variant: "destructive"
      });
      return;
    }
    
    // Skip demo page
    if (currentPage.id === 'demo') {
      console.warn('[Configuration] Demo page detected, cannot save');
      toast({
        title: "⚠️ Demo Mode",
        description: "Cannot save configuration for demo page. Please create a real page first.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      const config = triggerConfigs[category];
      
      console.log('[Configuration] Saving config for', category);
      console.log('[Configuration] Page ID:', currentPage.id);
      console.log('[Configuration] Config:', JSON.stringify(config, null, 2));
      
      // Ensure delay_hours is appropriate for each category
      let delayHoursToSave: number[];
      
      if (category === 'welcome') {
        // Welcome sends immediately - no delays needed
        delayHoursToSave = [0];
      } else if (category === 'response' || category === 'comment_reply') {
        // Encode delay_seconds in [0] and reset_period_hours in [1]
        // delay_hours already known by PostgREST — no schema cache needed
        delayHoursToSave = [config.delay_seconds ?? 0, config.reset_period_hours ?? 24];
      } else if (category === 'sequence') {
        // Sequence uses minutes after subscription
        delayHoursToSave = config.delay_hours.slice(0, config.messages_count);
        // Pad with defaults if shorter (in minutes: 0, 1440, 2880... = 0h, 24h, 48h...)
        while (delayHoursToSave.length < config.messages_count) {
          delayHoursToSave.push(delayHoursToSave.length * 24 * 60);
        }
      } else if (category === 'broadcast' || category === 'utility') {
        // Broadcast/Utility uses daily send times (stored as minutes)
        delayHoursToSave = config.delay_hours.slice(0, config.messages_count);
        // Pad with defaults if shorter
        while (delayHoursToSave.length < config.messages_count) {
          delayHoursToSave.push(540 + delayHoursToSave.length * 180); // 9:00, 12:00, 15:00...
        }
      } else {
        delayHoursToSave = [0];
      }
      
      // For broadcast, convert ALL delay_hours values (minutes from midnight) to TIME format
      let scheduledTimeToSave: string | null = null;
      let scheduledTimesToSave: string[] | null = null;
      if ((category === 'broadcast' || category === 'utility') && delayHoursToSave.length > 0) {
        // Convert all times to TIME format array
        scheduledTimesToSave = delayHoursToSave.map(m => {
          const hours = Math.floor(m / 60);
          const minutes = m % 60;
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        });
        // Keep first time in scheduled_time for backward compatibility
        scheduledTimeToSave = scheduledTimesToSave[0];
      }
      
      const configToSave: any = {
        page_id: currentPage.id,
        category: category,
        name: `${CATEGORY_LABELS[category]} Config`,
        is_enabled: config.is_enabled,
        selection_mode: config.selection_mode,
        messages_count: config.messages_count,
        delay_seconds: config.delay_seconds,
        reset_period_hours: config.reset_period_hours,
        delay_hours: delayHoursToSave,
        scheduled_time: (category === 'broadcast' || category === 'utility') ? scheduledTimeToSave : config.scheduled_time,
        scheduled_times: (category === 'broadcast' || category === 'utility') ? scheduledTimesToSave : null,
        selected_message_ids: config.selection_mode === 'ai' ? [] : config.selected_message_ids,
        ai_prompt: config.ai_prompt || null,
        ai_links: config.ai_links.length > 0 ? config.ai_links : null,
        ai_images: config.ai_images.length > 0 ? config.ai_images : null,
      };
      
      console.log('[Configuration] Config to save:', JSON.stringify(configToSave, null, 2));
      
      const result = await upsertConfig(configToSave);
      
      console.log('[Configuration] Save result:', result);
      
      // Update original reference after successful save
      const currentOriginal = originalConfigsRef.current ? JSON.parse(originalConfigsRef.current) : {};
      currentOriginal[category] = { ...triggerConfigs[category] };
      originalConfigsRef.current = JSON.stringify(currentOriginal);
      
      clearDirty(category);
      
      toast({
        title: "✅ Configuration saved!",
        description: `${CATEGORY_LABELS[category]} trigger settings updated.`
      });
    } catch (error: any) {
      console.error('[Configuration] Save error:', error);
      console.error('[Configuration] Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.details || error?.hint || JSON.stringify(error) || "Unable to save configuration.";
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle cloning configuration from another page
  const handleCloneConfiguration = async () => {
    if (!currentPage?.id || !cloneFromPageId) {
      toast({
        title: "❌ Error",
        description: "Please select a page to clone from",
        variant: "destructive"
      });
      return;
    }

    if (currentPage.id === cloneFromPageId) {
      toast({
        title: "❌ Error",
        description: "Cannot clone from the same page",
        variant: "destructive"
      });
      return;
    }

    setCloning(true);
    try {
      // Get existing page_configs from source page
      const { data: sourceConfigs, error: configError } = await supabase
        .from('page_configs')
        .select('*')
        .eq('page_id', cloneFromPageId);

      if (configError) throw configError;

      if (!sourceConfigs || sourceConfigs.length === 0) {
        toast({
          title: "⚠️ No Configuration",
          description: "The selected page has no configuration to clone.",
          variant: "destructive"
        });
        setCloning(false);
        return;
      }

      // Delete existing configs for current page
      await supabase
        .from('page_configs')
        .delete()
        .eq('page_id', currentPage.id);

      // Clone configs to current page - use spread operator to create new arrays (deep copy)
      console.log('[Configuration] Cloning from page:', cloneFromPageId);
      console.log('[Configuration] Cloning TO page:', currentPage.id, currentPage.name);
      console.log('[Configuration] Source configs:', sourceConfigs.map(c => ({ id: c.id, category: c.category, selected_message_ids: c.selected_message_ids })));
      
      const newConfigs = sourceConfigs.map(config => ({
        page_id: currentPage.id,
        category: config.category,
        name: config.name,
        selected_message_ids: [...(config.selected_message_ids || [])],
        selection_mode: config.selection_mode,
        fixed_message_id: config.fixed_message_id,
        messages_count: config.messages_count,
        delay_hours: [...(config.delay_hours || [])],
        scheduled_time: config.scheduled_time,
        scheduled_times: config.scheduled_times ? [...config.scheduled_times] : null,
        scheduled_date: config.scheduled_date,
        trigger_keywords: [...(config.trigger_keywords || [])],
        is_enabled: config.is_enabled
      }));
      
      console.log('[Configuration] New configs to insert:', newConfigs.map(c => ({ page_id: c.page_id, category: c.category, selected_message_ids: c.selected_message_ids })));

      const { data: insertedData, error: insertError } = await supabase
        .from('page_configs')
        .insert(newConfigs)
        .select('id, page_id, category, selected_message_ids');

      if (insertError) throw insertError;
      
      console.log('[Configuration] INSERT RESULT - configs created:', insertedData);

      // Find source page name for success message
      const sourcePage = pages.find(p => p.id === cloneFromPageId);
      toast({
        title: "✅ Configuration cloned!",
        description: `${newConfigs.length} configuration(s) cloned from "${sourcePage?.name || 'source page'}"`
      });

      setShowCloneDialog(false);
      setCloneFromPageId("");
      
      // IMPORTANT: Force save current page ID to localStorage before reload
      // This prevents the page from switching back to the source page
      localStorage.setItem('current_page_id', currentPage.id);
      console.log('[Configuration] Clone complete. Saved current page ID:', currentPage.id);
      
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error: any) {
      console.error('Clone error:', error);
      const errorMessage = error?.message || error?.details || "Failed to clone configuration";
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCloning(false);
    }
  };

  const isLoading = configsLoading || welcomeMessages.loading || responseMessages.loading || sequenceMessages.loading || broadcastMessages.loading || utilityMessagesRaw.loading;

  if (isLoading) {
    return (
      <DashboardLayout pageName="Configuration">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageName="Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trigger Configuration</h1>
            <p className="text-muted-foreground">
              Configure when and how messages are sent for {currentPage?.name || "your page"}
            </p>
          </div>
          {/* Clone from another page button */}
          {pages.filter(p => p.id !== currentPage?.id).length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowCloneDialog(true)}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Clone from Page
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MessageCategory)}>
          <TabsList className="grid w-full grid-cols-6">
            {TRIGGER_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              const config = triggerConfigs[cat];
              return (
                <TabsTrigger key={cat} value={cat} className="flex items-center gap-1 px-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{CATEGORY_LABELS[cat]}</span>
                  {config.is_enabled && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      ON
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TRIGGER_CATEGORIES.map(category => {
            const config = triggerConfigs[category];
            const messages = getMessagesForCategory(category);
            const Icon = CATEGORY_ICONS[category];
            
            return (
              <TabsContent key={category} value={category} className="mt-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left: Trigger Settings */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle>{CATEGORY_LABELS[category]} Trigger</CardTitle>
                        </div>
                        <Switch
                          checked={config.is_enabled}
                          onCheckedChange={(v) => updateLocalConfig(category, 'is_enabled', v)}
                        />
                      </div>
                      <CardDescription>{CATEGORY_DESCRIPTIONS[category]}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Selection Mode */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Selection Mode</Label>
                        <RadioGroup
                          value={config.selection_mode}
                          onValueChange={(v) => updateLocalConfig(category, 'selection_mode', v as SelectionMode)}
                          className="space-y-2"
                        >
                          {(
                            (category === 'response' || category === 'comment_reply')
                              ? (['random', 'fixed', 'ai'] as SelectionMode[])
                              : (['random', 'fixed'] as SelectionMode[])
                          ).map(mode => {
                            const ModeIcon = MODE_ICONS[mode];
                            return (
                              <div key={mode} className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                                mode === 'ai'
                                  ? "hover:bg-purple-500/10 border-purple-500/30"
                                  : "hover:bg-muted/50"
                              )}>
                                <RadioGroupItem value={mode} id={`${category}-${mode}`} />
                                <ModeIcon className={cn("h-4 w-4", mode === 'ai' ? "text-purple-500" : "text-muted-foreground")} />
                                <div className="flex-1">
                                  <Label htmlFor={`${category}-${mode}`} className={cn("cursor-pointer font-medium", mode === 'ai' && "text-purple-600 dark:text-purple-400")}>
                                    {SELECTION_MODE_LABELS[mode]}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {SELECTION_MODE_DESCRIPTIONS[mode]}
                                  </p>
                                </div>
                                {mode === 'ai' && (
                                  <Badge variant="outline" className="text-purple-600 border-purple-400 text-[10px]">NEW</Badge>
                                )}
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      {/* AI Settings — shown when mode is 'ai' for response/comment_reply */}
                      {(category === 'response' || category === 'comment_reply') && config.selection_mode === 'ai' && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Brain className="h-4 w-4 text-purple-500" />
                              <Label className="text-sm font-medium">AI Configuration</Label>
                            </div>

                            {/* AI System Prompt */}
                            <div className="space-y-2">
                              <Label htmlFor={`${category}-ai-prompt`} className="text-xs font-medium text-muted-foreground uppercase">Instructions</Label>
                              <Textarea
                                id={`${category}-ai-prompt`}
                                placeholder={DEFAULT_AI_PROMPT}
                                value={config.ai_prompt || ''}
                                onChange={(e) => updateLocalConfig(category, 'ai_prompt', e.target.value)}
                                rows={5}
                                className="resize-none text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                Describe how the AI should respond. The user's message will be included automatically.
                              </p>
                            </div>

                            {/* AI Links */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground uppercase">Links to include in replies</Label>
                              <p className="text-xs text-muted-foreground">
                                Add URLs the AI can reference or share in its responses (website, booking page, shop…).
                              </p>
                              <AiResourceList
                                category={category}
                                field="ai_links"
                                items={config.ai_links}
                                placeholder="https://example.com/booking"
                                onUpdate={(items) => updateLocalConfig(category, 'ai_links', items)}
                              />
                            </div>

                            {/* AI Images */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground uppercase">Image links</Label>
                              <p className="text-xs text-muted-foreground">
                                Add image URLs the AI can suggest or attach (product photos, menus, flyers…).
                              </p>
                              <AiResourceList
                                category={category}
                                field="ai_images"
                                items={config.ai_images}
                                placeholder="https://example.com/photo.jpg"
                                onUpdate={(items) => updateLocalConfig(category, 'ai_images', items)}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      {/* Response Sending Configuration - Delay + Max Replies */}
                      {(category === 'response' || category === 'comment_reply') && (
                        <>
                          <div className="space-y-4">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="h-4 w-4" />
                              Delay Before Responding (seconds)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Wait this long before sending a reply to a subscriber message.
                            </p>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <Input
                                type="number"
                                min={0}
                                max={3600}
                                value={config.delay_seconds}
                                onChange={(e) => updateLocalConfig(category, 'delay_seconds', Math.min(3600, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">seconds</span>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                              <AlertCircle className="h-4 w-4" />
                              Max Messages Per Period
                            </Label>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <Switch
                                checked={config.messages_count === 0}
                                onCheckedChange={(checked) => updateLocalConfig(category, 'messages_count', checked ? 0 : 5)}
                              />
                              <span className="text-sm font-medium">
                                {config.messages_count === 0 ? 'Unlimited (∞)' : 'Limited'}
                              </span>
                            </div>
                            {config.messages_count !== 0 && (
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={config.messages_count}
                                onChange={(e) => updateLocalConfig(category, 'messages_count', Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                              />
                            )}
                            <p className="text-xs text-muted-foreground">
                              {config.messages_count === 0
                                ? 'No limit on the number of automatic replies per subscriber.'
                                : 'Limit the number of automatic replies sent to a single subscriber per reset period.'}
                            </p>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="h-4 w-4" />
                              Reset Period (hours)
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={720}
                              value={config.reset_period_hours}
                              onChange={(e) => updateLocalConfig(category, 'reset_period_hours', Math.min(720, Math.max(1, parseInt(e.target.value) || 24)))}
                            />
                            <p className="text-xs text-muted-foreground">
                              The message count limit resets after this many hours (default: 24h).
                            </p>
                          </div>
                        </>
                      )}

                      {/* Messages Count - Only for sequence and broadcast */}
                      {(category === 'sequence' || category === 'broadcast' || category === 'utility') && (
                        <div className="space-y-2">
                          <Label>Number of Messages to Send</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={config.messages_count}
                            onChange={(e) => updateLocalConfig(category, 'messages_count', parseInt(e.target.value) || 1)}
                          />
                          <p className="text-xs text-muted-foreground">
                            How many messages to send per trigger
                          </p>
                        </div>
                      )}

                      {/* Sequence Configuration - Hours and Minutes after subscription based on messages_count */}
                      {category === 'sequence' && (
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Time After Subscription
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Configure how long after subscription each message is sent (hours and minutes).
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Array.from({ length: config.messages_count }, (_, index) => {
                              // delay_hours now stores total minutes
                              const totalMinutes = config.delay_hours[index] ?? (index * 24 * 60);
                              const hours = Math.floor(totalMinutes / 60);
                              const minutes = totalMinutes % 60;
                              return (
                                <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                  <Badge variant="outline" className="min-w-[80px] justify-center">
                                    Send #{index + 1}
                                  </Badge>
                                  <span className="flex-1 text-sm text-muted-foreground">
                                    After
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={8760}
                                      value={hours}
                                      onChange={(e) => {
                                        const newDelays = [...config.delay_hours];
                                        // Ensure array is long enough
                                        while (newDelays.length < config.messages_count) {
                                          newDelays.push(newDelays.length * 24 * 60);
                                        }
                                        const newHours = parseInt(e.target.value) || 0;
                                        newDelays[index] = newHours * 60 + minutes;
                                        updateLocalConfig(category, 'delay_hours', newDelays);
                                      }}
                                      className="w-16"
                                    />
                                    <span className="text-xs text-muted-foreground">h</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={59}
                                      value={minutes}
                                      onChange={(e) => {
                                        const newDelays = [...config.delay_hours];
                                        // Ensure array is long enough
                                        while (newDelays.length < config.messages_count) {
                                          newDelays.push(newDelays.length * 24 * 60);
                                        }
                                        const newMinutes = Math.min(59, parseInt(e.target.value) || 0);
                                        newDelays[index] = hours * 60 + newMinutes;
                                        updateLocalConfig(category, 'delay_hours', newDelays);
                                      }}
                                      className="w-16"
                                    />
                                    <span className="text-xs text-muted-foreground">min</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Broadcast Configuration - Daily Time based on messages_count */}
                      {(category === 'broadcast' || category === 'utility') && (
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Daily Send Times
                            <Badge variant="outline" className="ml-2 text-xs">
                              {timezone === 'utc' ? 'UTC' : 
                               timezone === 'paris' ? 'Paris (UTC+1)' :
                               timezone === 'madrid' ? 'Madrid (UTC+1)' :
                               timezone === 'casablanca' ? 'Casablanca (UTC+1)' :
                               timezone === 'dubai' ? 'Dubai (UTC+4)' : 'UTC'}
                            </Badge>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Configure the daily send time for each message slot. Times are in your configured timezone.
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Array.from({ length: config.messages_count }, (_, index) => {
                              // Store times as minutes in delay_hours array (stored in UTC)
                              const storedMinutesUTC = config.delay_hours[index] ?? (540 + index * 180); // Default: 9:00, 12:00, 15:00...
                              // Convert from UTC to user's timezone for display
                              const offsetMinutes = getTimezoneOffset() * 60;
                              let displayMinutes = storedMinutesUTC + offsetMinutes;
                              // Handle day wrap
                              if (displayMinutes < 0) displayMinutes += 1440;
                              if (displayMinutes >= 1440) displayMinutes -= 1440;
                              const hours = Math.floor(displayMinutes / 60);
                              const minutes = displayMinutes % 60;
                              const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                              return (
                                <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                  <Badge variant="outline" className="min-w-[80px] justify-center">
                                    Send #{index + 1}
                                  </Badge>
                                  <span className="flex-1 text-sm text-muted-foreground">
                                    Daily at
                                  </span>
                                  <Input
                                    type="time"
                                    value={timeValue}
                                    onChange={(e) => {
                                      const [h, m] = e.target.value.split(':').map(Number);
                                      // Convert from user's timezone to UTC for storage
                                      const localMinutes = (h * 60) + (m || 0);
                                      const offsetMinutes = getTimezoneOffset() * 60;
                                      let utcMinutes = localMinutes - offsetMinutes;
                                      // Handle day wrap
                                      if (utcMinutes < 0) utcMinutes += 1440;
                                      if (utcMinutes >= 1440) utcMinutes -= 1440;
                                      
                                      const newDelays = [...config.delay_hours];
                                      // Ensure array is long enough
                                      while (newDelays.length < config.messages_count) {
                                        newDelays.push(540 + newDelays.length * 180);
                                      }
                                      newDelays[index] = utcMinutes;
                                      updateLocalConfig(category, 'delay_hours', newDelays);
                                    }}
                                    className="w-28"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Save Button */}
                      <Button 
                        onClick={() => handleSave(category)} 
                        disabled={saving || !isDirty(category)} 
                        className={cn(
                          "w-full transition-all duration-300",
                          isDirty(category) 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30" 
                            : ""
                        )}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : isDirty(category) ? (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Saved
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Right: Message Selection (hidden when AI mode is active) */}
                  {config.selection_mode !== 'ai' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Select Messages</CardTitle>
                      <CardDescription>
                        Choose which messages can be sent ({config.selected_message_ids.length} selected)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">No messages found.</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Create messages in the {CATEGORY_LABELS[category]} page first.
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {messages.map(msg => {
                              const isSelected = config.selected_message_ids.includes(msg.id);
                              return (
                                <div
                                  key={msg.id}
                                  onClick={() => toggleMessageSelection(category, msg.id)}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    isSelected 
                                      ? "border-primary bg-primary/5" 
                                      : "border-border hover:border-muted-foreground/50"
                                  )}
                                >
                                  <div className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                                  )}>
                                    {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{msg.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {msg.text_content || msg.title || "Template message"}
                                    </p>
                                  </div>
                                  <Badge variant={msg.is_active ? "default" : "secondary"} className="text-[10px]">
                                    {msg.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                  ) : (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-lg text-purple-600 dark:text-purple-400">AI Response Active</CardTitle>
                      </div>
                      <CardDescription>
                        Replies will be generated by AI using your system prompt. No pre-written messages are needed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg bg-purple-500/10 p-4 space-y-2">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">How it works</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>When a subscriber sends a message, it is forwarded to the AI model</li>
                          <li>The AI generates a reply following your system prompt instructions</li>
                          <li>The generated reply is sent back to the subscriber automatically</li>
                          <li>The delay and rate-limit settings below still apply</li>
                        </ul>
                      </div>
                      {(config.ai_links.length > 0 || config.ai_images.length > 0) && (
                        <p className="text-xs text-muted-foreground mt-3">
                          <span className="font-medium">{config.ai_links.length}</span> link(s) · <span className="font-medium">{config.ai_images.length}</span> image(s) configured
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  )}
                </div>

                {/* Status Summary */}
                <Card className="mt-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Badge variant={config.is_enabled ? "default" : "secondary"}>
                            {config.is_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mode: <span className={cn("font-medium", config.selection_mode === 'ai' && "text-purple-600 dark:text-purple-400")}>{SELECTION_MODE_LABELS[config.selection_mode]}</span>
                        </div>
                        {(category === 'response' || category === 'comment_reply') && (
                          <>
                            <div className="text-sm text-muted-foreground">
                              Delay: <span className="font-medium">
                                {config.delay_seconds === 0 ? 'Instant' : `${config.delay_seconds}s`}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Max: <span className="font-medium">{config.messages_count === 0 ? '∞' : config.messages_count}</span>
                              <span className="ml-1">/ {config.reset_period_hours}h</span>
                            </div>
                          </>
                        )}
                        {(category === 'sequence' || category === 'broadcast' || category === 'utility') && (
                          <div className="text-sm text-muted-foreground">
                            Send: <span className="font-medium">{config.messages_count} message(s)</span>
                          </div>
                        )}
                        {category === 'sequence' && config.messages_count > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Schedule: <span className="font-medium">
                              {config.delay_hours.slice(0, config.messages_count).slice(0, 3).map(h => `${h}h`).join(', ')}
                              {config.messages_count > 3 && '...'}
                            </span>
                          </div>
                        )}
                        {(category === 'broadcast' || category === 'utility') && config.messages_count > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Times: <span className="font-medium">
                              {config.delay_hours.slice(0, Math.min(3, config.messages_count)).map(m => {
                                const h = Math.floor(m / 60);
                                const min = m % 60;
                                return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                              }).join(', ')}
                              {config.messages_count > 3 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Messages selected: </span>
                        <span className="font-medium">{config.selected_message_ids.length}/{messages.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Clone Configuration Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Clone Configuration</DialogTitle>
            <DialogDescription>
              Clone all trigger configurations from another page to "{currentPage?.name}".
              This will replace all existing configurations for this page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Clone from</Label>
              <Select value={cloneFromPageId} onValueChange={setCloneFromPageId}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select a page to clone from" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  {pages.filter(p => p.id !== currentPage?.id).map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This will copy all message configurations including welcome, response, sequence, broadcast settings, selected messages, and scheduling.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button 
              onClick={handleCloneConfiguration} 
              disabled={cloning || !cloneFromPageId} 
              className="bg-gradient-primary"
            >
              {cloning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clone Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
