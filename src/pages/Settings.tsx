import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, Users, Plus, Copy, Trash2, Loader2, Sun, Moon, Monitor } from "lucide-react";
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

const tabs = [
  { id: "general", icon: SettingsIcon },
  { id: "pages", icon: Globe },
  { id: "team", icon: Users },
];

interface Page {
  id: string;
  name: string;
  fb_page_id: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme, language, setLanguage, t } = useSettings();
  const { pages, refreshPages } = usePage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Add page dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageId, setNewPageId] = useState("");
  const [configOption, setConfigOption] = useState<"standard" | "clone">("standard");
  const [cloneFromPageId, setCloneFromPageId] = useState<string>("");
  const [addingPage, setAddingPage] = useState(false);
  
  // Delete page dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

  const handleAddPage = async () => {
    if (!newPageName.trim() || !newPageId.trim()) {
      toast({ title: "❌ Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setAddingPage(true);
    try {
      // Create the new page with user_id
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert({
          name: newPageName.trim(),
          fb_page_id: newPageId.trim(),
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          is_active: true
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // If cloning configuration from another page
      if (configOption === "clone" && cloneFromPageId) {
        // Get existing page_configs from source page
        const { data: sourceConfigs, error: configError } = await supabase
          .from('page_configs')
          .select('*')
          .eq('page_id', cloneFromPageId);

        if (configError) throw configError;

        if (sourceConfigs && sourceConfigs.length > 0) {
          // Clone configs to new page
          const newConfigs = sourceConfigs.map(config => ({
            page_id: newPage.id,
            category: config.category,
            name: config.name,
            selected_message_ids: config.selected_message_ids,
            selection_mode: config.selection_mode,
            fixed_message_id: config.fixed_message_id,
            messages_count: config.messages_count,
            delay_hours: config.delay_hours,
            trigger_keywords: config.trigger_keywords,
            is_enabled: config.is_enabled
          }));

          const { error: insertError } = await supabase
            .from('page_configs')
            .insert(newConfigs);

          if (insertError) throw insertError;
        }
      }

      toast({ title: "✅ Success!", description: `Page "${newPageName}" created successfully` });
      setShowAddDialog(false);
      setNewPageName("");
      setNewPageId("");
      setConfigOption("standard");
      setCloneFromPageId("");
      await refreshPages();
    } catch (error) {
      console.error('Error adding page:', error);
      toast({ title: "❌ Error", description: "Failed to create page", variant: "destructive" });
    } finally {
      setAddingPage(false);
    }
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
                        <Select defaultValue="utc">
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
                        <div key={page.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                              <Globe className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{page.name}</p>
                              <p className="text-sm text-muted-foreground">ID: {page.fb_page_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(page.fb_page_id);
                                toast({ title: "📋 Copied!", description: "Page ID copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setPageToDelete(page);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                onChange={(e) => setNewPageId(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Facebook Page settings → About → Page ID
              </p>
            </div>
            <div className="space-y-2">
              <Label>Configuration</Label>
              <Select value={configOption} onValueChange={(v) => setConfigOption(v as "standard" | "clone")}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="standard">Create standard configuration</SelectItem>
                  <SelectItem value="clone">Clone from existing page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {configOption === "clone" && pages.length > 0 && (
              <div className="space-y-2">
                <Label>Clone from</Label>
                <Select value={cloneFromPageId} onValueChange={setCloneFromPageId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {configOption === "clone" && pages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No existing pages to clone from. A standard configuration will be created.
              </p>
            )}
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
    </DashboardLayout>
  );
}
