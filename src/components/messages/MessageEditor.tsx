import { useState, useEffect } from "react";
import { 
  Plus, Trash2, X, Image, Type, MousePointer, 
  MessageSquare, Layout, Film, ChevronLeft, ChevronRight, Zap, GripVertical, AlertTriangle, Link
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagAutocompleteTextarea, TagAutocompleteInput } from "@/components/ui/TagAutocompleteTextarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUpload, VideoUpload } from "@/components/ui/MediaUpload";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  FacebookMessageType, 
  MessageButton, 
  QuickReply, 
  TemplateElement, 
  MediaElement,
  MessageContent,
  FACEBOOK_MESSAGE_TYPE_LABELS,
} from "@/types/messages";

// Facebook Messenger Character Limits
export const FB_LIMITS = {
  TEXT_MESSAGE: 2000,
  TITLE: 80,
  SUBTITLE: 80,
  BUTTON_TITLE: 20,
  BUTTON_TEMPLATE_TEXT: 640,
  QUICK_REPLY_TITLE: 20,
  MAX_BUTTONS: 3,
  MAX_CAROUSEL_ELEMENTS: 10,
  MAX_QUICK_REPLIES: 13,
} as const;

// Character count display component
function CharCount({ current, max, className }: { current: number; max: number; className?: string }) {
  const isOver = current > max;
  const isWarning = current > max * 0.9;
  
  return (
    <span className={cn(
      "text-xs tabular-nums",
      isOver ? "text-destructive font-medium" : isWarning ? "text-amber-500" : "text-muted-foreground",
      className
    )}>
      {isOver && <AlertTriangle className="h-3 w-3 inline mr-1" />}
      {current}/{max}
    </span>
  );
}

interface MessageEditorProps {
  value: MessageContent;
  onChange: (content: MessageContent) => void;
  showQuickReplies?: boolean;
}

const defaultElement: TemplateElement = {
  title: "",
  subtitle: "",
  image_url: "",
  buttons: []
};

const defaultMediaElement: MediaElement = {
  media_type: "image",
  url: "",
  buttons: []
};

const defaultQuickReply: QuickReply = {
  content_type: "text",
  title: "",
  payload: ""
};

