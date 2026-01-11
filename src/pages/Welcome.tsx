import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  MessageCircle, Save, Eye, Plus, Trash2, Copy, Loader2, X, Code, 
  Image, Type, MousePointer, ToggleLeft, FileText, Pencil, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMessages } from "@/hooks/useMessages";
import { usePage } from "@/contexts/PageContext";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessageButton {
  type: "web_url" | "postback";
  url: string;
  title: string;
}

interface TemplateElement {
  title: string;
  subtitle: string;
  image_url: string;
  buttons: MessageButton[];
}

const defaultTemplate: TemplateElement = {
  title: "Welcome!",
  subtitle: "Thank you for connecting with us. We're here to help!",
  image_url: "",
  buttons: []
};

export default function Welcome() {
  const { currentPage } = usePage();
  const { messages, loading, createMessage, updateMessage, deleteMessage, refetch } = useMessages('welcome');
  const { toast } = useToast();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonContent, setJsonContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store original data to compare for changes
  const originalDataRef = useRef<string>("");
  
  // Local editing state
  const [editName, setEditName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [messageType, setMessageType] = useState<"text" | "template">("template");
  const [textMessage, setTextMessage] = useState("");
  const [templateElement, setTemplateElement] = useState<TemplateElement>(defaultTemplate);

  const selectedMessage = messages.find(m => m.id === selectedId) || null;

  // Auto-select first message if none selected
  useEffect(() => {
    if (messages.length > 0 && !selectedId) {
      setSelectedId(messages[0].id);
    }
  }, [messages, selectedId]);

  // Load message data when selection changes
  useEffect(() => {
    if (selectedMessage) {
      setEditName(selectedMessage.name);
      setIsEnabled(selectedMessage.is_active);
      
      if (selectedMessage.text_content) {
        setMessageType("text");
        setTextMessage(selectedMessage.text_content);
        setTemplateElement(defaultTemplate);
      } else {
        setMessageType("template");
        setTextMessage("");
        setTemplateElement({
          title: selectedMessage.title || "",
          subtitle: selectedMessage.subtitle || "",
          image_url: selectedMessage.image_url || "",
          buttons: (selectedMessage.buttons as MessageButton[]) || []
        });
      }
      
      // Store original data for change detection
      originalDataRef.current = JSON.stringify({
        name: selectedMessage.name,
        is_active: selectedMessage.is_active,
        text_content: selectedMessage.text_content || "",
        title: selectedMessage.title || "",
        subtitle: selectedMessage.subtitle || "",
        image_url: selectedMessage.image_url || "",
        buttons: selectedMessage.buttons || []
      });
      setHasChanges(false);
    }
  }, [selectedMessage]);

  // Detect changes when editing
  useEffect(() => {
    if (!selectedMessage) return;
    
    const currentData = JSON.stringify({
      name: editName,
      is_active: isEnabled,
      text_content: messageType === "text" ? textMessage : "",
      title: messageType === "template" ? templateElement.title : "",
      subtitle: messageType === "template" ? templateElement.subtitle : "",
      image_url: messageType === "template" ? templateElement.image_url : "",
      buttons: messageType === "template" ? templateElement.buttons : []
    });
    
    setHasChanges(currentData !== originalDataRef.current);
  }, [editName, isEnabled, messageType, textMessage, templateElement, selectedMessage]);

  const updateButton = (index: number, field: keyof MessageButton, value: string) => {
    const newButtons = [...templateElement.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setTemplateElement({ ...templateElement, buttons: newButtons });
  };

  const addButton = () => {
    if (templateElement.buttons.length < 3) {
      setTemplateElement({
        ...templateElement,
        buttons: [...templateElement.buttons, { type: "web_url", url: "", title: "New Button" }]
      });
    }
  };

  const removeButton = (index: number) => {
    setTemplateElement({
      ...templateElement,
      buttons: templateElement.buttons.filter((_, i) => i !== index)
    });
  };

  const generateJSON = () => {
    if (messageType === "text") {
      return { recipient: { id: "{{PSID}}" }, message: { text: textMessage } };
    }
    return {
      recipient: { id: "{{PSID}}" },
      message: {
        attachment: {
          type: "template",
          payload: { 
            template_type: "generic", 
            elements: [{
              title: templateElement.title,
              subtitle: templateElement.subtitle,
              image_url: templateElement.image_url || undefined,
              buttons: templateElement.buttons.length > 0 ? templateElement.buttons : undefined
            }] 
          }
        }
      }
    };
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, 2));
    toast({ title: "📋 Copied!", description: "JSON copied to clipboard" });
  };

  const openJsonDialog = () => {
    setJsonContent(JSON.stringify(generateJSON(), null, 2));
    setJsonEditMode(false);
    setShowJsonDialog(true);
  };

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.message?.text) {
        setMessageType("text");
        setTextMessage(parsed.message.text);
      } else if (parsed.message?.attachment?.payload?.elements?.[0]) {
        const elem = parsed.message.attachment.payload.elements[0];
        setMessageType("template");
        setTemplateElement({
          title: elem.title || "",
          subtitle: elem.subtitle || "",
          image_url: elem.image_url || "",
          buttons: elem.buttons || []
        });
      }
      setShowJsonDialog(false);
      toast({ title: "✅ Applied!", description: "JSON changes applied" });
    } catch (e) {
      toast({ title: "❌ Invalid JSON", description: "Please check your JSON syntax", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedMessage) return;
    setSaving(true);
    try {
      await updateMessage(selectedMessage.id, {
        name: editName,
        is_active: isEnabled,
        text_content: messageType === "text" ? textMessage : null,
        title: messageType === "template" ? templateElement.title : null,
        subtitle: messageType === "template" ? templateElement.subtitle : null,
        image_url: messageType === "template" ? templateElement.image_url : null,
        buttons: messageType === "template" ? templateElement.buttons : [],
        messenger_payload: generateJSON()
      });
      
      // Update original data reference after successful save
      originalDataRef.current = JSON.stringify({
        name: editName,
        is_active: isEnabled,
        text_content: messageType === "text" ? textMessage : null,
        title: messageType === "template" ? templateElement.title : null,
        subtitle: messageType === "template" ? templateElement.subtitle : null,
        image_url: messageType === "template" ? templateElement.image_url : null,
        buttons: messageType === "template" ? templateElement.buttons : []
      });
      setHasChanges(false);
      
      toast({ title: "✅ Saved!", description: "Welcome message updated." });
      await refetch();
    } catch (error) {
      toast({ title: "❌ Error", description: "Unable to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    try {
      const created = await createMessage({
        name: `Welcome Message ${messages.length + 1}`,
        category: 'welcome',
        title: defaultTemplate.title,
        subtitle: defaultTemplate.subtitle,
        is_active: true
      });
      if (created) {
        await refetch();
        setSelectedId(created.id);
        toast({ title: "✅ Created!", description: "New welcome message added." });
      } else {
        toast({ title: "❌ Error", description: "Unable to create message. Check console for details.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Create error:', error);
      toast({ title: "❌ Error", description: "Unable to create message.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    
    setDeleting(true);
    try {
      const success = await deleteMessage(selectedMessage.id);
      if (success) {
        toast({ title: "🗑️ Deleted!", description: "Welcome message removed." });
        setSelectedId(null);
        await refetch();
      } else {
        toast({ title: "❌ Error", description: "Unable to delete message.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: "❌ Error", description: "Unable to delete message.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageName="Welcome Messages">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageName="Welcome Messages">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Welcome Messages
            </h1>
            <p className="text-muted-foreground">
              First messages sent to new subscribers
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Message List */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>All Messages ({messages.length})</span>
              </CardTitle>
              <CardDescription>Click to select and edit</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No messages yet</p>
                      <Button variant="link" onClick={handleAddNew}>Create your first message</Button>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedId(msg.id)}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          selectedId === msg.id 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{msg.name}</h4>
                              <Badge variant={msg.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                                {msg.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {msg.text_content || msg.title || "Template message"}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {msg.text_content ? "Text" : "Template"}
                              </Badge>
                              {msg.buttons && (msg.buttons as any[]).length > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {(msg.buttons as any[]).length} button(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                          {selectedId === msg.id && (
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel - Editor */}
          <div className="lg:col-span-8 space-y-4">
            {selectedMessage ? (
              <>
                {/* Editor Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Message
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={openJsonDialog}>
                          <Code className="h-4 w-4 mr-1" />
                          JSON
                        </Button>
                        <Button variant="outline" size="sm" onClick={copyJSON}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={deleting}>
                          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Name & Status */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Message Name
                        </Label>
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter message name..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <ToggleLeft className="h-3 w-3" />
                          Status
                        </Label>
                        <div className="flex items-center gap-3 h-10">
                          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                          <span className={cn("text-sm", isEnabled ? "text-green-600" : "text-muted-foreground")}>
                            {isEnabled ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Message Type Tabs */}
                    <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "text" | "template")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="template" className="gap-2">
                          <Image className="h-4 w-4" />
                          Template (Rich)
                        </TabsTrigger>
                        <TabsTrigger value="text" className="gap-2">
                          <Type className="h-4 w-4" />
                          Simple Text
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="text" className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Message Text</Label>
                          <Textarea
                            placeholder="Enter your welcome message text..."
                            value={textMessage}
                            onChange={(e) => setTextMessage(e.target.value)}
                            className="min-h-32"
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="template" className="mt-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              Image URL (optional)
                            </Label>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={templateElement.image_url}
                              onChange={(e) => setTemplateElement({ ...templateElement, image_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              placeholder="Welcome!"
                              value={templateElement.title}
                              onChange={(e) => setTemplateElement({ ...templateElement, title: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Subtitle / Description</Label>
                          <Textarea
                            placeholder="Thank you for connecting with us..."
                            value={templateElement.subtitle}
                            onChange={(e) => setTemplateElement({ ...templateElement, subtitle: e.target.value })}
                            className="min-h-20"
                          />
                        </div>
                        
                        {/* Buttons Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              Buttons ({templateElement.buttons.length}/3)
                            </Label>
                            {templateElement.buttons.length < 3 && (
                              <Button variant="outline" size="sm" onClick={addButton}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Button
                              </Button>
                            )}
                          </div>
                          
                          {templateElement.buttons.map((btn, idx) => (
                            <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg border">
                              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                                <Input
                                  placeholder="Button text"
                                  value={btn.title}
                                  onChange={(e) => updateButton(idx, "title", e.target.value)}
                                />
                                <Input
                                  placeholder="https://..."
                                  value={btn.url}
                                  onChange={(e) => updateButton(idx, "url", e.target.value)}
                                />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeButton(idx)} className="shrink-0">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Save Button */}
                    <Button 
                      onClick={handleSave} 
                      disabled={saving || !hasChanges} 
                      className={cn(
                        "w-full transition-all duration-300",
                        hasChanges 
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30" 
                          : ""
                      )} 
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : hasChanges ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-sm mx-auto">
                      <div className="bg-muted rounded-2xl overflow-hidden shadow-lg">
                        {messageType === 'template' && templateElement.image_url && (
                          <div 
                            className="h-40 bg-cover bg-center bg-gray-300"
                            style={{ backgroundImage: `url(${templateElement.image_url})` }}
                          />
                        )}
                        <div className="p-4">
                          {messageType === 'text' ? (
                            <p className="whitespace-pre-line">{textMessage || "Your message text here..."}</p>
                          ) : (
                            <>
                              <h4 className="font-semibold text-lg">{templateElement.title || "Title"}</h4>
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                {templateElement.subtitle || "Subtitle / description text"}
                              </p>
                            </>
                          )}
                        </div>
                        {messageType === 'template' && templateElement.buttons.length > 0 && (
                          <div className="border-t">
                            {templateElement.buttons.map((btn, i) => (
                              <div 
                                key={i} 
                                className="py-3 px-4 text-center text-sm font-medium text-primary border-b last:border-b-0 hover:bg-primary/5 cursor-pointer"
                              >
                                {btn.title || "Button"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Message Selected</h3>
                  <p className="text-muted-foreground mb-4">Select a message from the list or create a new one</p>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Message
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* JSON Dialog */}
      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Messenger JSON Payload
            </DialogTitle>
            <DialogDescription>
              View or edit the raw JSON that will be sent to Messenger API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={jsonEditMode} onCheckedChange={setJsonEditMode} />
              <Label>Edit Mode</Label>
            </div>
            <ScrollArea className="h-[400px] rounded-lg border">
              {jsonEditMode ? (
                <Textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm border-0 focus-visible:ring-0"
                />
              ) : (
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {jsonContent}
                </pre>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(jsonContent);
              toast({ title: "📋 Copied!" });
            }}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            {jsonEditMode && (
              <Button onClick={applyJsonChanges}>
                <Check className="h-4 w-4 mr-1" />
                Apply Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMessage?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
