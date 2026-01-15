import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Pencil, 
  Trash2, 
  MoreVertical, 
  Plus, 
  X, 
  Shuffle, 
  Target,
  Clock,
  Hash
} from "lucide-react";
import { PageConfig, Message, SelectionMode, SELECTION_MODE_LABELS } from "@/types/messages";

interface ConfigCardProps {
  config: PageConfig;
  messages: Message[];
  onEdit: () => void;
  onDelete: () => void;
  onAddKeyword: (keyword: string) => Promise<boolean>;
  onRemoveKeyword: (keyword: string) => Promise<boolean>;
  onAddMessage: (messageId: string) => Promise<boolean>;
  onRemoveMessage: (messageId: string) => Promise<boolean>;
  onSetMode: (mode: SelectionMode, fixedMessageId?: string) => Promise<boolean>;
}

const MODE_ICONS: Record<SelectionMode, React.ElementType> = {
  random: Shuffle,
  fixed: Target,
};

export function ConfigCard({
  config,
  messages,
  onEdit,
  onDelete,
  onAddKeyword,
  onRemoveKeyword,
  onAddMessage,
  onRemoveMessage,
  onSetMode,
}: ConfigCardProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMessages = messages.filter(m => 
    config.selected_message_ids.includes(m.id)
  );

  const fixedMessage = config.fixed_message_id 
    ? messages.find(m => m.id === config.fixed_message_id)
    : null;

  const ModeIcon = MODE_ICONS[config.selection_mode];

  const handleAddKeyword = async () => {
    if (!keywordInput.trim()) return;
    setSaving(true);
    await onAddKeyword(keywordInput.trim());
    setKeywordInput("");
    setSaving(false);
  };

  const handleRemoveKeyword = async (keyword: string) => {
    setSaving(true);
    await onRemoveKeyword(keyword);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <Badge variant={config.is_enabled ? "default" : "secondary"}>
                {config.is_enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-2">
              <ModeIcon className="h-3 w-3" />
              {SELECTION_MODE_LABELS[config.selection_mode]} selection
              {config.selection_mode === 'fixed' && fixedMessage && (
                <span>• Using: {fixedMessage.name}</span>
              )}
              {config.selection_mode === 'random' && (
                <span>• {selectedMessages.length} message(s) in pool</span>
              )}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Keywords (for response configs) */}
        {config.category === 'response' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4" />
              Keywords
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                disabled={saving}
                className="flex-1"
              />
              <Button 
                size="sm" 
                onClick={handleAddKeyword}
                disabled={saving || !keywordInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {config.trigger_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {config.trigger_keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      disabled={saving}
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

        {/* Timing (for sequence configs) */}
        {config.category === 'sequence' && config.delay_hours.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Timing
            </div>
            <div className="flex flex-wrap gap-1.5">
              {config.delay_hours.map((delay, idx) => (
                <Badge key={idx} variant="outline">
                  Step {idx + 1}: {delay}h delay
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Time (for broadcast configs) */}
        {config.category === 'broadcast' && config.scheduled_time && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Scheduled Time
            </div>
            <Badge variant="outline">{config.scheduled_time}</Badge>
          </div>
        )}

        {/* Selected Messages Preview */}
        {selectedMessages.length > 0 && config.selection_mode !== 'fixed' && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Message Pool</div>
            <div className="grid gap-2">
              {selectedMessages.slice(0, 3).map((msg) => (
                <div 
                  key={msg.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                >
                  <span className="truncate">{msg.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Weight: {msg.weight}
                    </Badge>
                    <button
                      onClick={() => onRemoveMessage(msg.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove message ${msg.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedMessages.length > 3 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{selectedMessages.length - 3} more messages
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
          <span>Triggered {config.times_triggered} times</span>
          {config.messages_count > 1 && (
            <span>• Sends {config.messages_count} messages</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