export function MessageEditor({ value, onChange, showQuickReplies = true }: MessageEditorProps) {
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  
  const messageType = value.message_type;
  
  const setMessageType = (type: FacebookMessageType) => {
    const newContent: MessageContent = { 
      message_type: type,
      quick_replies: value.quick_replies 
    };
    
    switch (type) {
      case 'text':
        newContent.text = value.text || "";
        break;
      case 'generic':
        newContent.elements = value.elements?.length ? [value.elements[0]] : [{ ...defaultElement }];
        break;
      case 'button':
        newContent.elements = [{
          title: value.elements?.[0]?.title || "",
          subtitle: value.elements?.[0]?.subtitle || "",
          buttons: value.elements?.[0]?.buttons || []
        }];
        break;
      case 'media':
        newContent.media_element = value.media_element || { ...defaultMediaElement };
        break;
      case 'carousel':
        newContent.elements = value.elements?.length ? value.elements : [{ ...defaultElement }, { ...defaultElement }];
        break;
      case 'quick_replies':
        newContent.text = value.text || "";
        newContent.quick_replies = value.quick_replies?.length ? value.quick_replies : [{ ...defaultQuickReply }];
        break;
    }
    
    onChange(newContent);
  };

  // Update text content
  const updateText = (text: string) => {
    onChange({ ...value, text });
  };

  // Update element at index
  const updateElement = (index: number, updates: Partial<TemplateElement>) => {
    const elements = [...(value.elements || [])];
    elements[index] = { ...elements[index], ...updates };
    onChange({ ...value, elements });
  };

  // Add new carousel element
  const addCarouselElement = () => {
    if ((value.elements?.length || 0) < 10) {
      const elements = [...(value.elements || []), { ...defaultElement }];
      onChange({ ...value, elements });
      setActiveCarouselIndex(elements.length - 1);
    }
  };

  // Remove carousel element
  const removeCarouselElement = (index: number) => {
    if ((value.elements?.length || 0) > 1) {
      const elements = value.elements?.filter((_, i) => i !== index) || [];
      onChange({ ...value, elements });
      if (activeCarouselIndex >= elements.length) {
        setActiveCarouselIndex(elements.length - 1);
      }
    }
  };

  // Update button in element
  const updateElementButton = (elementIndex: number, buttonIndex: number, updates: Partial<MessageButton>) => {
    const elements = [...(value.elements || [])];
    const buttons = [...(elements[elementIndex]?.buttons || [])];
    buttons[buttonIndex] = { ...buttons[buttonIndex], ...updates };
    elements[elementIndex] = { ...elements[elementIndex], buttons };
    onChange({ ...value, elements });
  };

  // Add button to element
  const addElementButton = (elementIndex: number) => {
    const elements = [...(value.elements || [])];
    const buttons = [...(elements[elementIndex]?.buttons || [])];
    if (buttons.length < 3) {
      buttons.push({ type: "web_url", title: "New Button", url: "" });
      elements[elementIndex] = { ...elements[elementIndex], buttons };
      onChange({ ...value, elements });
    }
  };

  // Remove button from element
  const removeElementButton = (elementIndex: number, buttonIndex: number) => {
    const elements = [...(value.elements || [])];
    const buttons = (elements[elementIndex]?.buttons || []).filter((_, i) => i !== buttonIndex);
    elements[elementIndex] = { ...elements[elementIndex], buttons };
    onChange({ ...value, elements });
  };

  // Update media element
  const updateMediaElement = (updates: Partial<MediaElement>) => {
    onChange({ 
      ...value, 
      media_element: { ...(value.media_element || defaultMediaElement), ...updates } 
    });
  };

  // Update media button
  const updateMediaButton = (updates: Partial<MessageButton>) => {
    const media = value.media_element || defaultMediaElement;
    const buttons = media.buttons?.length ? [{ ...media.buttons[0], ...updates }] : [{ type: "web_url" as const, title: "View", url: "", ...updates }];
    onChange({ ...value, media_element: { ...media, buttons } });
  };

  // Add/Remove media button
  const toggleMediaButton = () => {
    const media = value.media_element || defaultMediaElement;
    if (media.buttons?.length) {
      onChange({ ...value, media_element: { ...media, buttons: [] } });
    } else {
      onChange({ ...value, media_element: { ...media, buttons: [{ type: "web_url", title: "View", url: "" }] } });
    }
  };

  // Quick replies management
  const updateQuickReply = (index: number, updates: Partial<QuickReply>) => {
    const quick_replies = [...(value.quick_replies || [])];
    quick_replies[index] = { ...quick_replies[index], ...updates };
    onChange({ ...value, quick_replies });
  };

  const addQuickReply = () => {
    if ((value.quick_replies?.length || 0) < 13) {
      const quick_replies = [...(value.quick_replies || []), { ...defaultQuickReply, title: `Option ${(value.quick_replies?.length || 0) + 1}` }];
      onChange({ ...value, quick_replies });
    }
  };

  const removeQuickReply = (index: number) => {
    const quick_replies = value.quick_replies?.filter((_, i) => i !== index) || [];
    onChange({ ...value, quick_replies });
  };

  // Get current element for generic/button/carousel
  const currentElement = value.elements?.[messageType === 'carousel' ? activeCarouselIndex : 0];

  return (
    <div className="space-y-4">
      {/* Message Type Selector */}
      <div className="space-y-2">
        <Label>Type de Message Facebook</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button
            variant={messageType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('text')}
            className="justify-start"
          >
            <Type className="h-4 w-4 mr-2" />
            Texte
          </Button>
          <Button
            variant={messageType === 'generic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('generic')}
            className="justify-start"
          >
            <Layout className="h-4 w-4 mr-2" />
            Carte
          </Button>
          <Button
            variant={messageType === 'button' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('button')}
            className="justify-start"
          >
            <MousePointer className="h-4 w-4 mr-2" />
            Boutons
          </Button>
          <Button
            variant={messageType === 'media' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('media')}
            className="justify-start"
          >
            <Film className="h-4 w-4 mr-2" />
            Média
          </Button>
          <Button
            variant={messageType === 'carousel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('carousel')}
            className="justify-start"
          >
            <Image className="h-4 w-4 mr-2" />
            Carrousel
          </Button>
          <Button
            variant={messageType === 'quick_replies' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('quick_replies')}
            className="justify-start"
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Replies
          </Button>
        </div>
      </div>

      <Separator />

      {/* Text Message Editor */}
      {messageType === 'text' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Message</Label>
            <CharCount current={value.text?.length || 0} max={FB_LIMITS.TEXT_MESSAGE} />
          </div>
          <TagAutocompleteTextarea
            placeholder="Entrez votre message texte... (tapez {{ pour les tags de personnalisation)"
            value={value.text || ""}
            onChange={(e) => updateText(e.target.value)}
            className={cn("min-h-32", (value.text?.length || 0) > FB_LIMITS.TEXT_MESSAGE && "border-destructive")}
            maxLength={FB_LIMITS.TEXT_MESSAGE}
          />
        </div>
      )}

      {/* Generic Template Editor */}
      {messageType === 'generic' && currentElement && (
        <div className="space-y-4">
          <ImageUpload
            value={currentElement.image_url || ""}
            onChange={(url) => updateElement(0, { image_url: url })}
            label="Image (optionnel)"
            aspectRatio={1.91}
            minWidth={254}
            minHeight={133}
          />
          
          {/* Default Action - Clickable Image Link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Lien sur l'image (optionnel)
            </Label>
            <Input
              placeholder="https://example.com (rend l'image cliquable)"
              value={currentElement.default_action?.url || ""}
              onChange={(e) => {
                const url = e.target.value;
                updateElement(0, { 
                  default_action: url ? { 
                    type: 'web_url', 
                    url,
                    webview_height_ratio: 'full'
                  } : undefined
                });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Si rempli, cliquer sur l'image ouvrira ce lien
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Titre</Label>
              <CharCount current={currentElement.title?.length || 0} max={FB_LIMITS.TITLE} />
            </div>
            <TagAutocompleteInput
              placeholder="Titre de la carte (tapez {{ pour les tags)"
              value={currentElement.title}
              onChange={(e) => updateElement(0, { title: e.target.value })}
              maxLength={FB_LIMITS.TITLE}
              className={cn((currentElement.title?.length || 0) > FB_LIMITS.TITLE && "border-destructive")}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sous-titre / Description</Label>
              <CharCount current={currentElement.subtitle?.length || 0} max={FB_LIMITS.SUBTITLE} />
            </div>
            <TagAutocompleteTextarea
              placeholder="Description de la carte... (tapez {{ pour les tags)"
              value={currentElement.subtitle || ""}
              onChange={(e) => updateElement(0, { subtitle: e.target.value })}
              className={cn("min-h-20", (currentElement.subtitle?.length || 0) > FB_LIMITS.SUBTITLE && "border-destructive")}
              maxLength={FB_LIMITS.SUBTITLE}
            />
          </div>
          
          {/* Buttons Section */}
          <ButtonsEditor
            buttons={currentElement.buttons || []}
            onUpdate={(idx, updates) => updateElementButton(0, idx, updates)}
            onAdd={() => addElementButton(0)}
            onRemove={(idx) => removeElementButton(0, idx)}
          />
        </div>
      )}

      {/* Button Template Editor */}
      {messageType === 'button' && currentElement && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Texte du message</Label>
              <CharCount current={currentElement.title?.length || 0} max={FB_LIMITS.BUTTON_TEMPLATE_TEXT} />
            </div>
            <TagAutocompleteTextarea
              placeholder="Texte qui accompagne les boutons... (tapez {{ pour les tags)"
              value={currentElement.title}
              onChange={(e) => updateElement(0, { title: e.target.value })}
              className={cn("min-h-20", (currentElement.title?.length || 0) > FB_LIMITS.BUTTON_TEMPLATE_TEXT && "border-destructive")}
              maxLength={FB_LIMITS.BUTTON_TEMPLATE_TEXT}
            />
          </div>
          
          {/* Buttons Section */}
          <ButtonsEditor
            buttons={currentElement.buttons || []}
            onUpdate={(idx, updates) => updateElementButton(0, idx, updates)}
            onAdd={() => addElementButton(0)}
            onRemove={(idx) => removeElementButton(0, idx)}
          />
        </div>
      )}

      {/* Media Template Editor */}
      {messageType === 'media' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de média</Label>
            <Select
              value={value.media_element?.media_type || "image"}
              onValueChange={(v) => updateMediaElement({ media_type: v as 'image' | 'video' })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Vidéo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {value.media_element?.media_type === 'video' ? (
            <VideoUpload
              value={value.media_element?.url || ""}
              onChange={(url) => updateMediaElement({ url })}
              label="Vidéo"
              maxVideoSize={25}
            />
          ) : (
            <ImageUpload
              value={value.media_element?.url || ""}
              onChange={(url) => updateMediaElement({ url })}
              label="Image"
              aspectRatio={1.91}
              minWidth={254}
              minHeight={133}
            />
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <MousePointer className="h-3 w-3" />
                Bouton (optionnel)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMediaButton}
              >
                {value.media_element?.buttons?.length ? (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Supprimer
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </>
                )}
              </Button>
            </div>
            
            {value.media_element?.buttons?.length ? (
              <div className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg border">
                <div className="flex-1 grid sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Texte du bouton"
                      value={value.media_element.buttons[0].title}
                      onChange={(e) => updateMediaButton({ title: e.target.value })}
                      maxLength={FB_LIMITS.BUTTON_TITLE}
                      className={cn((value.media_element.buttons[0].title?.length || 0) > FB_LIMITS.BUTTON_TITLE && "border-destructive")}
                    />
                    <span className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums",
                      (value.media_element.buttons[0].title?.length || 0) > FB_LIMITS.BUTTON_TITLE ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {value.media_element.buttons[0].title?.length || 0}/{FB_LIMITS.BUTTON_TITLE}
                    </span>
                  </div>
                  <Input
                    placeholder="https://..."
                    value={value.media_element.buttons[0].url || ""}
                    onChange={(e) => updateMediaButton({ url: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Carousel Editor */}
      {messageType === 'carousel' && (
        <div className="space-y-4">
          {/* Carousel Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveCarouselIndex(Math.max(0, activeCarouselIndex - 1))}
                disabled={activeCarouselIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Carte {activeCarouselIndex + 1} / {value.elements?.length || 0}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setActiveCarouselIndex(Math.min((value.elements?.length || 1) - 1, activeCarouselIndex + 1))}
                disabled={activeCarouselIndex >= (value.elements?.length || 1) - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {(value.elements?.length || 0) > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCarouselElement(activeCarouselIndex)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer
                </Button>
              )}
              {(value.elements?.length || 0) < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCarouselElement}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter carte
                </Button>
              )}
            </div>
          </div>

          {/* Carousel dots */}
          <div className="flex justify-center gap-1">
            {value.elements?.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCarouselIndex(idx)}
                title={`Go to card ${idx + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  idx === activeCarouselIndex ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Current Card Editor */}
          {currentElement && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-4 space-y-4">
                <ImageUpload
                  value={currentElement.image_url || ""}
                  onChange={(url) => updateElement(activeCarouselIndex, { image_url: url })}
                  label="Image"
                  aspectRatio={1.91}
                  minWidth={254}
                  minHeight={133}
                />
                
                {/* Default Action - Clickable Image Link */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Lien sur l'image
                  </Label>
                  <Input
                    placeholder="https://example.com"
                    value={currentElement.default_action?.url || ""}
                    onChange={(e) => {
                      const url = e.target.value;
                      updateElement(activeCarouselIndex, { 
                        default_action: url ? { 
                          type: 'web_url', 
                          url,
                          webview_height_ratio: 'full'
                        } : undefined
                      });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Titre</Label>
                    <CharCount current={currentElement.title?.length || 0} max={FB_LIMITS.TITLE} />
                  </div>
                  <TagAutocompleteInput
                    placeholder="Titre de la carte (tapez {{ pour les tags)"
                    value={currentElement.title}
                    onChange={(e) => updateElement(activeCarouselIndex, { title: e.target.value })}
                    maxLength={FB_LIMITS.TITLE}
                    className={cn((currentElement.title?.length || 0) > FB_LIMITS.TITLE && "border-destructive")}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sous-titre</Label>
                    <CharCount current={currentElement.subtitle?.length || 0} max={FB_LIMITS.SUBTITLE} />
                  </div>
                  <TagAutocompleteTextarea
                    placeholder="Description... (tapez {{ pour les tags)"
                    value={currentElement.subtitle || ""}
                    onChange={(e) => updateElement(activeCarouselIndex, { subtitle: e.target.value })}
                    className={cn("min-h-16", (currentElement.subtitle?.length || 0) > FB_LIMITS.SUBTITLE && "border-destructive")}
                    maxLength={FB_LIMITS.SUBTITLE}
                  />
                </div>
                
                <ButtonsEditor
                  buttons={currentElement.buttons || []}
                  onUpdate={(idx, updates) => updateElementButton(activeCarouselIndex, idx, updates)}
                  onAdd={() => addElementButton(activeCarouselIndex)}
                  onRemove={(idx) => removeElementButton(activeCarouselIndex, idx)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Replies Editor */}
      {messageType === 'quick_replies' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              <CharCount current={value.text?.length || 0} max={FB_LIMITS.TEXT_MESSAGE} />
            </div>
            <TagAutocompleteTextarea
              placeholder="Choisissez une option... (tapez {{ pour les tags)"
              value={value.text || ""}
              onChange={(e) => updateText(e.target.value)}
              className={cn("min-h-20", (value.text?.length || 0) > FB_LIMITS.TEXT_MESSAGE && "border-destructive")}
              maxLength={FB_LIMITS.TEXT_MESSAGE}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Quick Replies ({value.quick_replies?.length || 0}/{FB_LIMITS.MAX_QUICK_REPLIES})
              </Label>
              {(value.quick_replies?.length || 0) < FB_LIMITS.MAX_QUICK_REPLIES && (
                <Button variant="outline" size="sm" onClick={addQuickReply}>
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
              )}
            </div>
            
            <div className="grid gap-2">
              {value.quick_replies?.map((qr, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-muted/50 rounded-lg border">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        placeholder="Texte du bouton"
                        value={qr.title || ""}
                        onChange={(e) => updateQuickReply(idx, { title: e.target.value, payload: e.target.value })}
                        maxLength={FB_LIMITS.QUICK_REPLY_TITLE}
                        className={cn((qr.title?.length || 0) > FB_LIMITS.QUICK_REPLY_TITLE && "border-destructive")}
                      />
                      <span className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums",
                        (qr.title?.length || 0) > FB_LIMITS.QUICK_REPLY_TITLE ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {qr.title?.length || 0}/{FB_LIMITS.QUICK_REPLY_TITLE}
                      </span>
                    </div>
                    <Input
                      placeholder="URL image (optionnel)"
                      value={qr.image_url || ""}
                      onChange={(e) => updateQuickReply(idx, { image_url: e.target.value })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeQuickReply(idx)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Les Quick Replies disparaissent après que l'utilisateur en clique un. Max {FB_LIMITS.QUICK_REPLY_TITLE} caractères par bouton.
            </p>
          </div>
        </div>
      )}

      {/* Optional Quick Replies for other message types */}
      {showQuickReplies && messageType !== 'quick_replies' && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Quick Replies (optionnel) ({value.quick_replies?.length || 0}/{FB_LIMITS.MAX_QUICK_REPLIES})
              </Label>
              {(value.quick_replies?.length || 0) < FB_LIMITS.MAX_QUICK_REPLIES && (
                <Button variant="outline" size="sm" onClick={addQuickReply}>
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
              )}
            </div>
            
            {value.quick_replies?.length ? (
              <div className="grid gap-2">
                {value.quick_replies.map((qr, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 bg-muted/50 rounded-lg border">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Texte du quick reply"
                        value={qr.title || ""}
                        onChange={(e) => updateQuickReply(idx, { title: e.target.value, payload: e.target.value })}
                        maxLength={FB_LIMITS.QUICK_REPLY_TITLE}
                        className={cn((qr.title?.length || 0) > FB_LIMITS.QUICK_REPLY_TITLE && "border-destructive")}
                      />
                      <span className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums",
                        (qr.title?.length || 0) > FB_LIMITS.QUICK_REPLY_TITLE ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {qr.title?.length || 0}/{FB_LIMITS.QUICK_REPLY_TITLE}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuickReply(idx)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// Buttons Editor Sub-component
interface ButtonsEditorProps {
  buttons: MessageButton[];
  onUpdate: (index: number, updates: Partial<MessageButton>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  maxButtons?: number;
}

function ButtonsEditor({ buttons, onUpdate, onAdd, onRemove, maxButtons = 3 }: ButtonsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          <MousePointer className="h-3 w-3" />
          Boutons ({buttons.length}/{maxButtons})
        </Label>
        {buttons.length < maxButtons && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        )}
      </div>
      
      {buttons.map((btn, idx) => (
        <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg border">
          <div className="flex-1 space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="relative">
                <Input
                  placeholder="Texte du bouton"
                  value={btn.title}
                  onChange={(e) => onUpdate(idx, { title: e.target.value })}
                  maxLength={FB_LIMITS.BUTTON_TITLE}
                  className={cn((btn.title?.length || 0) > FB_LIMITS.BUTTON_TITLE && "border-destructive pr-14")}
                />
                <span className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums",
                  (btn.title?.length || 0) > FB_LIMITS.BUTTON_TITLE ? "text-destructive" : "text-muted-foreground"
                )}>
                  {btn.title?.length || 0}/{FB_LIMITS.BUTTON_TITLE}
                </span>
              </div>
              <Select
                value={btn.type}
                onValueChange={(v) => onUpdate(idx, { type: v as MessageButton['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web_url">Lien URL</SelectItem>
                  <SelectItem value="postback">Postback</SelectItem>
                  <SelectItem value="phone_number">Appel Tél.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {btn.type === 'web_url' && (
              <Input
                placeholder="https://..."
                value={btn.url || ""}
                onChange={(e) => onUpdate(idx, { url: e.target.value })}
              />
            )}
            {btn.type === 'phone_number' && (
              <Input
                placeholder="+1234567890"
                value={btn.payload || ""}
                onChange={(e) => onUpdate(idx, { payload: e.target.value })}
              />
            )}
            {btn.type === 'postback' && (
              <Input
                placeholder="PAYLOAD_ACTION"
                value={btn.payload || btn.title}
                onChange={(e) => onUpdate(idx, { payload: e.target.value })}
              />
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(idx)} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default MessageEditor;
