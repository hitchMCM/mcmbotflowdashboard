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
import { 
  Loader2, 
  Settings2, 
  MessageSquare, 
  Zap, 
  Radio, 
  Save,
  Shuffle,
  Target,
  ListOrdered,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePage } from "@/contexts/PageContext";
import { useMessages, usePageConfigs } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
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

// Only 4 categories for trigger configuration
const TRIGGER_CATEGORIES: MessageCategory[] = ['welcome', 'response', 'sequence', 'broadcast'];

const CATEGORY_ICONS: Record<MessageCategory, React.ElementType> = {
  welcome: MessageSquare,
  response: Zap,
  sequence: Settings2,
  broadcast: Radio,
};

const MODE_ICONS: Record<SelectionMode, React.ElementType> = {
  random: Shuffle,
  fixed: Target,
  ordered: ListOrdered,
};

interface TriggerConfig {
  category: MessageCategory;
  is_enabled: boolean;
  selection_mode: SelectionMode;
  messages_count: number;
  delay_hours: number[];
  scheduled_time: string | null;
  selected_message_ids: string[];
}

export default function Configuration() {
  const { currentPage } = usePage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<MessageCategory>("welcome");
  const [saving, setSaving] = useState(false);
  const [changedCategories, setChangedCategories] = useState<Set<MessageCategory>>(new Set());
  
  // Store original configs for change detection
  const originalConfigsRef = useRef<string>("");
  
  // Load messages for each category
  const welcomeMessages = useMessages('welcome');
  const responseMessages = useMessages('response');
  const sequenceMessages = useMessages('sequence');
  const broadcastMessages = useMessages('broadcast');
  
  // Load page configs - pass the pageId
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
    welcome: { category: 'welcome', is_enabled: true, selection_mode: 'random', messages_count: 1, delay_hours: [0], scheduled_time: null, selected_message_ids: [] },
    response: { category: 'response', is_enabled: true, selection_mode: 'random', messages_count: 1, delay_hours: [0], scheduled_time: null, selected_message_ids: [] },
    sequence: { category: 'sequence', is_enabled: true, selection_mode: 'ordered', messages_count: 1, delay_hours: [24], scheduled_time: null, selected_message_ids: [] },
    broadcast: { category: 'broadcast', is_enabled: true, selection_mode: 'fixed', messages_count: 1, delay_hours: [0], scheduled_time: null, selected_message_ids: [] },
  });

  // Get messages for current category
  const getMessagesForCategory = (category: MessageCategory): Message[] => {
    switch (category) {
      case 'welcome': return welcomeMessages.messages;
      case 'response': return responseMessages.messages;
      case 'sequence': return sequenceMessages.messages;
      case 'broadcast': return broadcastMessages.messages;
      default: return [];
    }
  };

  // Load configs into local state when they arrive
  useEffect(() => {
    if (configs.length > 0) {
      const newConfigs = { ...triggerConfigs };
      configs.forEach(cfg => {
        if (TRIGGER_CATEGORIES.includes(cfg.category)) {
          newConfigs[cfg.category] = {
            category: cfg.category,
            is_enabled: cfg.is_enabled,
            selection_mode: cfg.selection_mode || 'random',
            messages_count: cfg.messages_count || 1,
            delay_hours: cfg.delay_hours || [0],
            scheduled_time: cfg.scheduled_time || null,
            selected_message_ids: cfg.selected_message_ids || [],
          };
        }
      });
      setTriggerConfigs(newConfigs);
      // Store original for change detection
      originalConfigsRef.current = JSON.stringify(newConfigs);
      setChangedCategories(new Set());
    }
  }, [configs]);

  // Detect changes when editing
  useEffect(() => {
    if (!originalConfigsRef.current) return;
    
    try {
      const original = JSON.parse(originalConfigsRef.current);
      const changed = new Set<MessageCategory>();
      
      TRIGGER_CATEGORIES.forEach(category => {
        if (JSON.stringify(triggerConfigs[category]) !== JSON.stringify(original[category])) {
          changed.add(category);
        }
      });
      
      setChangedCategories(changed);
    } catch (e) {
      // Ignore parse errors
    }
  }, [triggerConfigs]);

  const updateLocalConfig = (category: MessageCategory, field: keyof TriggerConfig, value: any) => {
    setTriggerConfigs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const toggleMessageSelection = (category: MessageCategory, messageId: string) => {
    const current = triggerConfigs[category].selected_message_ids;
    const currentDelays = triggerConfigs[category].delay_hours;
    
    if (current.includes(messageId)) {
      // Removing message
      const index = current.indexOf(messageId);
      const newSelection = current.filter(id => id !== messageId);
      const newDelays = currentDelays.filter((_, i) => i !== index);
      updateLocalConfig(category, 'selected_message_ids', newSelection);
      updateLocalConfig(category, 'delay_hours', newDelays);
    } else {
      // Adding message
      const newSelection = [...current, messageId];
      let newDelays = [...currentDelays];
      
      if (category === 'sequence') {
        // For sequences: default to next 24h increment (0, 24, 48, 72...)
        newDelays.push(currentDelays.length * 24);
      } else if (category === 'broadcast') {
        // For broadcasts: default to 9:00 AM (540 minutes)
        newDelays.push(540);
      }
      
      updateLocalConfig(category, 'selected_message_ids', newSelection);
      updateLocalConfig(category, 'delay_hours', newDelays);
    }
  };

  const handleSave = async (category: MessageCategory) => {
    if (!currentPage?.id) {
      toast({
        title: "❌ Error",
        description: "No page selected. Please select a page first.",
        variant: "destructive"
      });
      return;
    }
    
    // Skip demo page
    if (currentPage.id === 'demo') {
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
      
      const result = await upsertConfig({
        page_id: currentPage.id,
        category: category,
        name: `${CATEGORY_LABELS[category]} Config`,
        is_enabled: config.is_enabled,
        selection_mode: config.selection_mode,
        messages_count: config.messages_count,
        delay_hours: config.delay_hours,
        scheduled_time: config.scheduled_time,
        selected_message_ids: config.selected_message_ids,
      });
      
      console.log('[Configuration] Save result:', result);
      
      // Update original reference after successful save
      const currentOriginal = originalConfigsRef.current ? JSON.parse(originalConfigsRef.current) : {};
      currentOriginal[category] = { ...triggerConfigs[category] };
      originalConfigsRef.current = JSON.stringify(currentOriginal);
      
      // Remove from changed set
      setChangedCategories(prev => {
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
      
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

  const isLoading = configsLoading || welcomeMessages.loading || responseMessages.loading || sequenceMessages.loading || broadcastMessages.loading;

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
        <div>
          <h1 className="text-2xl font-bold">Trigger Configuration</h1>
          <p className="text-muted-foreground">
            Configure when and how messages are sent for {currentPage?.name || "your page"}
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MessageCategory)}>
          <TabsList className="grid w-full grid-cols-4">
            {TRIGGER_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              const config = triggerConfigs[cat];
              return (
                <TabsTrigger key={cat} value={cat} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{CATEGORY_LABELS[cat]}</span>
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
                          {(['random', 'fixed', 'ordered'] as SelectionMode[]).map(mode => {
                            const ModeIcon = MODE_ICONS[mode];
                            return (
                              <div key={mode} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                <RadioGroupItem value={mode} id={`${category}-${mode}`} />
                                <ModeIcon className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <Label htmlFor={`${category}-${mode}`} className="cursor-pointer font-medium">
                                    {SELECTION_MODE_LABELS[mode]}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {SELECTION_MODE_DESCRIPTIONS[mode]}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>

                      <Separator />

                      {/* Messages Count - Only for sequence and broadcast */}
                      {(category === 'sequence' || category === 'broadcast') && (
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

                      {/* Sequence Configuration - Hours after subscription based on messages_count */}
                      {category === 'sequence' && (
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Hours After Subscription
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Configure how many hours after subscription each message is sent.
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Array.from({ length: config.messages_count }, (_, index) => {
                              // Default: 0h, 24h, 48h, 72h...
                              const hoursValue = config.delay_hours[index] ?? (index * 24);
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
                                      value={hoursValue}
                                      onChange={(e) => {
                                        const newDelays = [...config.delay_hours];
                                        // Ensure array is long enough
                                        while (newDelays.length < config.messages_count) {
                                          newDelays.push(newDelays.length * 24);
                                        }
                                        newDelays[index] = parseInt(e.target.value) || 0;
                                        updateLocalConfig(category, 'delay_hours', newDelays);
                                      }}
                                      className="w-20"
                                    />
                                    <span className="text-xs text-muted-foreground">hours</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Broadcast Configuration - Daily Time based on messages_count */}
                      {category === 'broadcast' && (
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            Daily Send Times
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Configure the daily send time for each message slot.
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Array.from({ length: config.messages_count }, (_, index) => {
                              // Store times as minutes in delay_hours array
                              const storedMinutes = config.delay_hours[index] ?? (540 + index * 180); // Default: 9:00, 12:00, 15:00...
                              const hours = Math.floor(storedMinutes / 60);
                              const minutes = storedMinutes % 60;
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
                                      const newDelays = [...config.delay_hours];
                                      // Ensure array is long enough
                                      while (newDelays.length < config.messages_count) {
                                        newDelays.push(540 + newDelays.length * 180);
                                      }
                                      newDelays[index] = (h * 60) + (m || 0);
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
                        disabled={saving || !changedCategories.has(category)} 
                        className={cn(
                          "w-full transition-all duration-300",
                          changedCategories.has(category) 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30" 
                            : ""
                        )}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : changedCategories.has(category) ? (
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

                  {/* Right: Message Selection */}
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
                          Mode: <span className="font-medium">{SELECTION_MODE_LABELS[config.selection_mode]}</span>
                        </div>
                        {(category === 'sequence' || category === 'broadcast') && (
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
                        {category === 'broadcast' && config.messages_count > 0 && (
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
    </DashboardLayout>
  );
}
