import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, Users, Plus, Copy, Trash2, Loader2, Sun, Moon, Monitor, Key, Eye, EyeOff, Pencil, Save, HardDrive, Link2, CheckCircle2, ArrowRight, ExternalLink, Unplug } from "lucide-react";
import { useGoogleDriveConnection } from "@/hooks/useAutoPost";
import { extractGoogleDriveFolderId } from "@/types/autoPost";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePage } from "@/contexts/PageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/components/auth/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { ScrollArea } from "@/components/ui/scroll-area";

const tabs = [
  { id: "general", icon: SettingsIcon },
  { id: "pages", icon: Globe },
  { id: "integrations", icon: Link2 },
  { id: "team", icon: Users },
];

interface Page {
  id: string;
  name: string;
  facebook_page_id: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
  access_token?: string | null;
  // Statistics columns
  total_sent?: number;
  total_delivered?: number;
  total_read?: number;
  total_clicks?: number;
  total_subscribers?: number;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme, language, setLanguage, timezone, setTimezone, t, saveSettingsToDatabase, isSaving } = useSettings();
  const { pages, refreshPages, currentPage } = usePage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Add page dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageId, setNewPageId] = useState("");
  const [newWebhookToken, setNewWebhookToken] = useState("");
  const [newAppTokens, setNewAppTokens] = useState<string[]>(Array(20).fill(""));
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [showAppTokens, setShowAppTokens] = useState<boolean[]>(Array(20).fill(false));
  const [addingPage, setAddingPage] = useState(false);
  
  // Edit page dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editPageName, setEditPageName] = useState("");
  const [editWebhookToken, setEditWebhookToken] = useState("");
  const [editAppTokens, setEditAppTokens] = useState<string[]>(Array(20).fill(""));
  const [showEditWebhookToken, setShowEditWebhookToken] = useState(false);
  const [showEditAppTokens, setShowEditAppTokens] = useState<boolean[]>(Array(20).fill(false));
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Token visibility for page list
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  
  // Delete page dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

  // Google Drive connection wizard
  const { connection: driveConnection, loading: driveLoading, connect: connectDrive, disconnect: disconnectDrive, deleteConnection: deleteDriveConnection, refresh: refreshDrive } = useGoogleDriveConnection(currentPage?.id || null);
  const [showDriveWizard, setShowDriveWizard] = useState(false);
  const [driveWizardStep, setDriveWizardStep] = useState(1);
  const [driveFolderInput, setDriveFolderInput] = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const SYSTEM_EMAIL = "mcmllc87@gmail.com";

  // Extract page ID from Facebook URL or return as-is if already an ID
  const extractPageId = (input: string): string => {
    const trimmed = input.trim();
    
    // If it looks like a URL
    if (trimmed.includes('facebook.com')) {
      // Match profile.php?id=123456
      const idMatch = trimmed.match(/[?&]id=(\d+)/);
      if (idMatch) return idMatch[1];
      
      // Match facebook.com/pagename or facebook.com/pages/name/123456
      const pathMatch = trimmed.match(/facebook\.com\/(?:pages\/[^\/]+\/)?([^\/\?]+)/);
      if (pathMatch) {
        const segment = pathMatch[1];
        // If it's a numeric ID, return it
        if (/^\d+$/.test(segment)) return segment;
        // Otherwise it's a username/pagename - return as-is (can be used in Graph API)
        return segment;
      }
    }
    
    // Return as-is (assumed to be a page ID or username)
    return trimmed;
  };

  const handleSaveGeneralSettings = async () => {
    const success = await saveSettingsToDatabase();
    if (success) {
      toast({ title: "✅ Saved!", description: "Your settings have been saved successfully" });
    } else {
      toast({ title: "❌ Error", description: "Failed to save settings", variant: "destructive" });
    }
  };

  const handleAddPage = async () => {
    if (!newPageName.trim() || !newPageId.trim()) {
      toast({ title: "❌ Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Validate user ID
    const userId = user?.id;
    if (!userId) {
      toast({ title: "❌ Error", description: "User not authenticated. Please log in again.", variant: "destructive" });
      return;
    }

    setAddingPage(true);
    try {
      // Build the page data with all tokens
      const pageData: Record<string, any> = {
        name: newPageName.trim(),
        facebook_page_id: newPageId.trim(),
        access_token_webhook: newWebhookToken.trim() || null,
        user_id: userId,
        is_active: true
      };

      // Add all 20 app tokens
      newAppTokens.forEach((token, index) => {
        pageData[`access_token_${index + 1}`] = token.trim() || null;
      });

      // Create the new page with user_id and all tokens
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert(pageData)
        .select()
        .single();

      if (pageError) {
        console.error('Page creation error:', pageError);
        throw pageError;
      }

      toast({ title: "✅ Success!", description: `Page "${newPageName}" created successfully` });

      setShowAddDialog(false);
      setNewPageName("");
      setNewPageId("");
      setNewWebhookToken("");
      setNewAppTokens(Array(20).fill(""));
      setShowWebhookToken(false);
      setShowAppTokens(Array(20).fill(false));
      await refreshPages();
    } catch (error: any) {
      console.error('Error adding page:', error);
      const errorMessage = error?.message || error?.details || "Failed to create page";
      toast({ title: "❌ Error", description: errorMessage, variant: "destructive" });
    } finally {
      setAddingPage(false);
    }
  };

  const handleEditPage = (page: Page) => {
    setEditingPage(page);
    setEditPageName(page.name);
    setEditWebhookToken((page as any).access_token_webhook || "");
    // Load all 20 app tokens
    const tokens = Array(20).fill("").map((_, i) => (page as any)[`access_token_${i + 1}`] || "");
    setEditAppTokens(tokens);
    setShowEditWebhookToken(false);
    setShowEditAppTokens(Array(20).fill(false));
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPage) return;

    setSavingEdit(true);
    try {
      // Build update data with all tokens
      const updateData: Record<string, any> = {
        name: editPageName.trim(),
        access_token_webhook: editWebhookToken.trim() || null,
      };

      // Add all 20 app tokens
      editAppTokens.forEach((token, index) => {
        updateData[`access_token_${index + 1}`] = token.trim() || null;
      });

      const { error } = await supabase
        .from('pages')
        .update(updateData)
        .eq('id', editingPage.id);

      if (error) throw error;

      toast({ title: "✅ Saved!", description: `Page "${editPageName}" updated` });
      setShowEditDialog(false);
      setEditingPage(null);
      await refreshPages();
    } catch (error) {
      console.error('Error updating page:', error);
      toast({ title: "❌ Error", description: "Failed to update page", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleTokenVisibility = (pageId: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const handleDeletePage = async () => {
    if (!pageToDelete) return;

    setDeletingPage(true);
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageToDelete.id);

      if (error) throw error;

      toast({ title: "🗑️ Deleted!", description: `Page "${pageToDelete.name}" deleted` });
      setShowDeleteDialog(false);
      setPageToDelete(null);
      await refreshPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({ title: "❌ Error", description: "Failed to delete page", variant: "destructive" });
    } finally {
      setDeletingPage(false);
    }
  };

  // Google Drive connection handler
  const handleDriveConnect = async () => {
    const folderId = extractGoogleDriveFolderId(driveFolderInput);
    if (!folderId) {
      toast({ title: "❌ Error", description: "Invalid Google Drive link or folder ID", variant: "destructive" });
      return;
    }

    setDriveConnecting(true);
    try {
      const success = await connectDrive(driveFolderInput, driveFolderName || 'Google Drive Folder');
      if (success) {
        setDriveWizardStep(3);
        toast({ title: "✅ Connected!", description: "Google Drive folder linked successfully" });
      } else {
        toast({ title: "❌ Error", description: "Failed to connect Google Drive folder", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "❌ Error", description: "Connection failed", variant: "destructive" });
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleDriveDisconnect = async () => {
    const success = await deleteDriveConnection();
    if (success) {
      toast({ title: "🔌 Disconnected", description: "Google Drive folder unlinked" });
      setShowDisconnectConfirm(false);
      setDriveFolderInput("");
      setDriveFolderName("");
    }
  };

  const openDriveWizard = () => {
    setDriveWizardStep(1);
    setDriveFolderInput("");
    setDriveFolderName("");
    setShowDriveWizard(true);
  };

  return (
    <DashboardLayout pageName={t('settings')}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground">{t('settings.configure')}</p>
        </div>

        <div className="flex gap-6">
          <GlassCard hover={false} className="w-64 h-fit p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {t(`settings.${tab.id}`)}
              </button>
            ))}
          </GlassCard>

          <div className="flex-1">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <GlassCard hover={false}>
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <h3 className="font-display font-semibold text-lg">{t('settings.generalSettings')}</h3>
                    <div className="grid gap-4">
                      {/* Theme Mode */}
                      <div className="space-y-3">
                        <Label>{t('settings.themeMode')}</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setTheme('dark')}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                              theme === 'dark' ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            <Moon className="h-5 w-5" />
                            <span className="text-sm">{t('settings.dark')}</span>
                          </button>
                          <button
                            onClick={() => setTheme('light')}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                              theme === 'light' ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            <Sun className="h-5 w-5" />
                            <span className="text-sm">{t('settings.light')}</span>
                          </button>
                          <button
                            onClick={() => setTheme('system')}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                              theme === 'system' ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            <Monitor className="h-5 w-5" />
                            <span className="text-sm">{t('settings.system')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Language */}
                      <div className="space-y-2">
                        <Label>{t('settings.language')}</Label>
                        <Select value={language} onValueChange={(val) => setLanguage(val as any)}>
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">🇬🇧 English</SelectItem>
                            <SelectItem value="fr">🇫🇷 Français</SelectItem>
                            <SelectItem value="es">🇪🇸 Español</SelectItem>
                            <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label>{t('settings.timezone')}</Label>
                        <Select value={timezone} onValueChange={(value) => setTimezone(value as any)}>
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="utc">UTC+0</SelectItem>
                            <SelectItem value="paris">Europe/Paris (UTC+1)</SelectItem>
                            <SelectItem value="madrid">Europe/Madrid (UTC+1)</SelectItem>
                            <SelectItem value="casablanca">Africa/Casablanca (UTC+1)</SelectItem>
                            <SelectItem value="dubai">Asia/Dubai (UTC+4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Save Button */}
                      <div className="pt-4 border-t border-white/10">
                        <Button
                          onClick={handleSaveGeneralSettings}
                          disabled={isSaving}
                          className="bg-gradient-primary hover:opacity-90"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {t('settings.save') || 'Save Settings'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "pages" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-lg">{t('settings.pagesManagement')}</h3>
                      <Button onClick={() => setShowAddDialog(true)} className="gap-2 bg-gradient-primary">
                        <Plus className="h-4 w-4" />
                        {t('settings.addPage')}
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {pages.map((page) => (
                        <div key={page.id} className="p-4 rounded-xl bg-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                                <Globe className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{page.name}</p>
                                <p className="text-sm text-muted-foreground">ID: {page.facebook_page_id}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(page.facebook_page_id);
                                  toast({ title: "📋 Copied!", description: "Page ID copied to clipboard" });
                                }}
                                title="Copy Page ID"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPage(page)}
                                title="Edit page"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setPageToDelete(page);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete page"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Token display */}
                          <div className="flex items-center gap-2 pl-13">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Token:</span>
                            {page.access_token ? (
                              <>
                                <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono flex-1 truncate">
                                  {visibleTokens.has(page.id) 
                                    ? page.access_token 
                                    : '••••••••••••••••••••••••••••••••'}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleTokenVisibility(page.id)}
                                  title={visibleTokens.has(page.id) ? "Hide token" : "Show token"}
                                >
                                  {visibleTokens.has(page.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    navigator.clipboard.writeText(page.access_token || '');
                                    toast({ title: "📋 Copied!", description: "Token copied to clipboard" });
                                  }}
                                  title="Copy token"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-yellow-500">Not configured - click edit to add</span>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {pages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No pages configured yet</p>
                          <p className="text-sm">Click "Add Page" to get started</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "team" && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Team management coming soon...</p>
                  </div>
                )}

                {activeTab === "integrations" && (
                  <div className="space-y-6">
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      Integrations
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Connect external services to enhance your automation workflow.
                    </p>

                    {/* Google Drive Integration Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Google Drive Logo */}
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-green-400 to-yellow-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                              <HardDrive className="h-7 w-7 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">Google Drive</h4>
                              <p className="text-sm text-muted-foreground">
                                Auto-publish files from Drive to your Facebook pages
                              </p>
                            </div>
                          </div>
                          <div>
                            {driveLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : driveConnection?.is_connected ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Connected
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not connected</span>
                            )}
                          </div>
                        </div>

                        {/* Connected state */}
                        {driveConnection?.is_connected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-5 pt-5 border-t border-white/10"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{driveConnection.folder_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  ID: {driveConnection.root_folder_id}
                                </p>
                                {driveConnection.last_scanned_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Last scanned: {new Date(driveConnection.last_scanned_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={openDriveWizard}
                                  className="gap-1.5 border-white/10"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Change
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowDisconnectConfirm(true)}
                                  className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                  <Unplug className="h-3.5 w-3.5" />
                                  Disconnect
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Not connected state */}
                        {!driveConnection?.is_connected && !driveLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-5 pt-5 border-t border-white/10 space-y-5"
                          >
                            {/* Step-by-step guide */}
                            <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 space-y-3">
                              <h5 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                                📋 How to connect Google Drive
                              </h5>
                              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                                <li>Open <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Google Drive</a> and create a folder (e.g. <strong>"facebook"</strong>)</li>
                                <li>Inside that folder, create one <strong>subfolder per post</strong> (e.g. "post1", "post2") — each subfolder holds the images/videos for that post</li>
                                <li>Right-click the <strong>main folder</strong> → <em>Share</em> → add <strong className="text-blue-300 select-all">mcmllc87@gmail.com</strong> as an <strong>Editor</strong></li>
                                <li>Copy the folder link and paste it below, then give it a name</li>
                                <li>Once connected, go to <strong>Auto Post</strong> to set up your publishing schedule</li>
                              </ol>
                            </div>

                            {!currentPage ? (
                              <p className="text-sm text-amber-400">
                                ⚠️ Select a page first from the sidebar to connect Google Drive.
                              </p>
                            ) : (
                              <Button
                                onClick={openDriveWizard}
                                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20"
                              >
                                <Link2 className="h-4 w-4" />
                                Connect Google Drive
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    {/* Future integrations placeholder */}
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 opacity-50">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                          <Globe className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg text-muted-foreground">More Integrations</h4>
                          <p className="text-sm text-muted-foreground/70">Coming soon...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Page Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Add New Page</DialogTitle>
            <DialogDescription>
              Add a new Facebook page to your dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Page Name</Label>
              <Input
                placeholder="My Facebook Page"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Page ID</Label>
              <Input
                placeholder="123456789012345"
                value={newPageId}
                onChange={(e) => setNewPageId(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Facebook Page settings → About → Page ID. The logo will be fetched automatically from Facebook.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Webhook Token
              </Label>
              <div className="relative">
                <Input
                  type={showWebhookToken ? "text" : "password"}
                  placeholder="EAAxxxxx..."
                  value={newWebhookToken}
                  onChange={(e) => setNewWebhookToken(e.target.value)}
                  className="bg-white/5 border-white/10 pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowWebhookToken(!showWebhookToken)}
                >
                  {showWebhookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token for webhook verification
              </p>
            </div>

            {/* 20 App Tokens in a scrollable area */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                App Tokens (20)
              </Label>
              <ScrollArea className="h-48 rounded-md border border-white/10 p-3">
                <div className="space-y-3">
                  {newAppTokens.map((token, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Token {index + 1}</Label>
                      <div className="relative">
                        <Input
                          type={showAppTokens[index] ? "text" : "password"}
                          placeholder={`Token ${index + 1}...`}
                          value={token}
                          onChange={(e) => {
                            const updated = [...newAppTokens];
                            updated[index] = e.target.value;
                            setNewAppTokens(updated);
                          }}
                          className="bg-white/5 border-white/10 pr-10 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() => {
                            const updated = [...showAppTokens];
                            updated[index] = !updated[index];
                            setShowAppTokens(updated);
                          }}
                        >
                          {showAppTokens[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Get these from Facebook Developer Portal → Your App → Page Access Tokens
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button onClick={handleAddPage} disabled={addingPage} className="bg-gradient-primary">
              {addingPage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Page Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pageToDelete?.name}"? This will also delete all configurations associated with this page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePage}
              disabled={deletingPage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Page Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page</DialogTitle>
            <DialogDescription>
              Update page name and access tokens
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Page Name</Label>
              <Input
                placeholder="My Facebook Page"
                value={editPageName}
                onChange={(e) => setEditPageName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Page ID</Label>
              <Input
                value={editingPage?.facebook_page_id || ''}
                disabled
                className="bg-white/5 border-white/10 opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Page ID cannot be changed. Logo is fetched automatically from Facebook.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Webhook Token
              </Label>
              <div className="relative">
                <Input
                  type={showEditWebhookToken ? "text" : "password"}
                  placeholder="EAAxxxxx..."
                  value={editWebhookToken}
                  onChange={(e) => setEditWebhookToken(e.target.value)}
                  className="bg-white/5 border-white/10 pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowEditWebhookToken(!showEditWebhookToken)}
                >
                  {showEditWebhookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token for webhook verification
              </p>
            </div>

            {/* 20 App Tokens in a scrollable area */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                App Tokens (20)
              </Label>
              <ScrollArea className="h-48 rounded-md border border-white/10 p-3">
                <div className="space-y-3">
                  {editAppTokens.map((token, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Token {index + 1}</Label>
                      <div className="relative">
                        <Input
                          type={showEditAppTokens[index] ? "text" : "password"}
                          placeholder={`Token ${index + 1}...`}
                          value={token}
                          onChange={(e) => {
                            const updated = [...editAppTokens];
                            updated[index] = e.target.value;
                            setEditAppTokens(updated);
                          }}
                          className="bg-white/5 border-white/10 pr-10 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() => {
                            const updated = [...showEditAppTokens];
                            updated[index] = !updated[index];
                            setShowEditAppTokens(updated);
                          }}
                        >
                          {showEditAppTokens[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the existing token, or paste a new one to update
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-gradient-primary">
              {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Drive Connection Wizard */}
      <Dialog open={showDriveWizard} onOpenChange={setShowDriveWizard}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-green-400 to-yellow-400 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-white" />
              </div>
              Connect Google Drive
            </DialogTitle>
            <DialogDescription>
              Link your Google Drive folder to auto-publish content to Facebook
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  driveWizardStep >= step
                    ? "bg-gradient-to-r from-blue-500 to-green-400 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/10 text-muted-foreground"
                )}>
                  {driveWizardStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={cn(
                    "w-12 h-0.5 rounded-full transition-all duration-300",
                    driveWizardStep > step ? "bg-gradient-to-r from-blue-500 to-green-400" : "bg-white/10"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Share Folder */}
          {driveWizardStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                  <span className="text-lg">📁</span>
                  Step 1: Share your Google Drive folder
                </h4>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span>Open your Google Drive and find the folder with your media files</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">2.</span>
                    <span>Right-click the folder → <strong className="text-foreground">Share</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">3.</span>
                    <div>
                      Add this email as <strong className="text-foreground">Viewer</strong>:
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 bg-black/30 px-3 py-2 rounded-lg text-blue-300 font-mono text-xs">
                          {SYSTEM_EMAIL}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(SYSTEM_EMAIL);
                            toast({ title: "📋 Copied!", description: "Email copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setShowDriveWizard(false)} className="border-white/10">
                  Cancel
                </Button>
                <Button onClick={() => setDriveWizardStep(2)} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500">
                  I've shared the folder
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Paste Link */}
          {driveWizardStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  Step 2: Paste your folder link
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Copy the URL from your browser when you're inside the folder
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Folder Name (optional)</Label>
                  <Input
                    placeholder="e.g. My Marketing Content"
                    value={driveFolderName}
                    onChange={(e) => setDriveFolderName(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Drive Folder Link or ID <span className="text-red-400">*</span></Label>
                  <Input
                    placeholder="https://drive.google.com/drive/folders/1ABC123XYZ..."
                    value={driveFolderInput}
                    onChange={(e) => setDriveFolderInput(e.target.value)}
                    className="bg-white/5 border-white/10 font-mono text-sm"
                  />
                  {driveFolderInput && (
                    <p className="text-xs">
                      {extractGoogleDriveFolderId(driveFolderInput) ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Folder ID detected: {extractGoogleDriveFolderId(driveFolderInput)}
                        </span>
                      ) : (
                        <span className="text-red-400">
                          ❌ Could not extract folder ID. Please paste the full URL.
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Example: https://drive.google.com/drive/folders/1ABC123XYZ456
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setDriveWizardStep(1)} className="border-white/10">
                  Back
                </Button>
                <Button
                  onClick={handleDriveConnect}
                  disabled={!extractGoogleDriveFolderId(driveFolderInput) || driveConnecting}
                  className="gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
                >
                  {driveConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Connect Folder
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {driveWizardStep === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Connected!</h3>
                <p className="text-muted-foreground mt-1">
                  Your Google Drive folder has been linked successfully.
                </p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-left space-y-2">
                <p className="text-emerald-400 font-medium">What happens next?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>📁 Your subfolders will be scanned automatically</li>
                  <li>📅 Go to <strong className="text-foreground">Auto Post</strong> to schedule publications</li>
                  <li>🔄 Files will be posted in rotation following your schedule</li>
                </ul>
              </div>
              <Button
                onClick={() => setShowDriveWizard(false)}
                className="gap-2 bg-gradient-primary"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to your Google Drive folder. Auto-posting will stop.
              You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDriveDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
