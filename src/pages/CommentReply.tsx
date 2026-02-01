import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  MessageCircle, Save, Plus, Trash2, Copy, Loader2, User, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TagAutocompleteTextarea, PERSONALIZATION_TAGS } from "@/components/ui/TagAutocompleteTextarea";
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

export default function CommentReply() {
  const { currentPage } = usePage();
  const { messages, loading, createMessage, updateMessage, deleteMessage, refetch } = useMessages({ category: 'comment_reply' });
  const { toast } = useToast();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Store original data to compare for changes
  const originalDataRef = useRef<string>("");
  
  // Local editing state - simple text only
  const [editName, setEditName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [replyText, setReplyText] = useState("");

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
      setReplyText(selectedMessage.text_content || "");
      
      // Store original data for change detection
      originalDataRef.current = JSON.stringify({
        name: selectedMessage.name,
        is_active: selectedMessage.is_active,
        text_content: selectedMessage.text_content || ""
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
      text_content: replyText
    });
    
    setHasChanges(currentData !== originalDataRef.current);
  }, [editName, isEnabled, replyText, selectedMessage]);



  const handleSave = async () => {
    if (!selectedMessage) return;
    setSaving(true);
    try {
      console.log('[CommentReply] Saving message:', selectedMessage.id);
      console.log('[CommentReply] Data:', { name: editName, is_active: isEnabled, text_content: replyText });
      
      // Note: keywords not saved to DB yet - column doesn't exist
      // TODO: Add keywords column to messages table
      const success = await updateMessage(selectedMessage.id, {
        name: editName,
        is_active: isEnabled,
        text_content: replyText,
      });
      
      console.log('[CommentReply] Update result:', success);
      
      if (!success) {
        throw new Error('Update returned false');
      }
      
      // Update original data reference after successful save
      originalDataRef.current = JSON.stringify({
        name: editName,
        is_active: isEnabled,
        text_content: replyText
      });
      setHasChanges(false);
      
      toast({ title: "✅ Saved!", description: "Comment reply updated." });
      await refetch();
    } catch (error) {
      console.error('[CommentReply] Save error:', error);
      toast({ title: "❌ Error", description: "Unable to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    try {
      const created = await createMessage({
        name: `Comment Reply ${messages.length + 1}`,
        category: 'comment_reply',
        text_content: "Thanks for your comment! 🙏",
        is_active: true,
      });
      
      if (created) {
        setSelectedId(created.id);
        toast({ title: "✅ Created", description: "New comment reply created." });
        await refetch();
      }
    } catch (error) {
      console.error('Error creating comment reply:', error);
      toast({ title: "❌ Error", description: "Unable to create.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    setDeleting(true);
    try {
      await deleteMessage(selectedMessage.id);
      setShowDeleteDialog(false);
      setSelectedId(null);
      toast({ title: "🗑️ Deleted", description: "Comment reply deleted." });
      await refetch();
    } catch (error) {
      toast({ title: "❌ Error", description: "Unable to delete.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedMessage) return;
    try {
      const created = await createMessage({
        name: `${editName} (Copy)`,
        category: 'comment_reply',
        text_content: replyText,
        is_active: isEnabled,
      });
      
      if (created) {
        setSelectedId(created.id);
        toast({ title: "📋 Duplicated", description: "Comment reply copied." });
        await refetch();
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Unable to duplicate.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout pageName="Comment Reply">
      <div className="h-[calc(100vh-120px)] flex gap-6">
        {/* Left Panel - Message List */}
        <Card className="w-80 flex-shrink-0 glass border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Comment Replies
                </CardTitle>
                <CardDescription className="text-xs">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={handleAddNew}
                className="h-8 bg-gradient-primary gap-1"
              >
                <Plus className="h-3 w-3" />
                New
              </Button>
            </div>
          </CardHeader>
          <Separator className="bg-white/10" />
          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comment replies yet</p>
                  <p className="text-xs">Click "New" to create one</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedId(msg.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all",
                      "hover:bg-white/10 border border-transparent",
                      selectedId === msg.id 
                        ? "bg-primary/20 border-primary/50" 
                        : "bg-white/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{msg.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {msg.text_content?.slice(0, 50) || "No content"}
                        </p>
                      </div>
                      <Badge 
                        variant={msg.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] h-5",
                          msg.is_active ? "bg-green-500/20 text-green-400" : ""
                        )}
                      >
                        {msg.is_active ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    {msg.keywords && msg.keywords.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {msg.keywords.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] h-4 px-1">
                            {kw}
                          </Badge>
                        ))}
                        {msg.keywords.length > 3 && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            +{msg.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right Panel - Editor */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedMessage ? (
            <>
              {/* Header */}
              <Card className="glass border-white/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-gradient-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="font-semibold text-lg bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                        placeholder="Reply name..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Text Message Reply
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor="active" className="text-xs text-muted-foreground">Active</Label>
                      <Switch
                        id="active"
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDuplicate}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={saving || !hasChanges}
                      className={cn(
                        "gap-2 transition-all duration-300",
                        hasChanges 
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30" 
                          : "bg-gradient-primary"
                      )}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : hasChanges ? (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Saved
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Reply Text Editor */}
              <Card className="glass border-white/10 flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Reply Message
                  </CardTitle>
                  <CardDescription>
                    This text will be sent as a reply to comments
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  {/* Personalization Tags Info */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <User className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-300 font-medium">Personalization Tags</p>
                      <p className="text-xs text-blue-400/70">{"Type {{ to insert: {{FullName}}, {{FirstName}}, {{LastName}}"}</p>
                    </div>
                    <div className="flex gap-1">
                      {PERSONALIZATION_TAGS.map(tag => (
                        <Badge 
                          key={tag.tag} 
                          variant="outline" 
                          className="text-[10px] cursor-pointer hover:bg-blue-500/20 border-blue-500/30"
                          onClick={() => setReplyText(prev => prev + tag.tag)}
                        >
                          {tag.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <TagAutocompleteTextarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Enter your reply message here...

Example: Hi {{FirstName}}! Thanks for your comment! 🙏 Check out our latest offers at example.com"
                    className="flex-1 min-h-[200px] bg-white/5 border-white/10 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {replyText.length} / 2000 characters
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports emojis, links & personalization tags
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass border-white/10 flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Select a comment reply to edit</p>
                <p className="text-sm">or create a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment Reply?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedMessage?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
