import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, Users, Plus, Copy, Trash2, Loader2, Sun, Moon, Monitor, Key, Eye, EyeOff, Pencil, Save } from "lucide-react";
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
  const { pages, refreshPages } = usePage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Add page dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageId, setNewPageId] = useState("");
  const [newPageLogo, setNewPageLogo] = useState("");
  const [newWebhookToken, setNewWebhookToken] = useState("");
  const [newAppTokens, setNewAppTokens] = useState<string[]>(Array(20).fill(""));
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [showAppTokens, setShowAppTokens] = useState<boolean[]>(Array(20).fill(false));
  const [addingPage, setAddingPage] = useState(false);
  
  // Edit page dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editPageName, setEditPageName] = useState("");
  const [editPageLogo, setEditPageLogo] = useState("");
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
        avatar_url: newPageLogo.trim() || null,
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
      setNewPageLogo("");
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
    setEditPageLogo(page.avatar_url || "");
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
        avatar_url: editPageLogo.trim() || null,
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
                onChange={(e) => {
                  const pageId = e.target.value;
                  setNewPageId(pageId);
                  // Auto-generate logo URL from Facebook Graph API
                  if (pageId.trim()) {
                    setNewPageLogo(`https://graph.facebook.com/${pageId.trim()}/picture?type=large`);
                  }
                }}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Facebook Page settings → About → Page ID
              </p>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={newPageLogo}
                onChange={(e) => setNewPageLogo(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                URL of the page logo/avatar image
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
                Page ID cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={editPageLogo}
                onChange={(e) => setEditPageLogo(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                URL of the page logo/avatar image
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
    </DashboardLayout>
  );
}
