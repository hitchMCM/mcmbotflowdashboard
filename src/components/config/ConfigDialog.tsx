import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shuffle, Target, X, Plus } from "lucide-react";
import { 
  MessageCategory, 
  PageConfig, 
  Message, 
  SelectionMode,
  CATEGORY_LABELS,
  SELECTION_MODE_LABELS,
  SELECTION_MODE_DESCRIPTIONS 
} from "@/types/messages";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: MessageCategory;
  messages: Message[];
  editingConfig: PageConfig | null;
  onSave: (data: {
    name: string;
    selection_mode: SelectionMode;
    selected_message_ids: string[];
    fixed_message_id?: string;
    trigger_keywords?: string[];
    delay_hours?: number[];
    scheduled_time?: string;
    messages_count?: number;
  }) => void;
}

const MODE_ICONS: Record<SelectionMode, React.ElementType> = {
  random: Shuffle,
  fixed: Target,
};

export function ConfigDialog({
  open,
  onOpenChange,
  category,
  messages,
  editingConfig,
  onSave,
}: ConfigDialogProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SelectionMode>("random");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fixedId, setFixedId] = useState<string>("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [delayHours, setDelayHours] = useState<number[]>([24]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [messagesCount, setMessagesCount] = useState(1);

  // Reset form when dialog opens/closes or editing config changes
  useEffect(() => {
    if (open) {
      if (editingConfig) {
        setName(editingConfig.name);
        setMode(editingConfig.selection_mode);
        setSelectedIds(editingConfig.selected_message_ids);
        setFixedId(editingConfig.fixed_message_id || "");
        setKeywords(editingConfig.trigger_keywords);
        setDelayHours(editingConfig.delay_hours.length > 0 ? editingConfig.delay_hours : [24]);
        setScheduledTime(editingConfig.scheduled_time || "");
        setMessagesCount(editingConfig.messages_count);
      } else {
        setName("");
        setMode("random");
        setSelectedIds([]);
        setFixedId("");
        setKeywords([]);
        setKeywordInput("");
        setDelayHours([24]);
        setScheduledTime("");
        setMessagesCount(1);
      }
    }
  }, [open, editingConfig]);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim().toLowerCase())) {
      setKeywords([...keywords, keywordInput.trim().toLowerCase()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleToggleMessage = (messageId: string) => {
    if (selectedIds.includes(messageId)) {
      setSelectedIds(selectedIds.filter(id => id !== messageId));
    } else {
      setSelectedIds([...selectedIds, messageId]);
    }
  };

  const handleSave = () => {
    onSave({
      name: name || `${CATEGORY_LABELS[category]} Config`,
      selection_mode: mode,
      selected_message_ids: selectedIds,
      fixed_message_id: mode === 'fixed' ? fixedId : undefined,
      trigger_keywords: category === 'response' ? keywords : undefined,
      delay_hours: category === 'sequence' ? delayHours : undefined,
      scheduled_time: category === 'broadcast' ? scheduledTime : undefined,
      messages_count: messagesCount,
    });
  };

  const isValid = () => {
    if (!name.trim()) return false;
    if (mode === 'fixed' && !fixedId) return false;
    if (mode === 'random' && selectedIds.length === 0) return false;
    if (category === 'response' && keywords.length === 0) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingConfig ? 'Edit' : 'Create'} {CATEGORY_LABELS[category]} Configuration
          </DialogTitle>
          <DialogDescription>
            Configure how messages are selected and sent for this page.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="config-name">Configuration Name</Label>
              <Input
                id="config-name"
                placeholder={`e.g., ${category === 'response' ? 'Job Inquiry Response' : 'Default ' + CATEGORY_LABELS[category]}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Keywords (for responses) */}
            {category === 'response' && (
              <div className="space-y-2">
                <Label>Trigger Keywords</Label>
                <p className="text-sm text-muted-foreground">
                  Messages will be sent when these keywords are detected.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  />
                  <Button type="button" onClick={handleAddKeyword} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="hover:text-destructive"
                          aria-label={`Remove keyword ${keyword}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Selection Mode */}
            <div className="space-y-3">
              <Label>Selection Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as SelectionMode)}>
                {(['random', 'fixed'] as SelectionMode[]).map((m) => {
                  const Icon = MODE_ICONS[m];
                  return (
                    <div key={m} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={m} id={`mode-${m}`} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={`mode-${m}`} className="flex items-center gap-2 cursor-pointer font-medium">
                          <Icon className="h-4 w-4" />
                          {SELECTION_MODE_LABELS[m]}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {SELECTION_MODE_DESCRIPTIONS[m]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <Separator />

            {/* Fixed Message Selection */}
            {mode === 'fixed' && (
              <div className="space-y-2">
                <Label>Select Fixed Message</Label>
                <Select value={fixedId} onValueChange={setFixedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a message..." />
                  </SelectTrigger>
                  <SelectContent>
                    {messages.map((msg) => (
                      <SelectItem key={msg.id} value={msg.id}>
                        {msg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Random Message Selection */}
            {mode === 'random' && (
              <div className="space-y-2">
                <Label>Select Messages for Pool</Label>
                <p className="text-sm text-muted-foreground">
                  Select messages to include in the random selection pool.
                </p>
                <div className="border rounded-lg divide-y max-h-60 overflow-auto">
                  {messages.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No messages available. Create messages first.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleToggleMessage(msg.id)}
                      >
                        <Checkbox 
                          checked={selectedIds.includes(msg.id)}
                          onCheckedChange={() => handleToggleMessage(msg.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{msg.name}</div>
                          {msg.title && (
                            <div className="text-sm text-muted-foreground truncate">{msg.title}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          Weight: {msg.weight}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedIds.length} message(s) selected
                </p>
              </div>
            )}

            {/* Sequence Timing */}
            {category === 'sequence' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Message Delays (hours)</Label>
                  <p className="text-sm text-muted-foreground">
                    Set the delay between each message in the sequence.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {delayHours.map((delay, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={delay}
                          onChange={(e) => {
                            const newDelays = [...delayHours];
                            newDelays[idx] = parseInt(e.target.value) || 0;
                            setDelayHours(newDelays);
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">h</span>
                        {delayHours.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDelayHours(delayHours.filter((_, i) => i !== idx))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDelayHours([...delayHours, 24])}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Broadcast Scheduling */}
            {category === 'broadcast' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Scheduled Time</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Messages Count */}
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="messages-count">Messages to Send</Label>
              <p className="text-sm text-muted-foreground">
                How many messages to send each time this config is triggered.
              </p>
              <Input
                id="messages-count"
                type="number"
                min="1"
                max="10"
                value={messagesCount}
                onChange={(e) => setMessagesCount(parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            {editingConfig ? 'Save Changes' : 'Create Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
