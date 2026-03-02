import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Eye, Plus, Trash2, Copy, Loader2, Code, Send,
  ToggleLeft, FileText, Pencil, Check, Zap, RefreshCw, Save, CheckCircle, Files,
  BookOpen, ChevronDown, ChevronUp, Hash, Type, Image, MousePointerClick, Globe, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMessages } from "@/hooks/useMessages";
import { usePage } from "@/contexts/PageContext";
import { useToast } from "@/hooks/use-toast";
import { useUtilityTemplates, UtilityTemplateStatus as UtilityStatusType } from "@/hooks/useUtilityTemplates";
import { supabase } from "@/integrations/supabase/client";
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
import { UtilityTemplateStatusBadge, UtilityTemplateStatusPanel } from "@/components/messages/UtilityTemplateStatus";
import { MessageContent, FACEBOOK_MESSAGE_TYPE_LABELS, UtilityContent, Message } from "@/types/messages";

// Helper: extract Meta template data stored in messenger_payload._meta_template
// (utility_template_* columns do NOT exist in the DB — everything is in this JSON field)
function getMetaTemplate(msg: Message | null | undefined): {
  template_id?: string;
  template_name?: string;
  template_status?: string;
  template_language?: string;
  rejection_reason?: string;
  submitted_at?: string;
} | null {
  if (!msg) return null;
  return (msg.messenger_payload as any)?._meta_template || null;
}

const defaultUtilityContent: MessageContent = {
  message_type: 'utility',
  utility: {
    template_name: "",
    language: "en",
    header_format: "NONE",
    header_text: "",
    header_image_url: "",
    body_text: "Your order #{{1}} is on its way!",
    footer_text: "",
    buttons: [],
    example_values: ["566701"],
  }
};

