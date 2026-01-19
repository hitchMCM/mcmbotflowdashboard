import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Send, Save, Eye, Plus, Trash2, Copy, Loader2, X, Code, 
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
import { MessageEditor, MessagePreview, generateMessengerPayload, convertLegacyToMessageContent, convertMessageContentToLegacy, parseMessengerPayload } from "@/components/messages";
import { MessageContent, FACEBOOK_MESSAGE_TYPE_LABELS } from "@/types/messages";

const defaultMessageContent: MessageContent = {
  message_type: 'generic',
  elements: [{
    title: "Broadcast Message",
    subtitle: "This message will be sent to all your subscribers.",
    image_url: "",
    buttons: []
  }]
};

export default function Broadcasts() {
  const { currentPage } = usePage();
  const { messages, loading, createMessage, updateMessage, deleteMessage, refetch } = useMessages('broadcast');
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
  
  // Local editing state - using new MessageContent type
  const [editName, setEditName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [messageContent, setMessageContent] = useState<MessageContent>(defaultMessageContent);

  const selectedMessage = messages.find(m => m.id === selectedId) || null;

  // Sort messages by creation date (most recent first)
  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Auto-select first message if none selected
  useEffect(() => {
    if (sortedMessages.length > 0 && !selectedId) {
      setSelectedId(sortedMessages[0].id);
    }
  }, [sortedMessages, selectedId]);

  // Load message data when selection changes
  useEffect(() => {
    if (selectedMessage) {
      setEditName(selectedMessage.name);
      setIsEnabled(selectedMessage.is_active);
      
      // Convert legacy format to new MessageContent
      const content = convertLegacyToMessageContent({
        text_content: selectedMessage.text_content,
        title: selectedMessage.title,
        subtitle: selectedMessage.subtitle,
        image_url: selectedMessage.image_url,
        buttons: selectedMessage.buttons as any[],
        messenger_payload: selectedMessage.messenger_payload
      });
      setMessageContent(content);
      
      // Store original data for change detection
      originalDataRef.current = JSON.stringify({
        name: selectedMessage.name,
        is_active: selectedMessage.is_active,
        content: content
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
      content: messageContent
    });
    
    setHasChanges(currentData !== originalDataRef.current);
  }, [editName, isEnabled, messageContent, selectedMessage]);

  const generateJSON = () => {
    return generateMessengerPayload(messageContent);
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
      const newContent = parseMessengerPayload(parsed);
      setMessageContent(newContent);
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
      // Convert MessageContent to legacy format for database
      const legacyData = convertMessageContentToLegacy(messageContent); 
      await updateMessage(selectedMessage.id, {
        name: editName,
        is_active: isEnabled,
        ...legacyData
      });
      
      // Update original data reference after successful save
      originalDataRef.current = JSON.stringify({
        name: editName,
        is_active: isEnabled,
        content: messageContent
      });
      setHasChanges(false);
      
      toast({ title: "✅ Saved!", description: "Broadcast updated." });
      await refetch();
    } catch (error) {
      toast({ title: "❌ Error", description: "Unable to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    try {
      const defaultContent = defaultMessageContent.elements?.[0];
      const created = await createMessage({
        name: `Broadcast ${messages.length + 1}`,
        category: 'broadcast',
        title: defaultContent?.title || "Broadcast Message",
        subtitle: defaultContent?.subtitle || "",
        is_active: true
      });
      if (created) {
        await refetch();
        setSelectedId(created.id);
        toast({ title: "✅ Created!", description: "New broadcast added." });
      } else {
        toast({ title: "❌ Error", description: "Unable to create broadcast. Check console for details.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Create error:', error);
      toast({ title: "❌ Error", description: "Unable to create broadcast.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    
    setDeleting(true);
    try {
      const success = await deleteMessage(selectedMessage.id);
      if (success) {
        toast({ title: "🗑️ Deleted!", description: "Broadcast removed." });
        setSelectedId(null);
        await refetch();
      } else {
        toast({ title: "❌ Error", description: "Unable to delete broadcast.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: "❌ Error", description: "Unable to delete broadcast.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageName="Broadcasts">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageName="Broadcasts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Broadcasts
            </h1>
            <p className="text-muted-foreground">
              Mass messages to all subscribers
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Message List */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>All Broadcasts ({messages.length})</span>
              </CardTitle>
              <CardDescription>Click to select and edit</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {sortedMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No broadcasts yet</p>
                      <Button variant="link" onClick={handleAddNew}>Create your first broadcast</Button>
                    </div>
                  ) : (
                    sortedMessages.map((msg) => {
                      return (
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={msg.is_active ? "default" : "secondary"} className="text-[10px]">
                                  {msg.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <h4 className="font-medium truncate mt-1">{msg.name}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {msg.text_content || msg.title || "Template message"}
                              </p>
                            </div>
                            {selectedId === msg.id && (
                              <Check className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })
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
                        Edit Broadcast
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
                          Broadcast Name
                        </Label>
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter broadcast name..."
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

                    {/* Message Editor Component */}
                    <MessageEditor 
                      value={messageContent}
                      onChange={setMessageContent}
                      showQuickReplies={true}
                    />

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
                      <Badge variant="outline" className="ml-2">
                        {FACEBOOK_MESSAGE_TYPE_LABELS[messageContent.message_type]}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MessagePreview content={messageContent} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Send className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Broadcast Selected</h3>
                  <p className="text-muted-foreground mb-4">Select a broadcast from the list or create a new one</p>
                  <Button onClick={handleAddNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Broadcast
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
            <AlertDialogTitle>Delete Broadcast?</AlertDialogTitle>
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