export default function UtilityMessages() {
  const { currentPage, pages } = usePage();
  const { messages, loading, createMessage, updateMessage, deleteMessage, refetch } = useMessages('broadcast');
  const { toast } = useToast();
  const { submitting: utilitySubmitting, createAndSubmitTemplate, checkTemplateStatus } = useUtilityTemplates();
  const [utilityRefreshing, setUtilityRefreshing] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonContent, setJsonContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSubmitError, setLastSubmitError] = useState<string | null>(null);
  const [lastSentPayload, setLastSentPayload] = useState<string | null>(null);

  // Clone from another page
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSourcePageId, setCloneSourcePageId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  // Guide section
  const [showGuide, setShowGuide] = useState(false);
  
  const originalDataRef = useRef<string>("");
  
  const [editName, setEditName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [messageContent, setMessageContent] = useState<MessageContent>(defaultUtilityContent);

  // Auto-assign legacy utility messages (no _page_id) to the current page
  const [legacyMigrated, setLegacyMigrated] = useState(false);
  useEffect(() => {
    // Don't run while messages are still loading, or if already migrated
    if (loading || !currentPage?.id || legacyMigrated) return;
    // Only consider utility messages
    const allUtility = messages.filter(m => {
      const payload = m.messenger_payload as any;
      return payload?._message_content?.message_type === 'utility';
    });
    // If there are no utility messages at all, nothing to migrate
    if (allUtility.length === 0) {
      setLegacyMigrated(true);
      return;
    }
    const legacyMsgs = allUtility.filter(m => {
      const payload = m.messenger_payload as any;
      return !payload?._page_id;
    });
    if (legacyMsgs.length === 0) {
      setLegacyMigrated(true);
      return;
    }
    // Patch each legacy message with _page_id in the DB
    console.log(`[UtilityMessages] Found ${legacyMsgs.length} legacy utility messages without _page_id, assigning to page ${currentPage.id}`);
    (async () => {
      for (const msg of legacyMsgs) {
        const existingPayload = (msg.messenger_payload as Record<string, any>) || {};
        const updatedPayload = { ...existingPayload, _page_id: currentPage.id };
        const { error } = await supabase.from('messages').update({ messenger_payload: updatedPayload }).eq('id', msg.id);
        if (error) {
          console.error(`[UtilityMessages] Failed to assign _page_id to message ${msg.id}:`, error);
        } else {
          console.log(`[UtilityMessages] Assigned _page_id=${currentPage.id} to legacy message ${msg.id}`);
        }
      }
      setLegacyMigrated(true);
      await refetch();
    })();
  }, [messages, loading, currentPage?.id, legacyMigrated, refetch]);

  // Filter only utility messages from broadcast category, scoped to the current page
  const utilityMessages = useMemo(() => {
    if (!currentPage?.id) return [];
    return messages.filter(m => {
      const payload = m.messenger_payload as any;
      if (payload?._message_content?.message_type !== 'utility') return false;
      // Strictly match page_id
      return payload?._page_id === currentPage.id;
    });
  }, [messages, currentPage?.id]);

  const sortedMessages = useMemo(() => 
    [...utilityMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [utilityMessages]
  );

  const selectedMessage = utilityMessages.find(m => m.id === selectedId) || null;

  // Reset selection when page changes
  useEffect(() => {
    setSelectedId(null);
  }, [currentPage?.id]);

  // Auto-select first message
  useEffect(() => {
    if (sortedMessages.length > 0 && !selectedId) {
      setSelectedId(sortedMessages[0].id);
    }
  }, [sortedMessages.length, selectedId]);

  // Load message data when selection changes
  useEffect(() => {
    if (selectedMessage) {
      setEditName(selectedMessage.name);
      setIsEnabled(selectedMessage.is_active);
      
      const content = convertLegacyToMessageContent({
        text_content: selectedMessage.text_content,
        title: selectedMessage.title,
        subtitle: selectedMessage.subtitle,
        image_url: selectedMessage.image_url,
        buttons: selectedMessage.buttons as any[],
        messenger_payload: selectedMessage.messenger_payload
      });
      console.log('[UtilityMessages] Loaded content:', JSON.stringify(content));
      console.log('[UtilityMessages] utility field:', content.utility);
      console.log('[UtilityMessages] currentPage:', currentPage?.facebook_page_id, 'access_token:', currentPage?.access_token ? 'SET' : 'MISSING');
      setMessageContent(content);
      
      originalDataRef.current = JSON.stringify({
        name: selectedMessage.name,
        is_active: selectedMessage.is_active,
        content: content
      });
      setHasChanges(false);
    }
  }, [selectedMessage]);

  // Detect changes
  useEffect(() => {
    if (!selectedMessage) return;
    const currentData = JSON.stringify({
      name: editName,
      is_active: isEnabled,
      content: messageContent
    });
    setHasChanges(currentData !== originalDataRef.current);
  }, [editName, isEnabled, messageContent, selectedMessage]);

  const generateJSON = () => generateMessengerPayload(messageContent);

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, 2));
    toast({ title: "📋 Copied!", description: "JSON copied to clipboard" });
  };

  const openJsonDialog = () => {
    // For utility messages, show the editable internal MessageContent format
    // (the Messenger API payload is lossy and can't be round-tripped)
    if (messageContent.message_type === 'utility') {
      setJsonContent(JSON.stringify(messageContent, null, 2));
    } else {
      setJsonContent(JSON.stringify(generateJSON(), null, 2));
    }
    setJsonEditMode(false);
    setShowJsonDialog(true);
  };

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      // If the parsed JSON has message_type, it's the internal MessageContent format
      if (parsed.message_type) {
        setMessageContent(parsed as MessageContent);
      } else {
        // Fallback: try parsing as Messenger API payload
        const newContent = parseMessengerPayload(parsed);
        setMessageContent(newContent);
      }
      setShowJsonDialog(false);
      toast({ title: "✅ Applied!" });
    } catch (e) {
      toast({ title: "❌ Invalid JSON", description: "Please check your JSON syntax", variant: "destructive" });
    }
  };

  const handleSaveAndSubmit = async () => {
    console.log('[UtilityMessages] handleSaveAndSubmit called');
    console.log('[UtilityMessages] selectedMessage:', selectedMessage?.id);
    console.log('[UtilityMessages] messageContent:', JSON.stringify(messageContent));
    console.log('[UtilityMessages] currentPage:', currentPage?.facebook_page_id, 'token:', currentPage?.access_token ? 'SET' : 'MISSING');
    
    if (!selectedMessage) {
      toast({ title: "⚠️ No template", description: "Select or create a template first.", variant: "destructive" });
      return;
    }
    if (!messageContent.utility) {
      toast({ title: "⚠️ Type error", description: "This message is not a utility type. Recreate it.", variant: "destructive" });
      return;
    }
    if (!messageContent.utility.template_name?.trim()) {
      toast({ title: "⚠️ Template name required", description: "Fill in the 'Template Name' field in the editor above.", variant: "destructive" });
      return;
    }
    if (!messageContent.utility.body_text?.trim()) {
      toast({ title: "⚠️ Body text required", description: "Fill in the 'Body (main text)' field in the editor above.", variant: "destructive" });
      return;
    }
    if (!currentPage?.facebook_page_id) {
      toast({ title: "⚠️ Page not configured", description: "No Facebook Page ID found. Configure your page in Configuration.", variant: "destructive" });
      return;
    }
    if (!currentPage?.access_token) {
      toast({ title: "⚠️ Token missing", description: "No access token found for this page. Reconnect your page.", variant: "destructive" });
      return;
    }

    // Step 1: Save first (silently — no toast yet)
    setSaving(true);
    try {
      const legacyData = convertMessageContentToLegacy(messageContent);

      // Preserve _page_id and _meta_template from existing messenger_payload
      const existingPayload = (selectedMessage.messenger_payload as Record<string, any>) || {};
      legacyData.messenger_payload = {
        ...legacyData.messenger_payload,
        _page_id: existingPayload._page_id || currentPage?.id || null,
        _meta_template: existingPayload._meta_template || undefined,
      };

      const saveOk = await updateMessage(selectedMessage.id, {
        name: editName,
        is_active: isEnabled,
        ...legacyData,
      });
      if (!saveOk) {
        toast({ title: "❌ Save error", description: "Unable to save before submission.", variant: "destructive" });
        setSaving(false);
        return;
      }
      originalDataRef.current = JSON.stringify({ name: editName, is_active: isEnabled, content: messageContent });
      setHasChanges(false);
    } catch (err: any) {
      console.error('[UtilityMessages] Save before submit error:', err);
      toast({ title: "❌ Save error", description: err?.message || "Unknown error.", variant: "destructive" });
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }

    // Step 2: Submit to Meta
    setLastSubmitError(null);
    // Store the payload that will be sent for debugging
    try {
      const debugComponents = JSON.stringify(messageContent.utility, null, 2);
      setLastSentPayload(debugComponents);
    } catch (e) { /* ignore */ }
    console.log('[UtilityMessages] Submitting to Meta for message:', selectedMessage.id);
    const result = await createAndSubmitTemplate(selectedMessage.id, messageContent.utility);
    console.log('[UtilityMessages] Meta submission result:', result);

    if (result.success) {
      setLastSubmitError(null);
      toast({
        title: result.status === 'APPROVED' ? "✅ Template approved!" : "📩 Template submitted to Meta",
        description: result.status === 'APPROVED'
          ? `Template approved immediately! ID: ${result.template_id}`
          : `Status: ${result.status || 'PENDING'}. The template is being reviewed.`,
      });
      // Show warning if header was skipped
      if (result.warning) {
        setTimeout(() => {
          toast({
            title: "⚠️ Header image skipped",
            description: result.warning,
          });
        }, 1500);
      }
    } else {
      const errMsg = result.error || "Meta did not accept the template.";
      setLastSubmitError(errMsg);
      toast({
        title: "❌ Meta submission error",
        description: errMsg,
        variant: "destructive",
      });
    }

    await refetch();
  };

  const handleRefreshUtilityStatus = async () => {
    const meta = getMetaTemplate(selectedMessage);
    if (!meta?.template_id) return;
    setUtilityRefreshing(true);
    try {
      const result = await checkTemplateStatus(meta.template_id);
      if (result.success && result.status) {
        // Read current messenger_payload, update _meta_template.template_status
        const currentPayload = (selectedMessage?.messenger_payload as Record<string, any>) || {};
        const updatedPayload = {
          ...currentPayload,
          _meta_template: {
            ...currentPayload._meta_template,
            template_status: result.status,
            rejection_reason: result.rejection_reason || null,
          },
        };
        const success = await updateMessage(selectedMessage!.id, {
          messenger_payload: updatedPayload,
        });
        if (!success) {
          console.warn('[UtilityMessages] Could not update template status');
        }
        toast({ title: "🔄 Status updated", description: `Status: ${result.status}` });
        await refetch();
      }
    } finally {
      setUtilityRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMessage) return;
    setSaving(true);
    try {
      const legacyData = convertMessageContentToLegacy(messageContent);

      // Preserve _page_id and _meta_template from existing messenger_payload
      const existingPayload = (selectedMessage.messenger_payload as Record<string, any>) || {};
      legacyData.messenger_payload = {
        ...legacyData.messenger_payload,
        _page_id: existingPayload._page_id || currentPage?.id || null,
        _meta_template: existingPayload._meta_template || undefined,
      };

      const success = await updateMessage(selectedMessage.id, {
        name: editName,
        is_active: isEnabled,
        ...legacyData
      });

      if (success) {
        originalDataRef.current = JSON.stringify({
          name: editName,
          is_active: isEnabled,
          content: messageContent
        });
        setHasChanges(false);
        toast({ title: "✅ Saved!", description: "Utility template updated." });
        await refetch();
      } else {
        toast({ title: "❌ Error", description: "Unable to save. Check console for details.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('[UtilityMessages] Save error:', error);
      toast({ title: "❌ Error", description: error?.message || "Unable to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!currentPage?.id) {
      toast({ title: "⚠️ No page selected", description: "Select a page first before creating a utility template.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createMessage({
        name: `Utility Template ${utilityMessages.length + 1}`,
        category: 'broadcast',
        title: 'Utility Template',
        subtitle: '',
        is_active: true,
        messenger_payload: {
          _page_id: currentPage.id,
          _message_content: {
            message_type: 'utility',
            utility: {
              template_name: '',
              language: 'en',
              header_format: 'NONE',
              header_text: '',
              header_image_url: '',
              body_text: '',
              footer_text: '',
              buttons: [],
              example_values: [],
            }
          }
        },
      });

      if (created) {
        await refetch();
        setSelectedId(created.id);
        toast({ title: "✅ Created!", description: "New utility template added." });
      } else {
        toast({ title: "❌ Error", description: "Unable to create template.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('[UtilityMessages] Create error:', error);
      toast({ title: "❌ Error", description: error?.message || "Unable to create template.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    setDeleting(true);
    try {
      const success = await deleteMessage(selectedMessage.id);
      if (success) {
        toast({ title: "🗑️ Deleted!", description: "Utility template removed." });
        setSelectedId(null);
        await refetch();
      } else {
        toast({ title: "❌ Error", description: "Unable to delete.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Unable to delete.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ====== CLONE FROM ANOTHER PAGE ======
  // Get utility messages for a given page from the full messages list
  const getUtilityMessagesForPage = useCallback((pageId: string) => {
    return messages.filter(m => {
      const payload = m.messenger_payload as any;
      if (payload?._message_content?.message_type !== 'utility') return false;
      return payload?._page_id === pageId;
    });
  }, [messages]);

  const handleCloneFromPage = async () => {
    if (!cloneSourcePageId || !currentPage?.id) return;
    setCloning(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const sourceTemplates = getUtilityMessagesForPage(cloneSourcePageId);
      if (sourceTemplates.length === 0) {
        toast({ title: '⚠️ No templates', description: 'The selected page has no utility templates to clone.', variant: 'destructive' });
        setCloning(false);
        return;
      }

      for (const srcMsg of sourceTemplates) {
        try {
          const content = convertLegacyToMessageContent({
            text_content: srcMsg.text_content,
            title: srcMsg.title,
            subtitle: srcMsg.subtitle,
            image_url: srcMsg.image_url,
            buttons: srcMsg.buttons as any[],
            messenger_payload: srcMsg.messenger_payload
          });

          const legacyData = convertMessageContentToLegacy(content);
          // Assign to current page and clear Meta template data (needs manual resubmission)
          legacyData.messenger_payload = {
            ...legacyData.messenger_payload,
            _page_id: currentPage.id,
            _meta_template: undefined, // Draft — user must submit to Meta manually
          };

          const created = await createMessage({
            name: srcMsg.name,
            category: 'broadcast',
            title: srcMsg.title || 'Utility Template',
            subtitle: srcMsg.subtitle || '',
            is_active: false, // Draft — inactive by default
            ...legacyData,
          });

          if (created) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`[UtilityMessages] Clone template ${srcMsg.id} failed:`, err);
          failCount++;
        }
      }

      await refetch();
      setShowCloneDialog(false);
      setCloneSourcePageId(null);

      if (successCount > 0) {
        toast({
          title: `✅ Cloned ${successCount} template${successCount > 1 ? 's' : ''}`,
          description: failCount > 0
            ? `${failCount} failed. Cloned templates saved as drafts.`
            : 'All templates cloned as drafts. Submit each one to Meta for approval.',
        });
      } else {
        toast({ title: '❌ Clone failed', description: 'Could not clone any template.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('[UtilityMessages] Clone error:', err);
      toast({ title: '❌ Error', description: err?.message || 'Clone failed.', variant: 'destructive' });
    } finally {
      setCloning(false);
    }
  };

  const openCloneDialog = () => {
    setCloneSourcePageId(null);
    setShowCloneDialog(true);
  };

  // Other pages the user owns (excluding current page)
  const otherPages = useMemo(() => {
    if (!currentPage?.id) return pages;
    return pages.filter(p => p.id !== currentPage.id);
  }, [pages, currentPage?.id]);

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'APPROVED': return 'text-green-400';
      case 'PENDING': return 'text-yellow-400';
      case 'REJECTED': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageName="Utility Messages">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageName="Utility Messages">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-400" />
              Utility Messages
            </h1>
            <p className="text-muted-foreground">
              Meta utility templates for <strong>{currentPage?.name || 'no page selected'}</strong> — sendable outside the 24h window
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={openCloneDialog}
              disabled={!currentPage?.id || otherPages.length === 0}
              title={otherPages.length === 0 ? 'No other pages to clone from' : 'Clone all templates from another page'}
              className="gap-2"
            >
              <Files className="h-4 w-4" />
              Clone from Page
            </Button>
            <Button onClick={handleAddNew} disabled={creating || !currentPage?.id} className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Template
            </Button>
          </div>
        </div>

        {/* Step-by-Step Guide */}
        <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-base">How to Create a Utility Template</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>
              Follow these steps to create, configure, and submit your utility template to Meta for approval.
            </CardDescription>
          </CardHeader>
          {showGuide && (
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium">Create a Template</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click <strong>"New Template"</strong> to start. Give it a name (e.g. "Order Delivery Update").
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Hash className="h-3 w-3" /> Template Name</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the Meta template name using <strong>lowercase + underscores</strong> only (e.g. <code className="bg-muted px-1 rounded">order_delivery_update</code>). Must be unique per page.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Globe className="h-3 w-3" /> Language</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the language for this template (English, French, etc.). Must match your Meta Business account settings.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">4</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Image className="h-3 w-3" /> Header (optional)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a header: <strong>None</strong>, <strong>Text</strong> (max 60 chars), or <strong>Image</strong> (820×312px recommended). Text headers support one {'{{1}}'} variable.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">5</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Type className="h-3 w-3" /> Body (required)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Write your main message (max 1024 chars). Use <code className="bg-muted px-1 rounded">{'{{1}}'}</code>, <code className="bg-muted px-1 rounded">{'{{2}}'}</code> for dynamic variables. Example: <em>"Your order #{'{{1}}'} is ready, {'{{2}}'}!"</em>
                    </p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">6</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Buttons (optional)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add up to 10 buttons: <strong>URL</strong> (link to a website) or <strong>Postback</strong> (triggers a bot action). Max 25 chars per button text.
                    </p>
                  </div>
                </div>

                {/* Step 7 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">7</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><ListChecks className="h-3 w-3" /> Variables & Examples</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      For each <code className="bg-muted px-1 rounded">{'{{N}}'}</code> variable, choose the <strong>field</strong> (first name, order ID, etc.) and provide an <strong>example value</strong>. Meta requires examples for approval.
                    </p>
                  </div>
                </div>

                {/* Step 8 */}
                <div className="flex gap-3 p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold shrink-0">8</div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Send className="h-3 w-3" /> Save & Submit</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click <strong>"Save Draft"</strong> to save your work, then <strong>"Save & Submit to Meta"</strong> to send for approval. Meta reviews templates in minutes to 24h.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-medium text-amber-400 mb-2">💡 Tips for Meta Approval</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Template names must be <strong>unique</strong> per page — you cannot reuse a name that was already submitted.</li>
                  <li>Utility templates are for <strong>transactional</strong> messages only (order updates, account alerts, shipping notifications).</li>
                  <li>Avoid <strong>promotional language</strong> (discounts, sales, offers) — Meta will reject them.</li>
                  <li>Always provide <strong>realistic example values</strong> for variables — Meta reviews them.</li>
                  <li>If your template is <strong>rejected</strong>, click "Fix & Resubmit" to modify and retry.</li>
                  <li>Use <strong>"Clone from Page"</strong> to copy templates from another page (saves time if you have multiple pages).</li>
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Template List */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Templates ({utilityMessages.length})</span>
              </CardTitle>
              <CardDescription>Meta utility templates</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {sortedMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No utility templates yet</p>
                      <Button variant="link" onClick={handleAddNew}>Create your first template</Button>
                    </div>
                  ) : (
                    sortedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedId(msg.id)}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          selectedId === msg.id 
                            ? "border-blue-500 bg-blue-500/5 shadow-sm" 
                            : "border-border hover:border-blue-500/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <UtilityTemplateStatusBadge status={getMetaTemplate(msg)?.template_status as UtilityStatusType} />
                              <Badge variant={msg.is_active ? "default" : "secondary"} className="text-[10px]">
                                {msg.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <h4 className="font-medium truncate mt-1">{msg.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {getMetaTemplate(msg)?.template_name || msg.title || "—"}
                            </p>
                          </div>
                          {selectedId === msg.id && (
                            <Check className="h-5 w-5 text-blue-400 shrink-0" />
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
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Template
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
                          Template Name
                        </Label>
                        <Input 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter template name..."
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

                    {/* Message Editor — locked to utility type only */}
                    <MessageEditor 
                      value={messageContent}
                      onChange={setMessageContent}
                      showQuickReplies={false}
                      hideTypeSelector={true}
                      hideTypes={['text', 'generic', 'button', 'media', 'carousel', 'quick_replies', 'image_full', 'opt_in']}
                      utilityTemplateStatus={getMetaTemplate(selectedMessage)?.template_status as UtilityStatusType}
                      utilityTemplateId={getMetaTemplate(selectedMessage)?.template_id}
                      utilityRejectionReason={getMetaTemplate(selectedMessage)?.rejection_reason}
                      onRefreshUtilityStatus={getMetaTemplate(selectedMessage)?.template_id ? handleRefreshUtilityStatus : undefined}
                      utilityRefreshing={utilityRefreshing}
                    />

                    {/* ====== META SUBMISSION SECTION ====== */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Meta Submission
                      </h3>

                      {/* Config warnings */}
                      {!currentPage?.facebook_page_id && (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                          <p className="text-sm text-yellow-400 font-medium">⚠️ Facebook Page not configured</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Go to Configuration to connect your Facebook Page before you can submit.
                          </p>
                        </div>
                      )}
                      {currentPage?.facebook_page_id && !currentPage?.access_token && (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                          <p className="text-sm text-yellow-400 font-medium">⚠️ Access Token missing</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            The page "{currentPage.name}" has no access token. Reconnect it in Configuration.
                          </p>
                        </div>
                      )}

                      {/* Current Meta status */}
                      {getMetaTemplate(selectedMessage)?.template_status ? (
                        <UtilityTemplateStatusPanel
                          status={getMetaTemplate(selectedMessage)?.template_status as UtilityStatusType}
                          templateId={getMetaTemplate(selectedMessage)?.template_id}
                          rejectionReason={getMetaTemplate(selectedMessage)?.rejection_reason}
                          onRefreshStatus={getMetaTemplate(selectedMessage)?.template_id ? handleRefreshUtilityStatus : undefined}
                          refreshing={utilityRefreshing}
                        />
                      ) : (
                        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
                          <p className="text-sm text-muted-foreground text-center">
                            📋 <strong>Not submitted</strong> — This template has not been sent to Meta yet.
                          </p>
                        </div>
                      )}

                      {/* Last error (persistent) — show even when status is REJECTED */}
                      {lastSubmitError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
                          <p className="text-sm text-red-400 font-medium">❌ Last submission error:</p>
                          <p className="text-xs text-red-300 mt-1 break-all">{lastSubmitError}</p>
                          {lastSentPayload && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer">📦 View sent payload</summary>
                              <pre className="text-xs bg-black/30 rounded p-2 mt-1 overflow-auto max-h-48 whitespace-pre-wrap break-all">{lastSentPayload}</pre>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Save Draft button */}
                      <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        variant="outline"
                        className={cn(
                          "w-full transition-all duration-300",
                          hasChanges
                            ? "border-green-500/50 text-green-400 hover:bg-green-500/10 animate-pulse shadow-lg shadow-green-500/20"
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
                            Save Draft
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Draft Saved
                          </>
                        )}
                      </Button>

                      {/* Submit to Meta button */}
                      <Button
                        onClick={handleSaveAndSubmit}
                        disabled={utilitySubmitting || saving}
                        className={cn(
                          "w-full transition-all duration-300",
                          getMetaTemplate(selectedMessage)?.template_status === 'APPROVED'
                            ? "bg-green-600 hover:bg-green-700"
                            : hasChanges
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white animate-pulse shadow-lg shadow-orange-500/30"
                              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        )}
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : utilitySubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Submitting to Meta...
                          </>
                        ) : getMetaTemplate(selectedMessage)?.template_status === 'APPROVED' ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            ✅ Template approved by Meta
                          </>
                        ) : getMetaTemplate(selectedMessage)?.template_status === 'PENDING' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resubmit to Meta
                          </>
                        ) : getMetaTemplate(selectedMessage)?.template_status === 'REJECTED' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Fix & Resubmit
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Save & Submit to Meta
                          </>
                        )}
                      </Button>

                      {/* Debug info — shows why button may not work */}
                      <div className="text-xs text-muted-foreground/60 space-y-0.5 border border-dashed border-muted-foreground/20 rounded p-2">
                        <p>🔍 <strong>Debug:</strong></p>
                        <p>Page ID: {currentPage?.facebook_page_id || '❌ MISSING'}</p>
                        <p>Access Token: {currentPage?.access_token ? '✅ SET' : '❌ MISSING'}</p>
                        <p>Selected message: {selectedMessage?.id ? '✅ ' + selectedMessage.id.slice(0,8) : '❌ None'}</p>
                        <p>Type: {messageContent.message_type || '❌'}</p>
                        <p>utility obj: {messageContent.utility ? '✅' : '❌ UNDEFINED'}</p>
                        <p>template_name: "{messageContent.utility?.template_name || ''}"</p>
                        <p>body_text: "{(messageContent.utility?.body_text || '').slice(0, 40)}"</p>
                        <p>Meta status: {getMetaTemplate(selectedMessage)?.template_status || 'Not submitted'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                      <Badge variant="outline" className="ml-2 text-blue-400 border-blue-500/30">
                        Utility Template
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
                  <Zap className="h-12 w-12 text-blue-400/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Template Selected</h3>
                  <p className="text-muted-foreground mb-4">Select a template from the list or create a new one</p>
                  <Button onClick={handleAddNew} className="bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Template
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
              View or edit the raw JSON for this utility template
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

      {/* Clone from Page Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Files className="h-5 w-5 text-blue-400" />
              Clone Templates from Another Page
            </DialogTitle>
            <DialogDescription>
              Select a page to clone all its utility templates into <strong>{currentPage?.name || 'current page'}</strong>. They will be saved as drafts — you will need to submit each one to Meta manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {otherPages.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No other pages available</p>
              </div>
            ) : (
              <>
                <Label className="text-sm">Select source page</Label>
                <ScrollArea className="max-h-[350px]">
                  <div className="space-y-2">
                    {otherPages.map(page => {
                      const isSelected = cloneSourcePageId === page.id;
                      const templateCount = getUtilityMessagesForPage(page.id).length;
                      return (
                        <div
                          key={page.id}
                          onClick={() => setCloneSourcePageId(isSelected ? null : page.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected
                              ? "border-blue-500 bg-blue-500/5 shadow-sm"
                              : "border-border hover:border-muted-foreground/50"
                          )}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            isSelected ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {page.avatar_url && (
                              <img src={page.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{page.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{page.facebook_page_id}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {templateCount} template{templateCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                {cloneSourcePageId && (
                  <div className="rounded-lg bg-muted/30 border border-dashed p-3 text-sm text-muted-foreground">
                    <strong>{getUtilityMessagesForPage(cloneSourcePageId).length}</strong> template(s) will be cloned as <Badge variant="secondary" className="text-[10px] ml-1">Draft</Badge> into <strong>{currentPage?.name}</strong>.
                    You will need to submit each to Meta for approval.
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)} disabled={cloning}>
              Cancel
            </Button>
            <Button
              onClick={handleCloneFromPage}
              disabled={cloning || !cloneSourcePageId || getUtilityMessagesForPage(cloneSourcePageId || '').length === 0}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {cloning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cloning...
                </>
              ) : (
                <>
                  <Files className="h-4 w-4 mr-2" />
                  Clone All Templates
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
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
