import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePage } from "@/contexts/PageContext";
import {
  useGoogleDriveConnection,
  useGoogleDriveSubfolders,
  usePostSchedule,
  usePostedFiles,
  duplicateConfigToPages,
  cloneConfigFromPage,
} from "@/hooks/useAutoPost";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PostSlot, GoogleDriveSubfolder } from "@/types/autoPost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  HardDrive,
  Clock,
  Plus,
  X,
  Save,
  Loader2,
  FolderOpen,
  Image,
  Video,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
  Trash2,
  RefreshCw,
  Settings,
  ArrowRight,
  Sparkles,
  Send,
  Copy,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Post Slot Card — each post picks its own subfolder
// ─────────────────────────────────────────────────────────────────────────────
function PostSlotCard({
  slot,
  index,
  subfolders,
  onUpdate,
  onRemove,
  canRemove,
}: {
  slot: PostSlot;
  index: number;
  subfolders: GoogleDriveSubfolder[];
  onUpdate: (i: number, updates: Partial<PostSlot>) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden group"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-orange-500/20">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold">Post #{index + 1}</p>
            <p className="text-xs text-muted-foreground">Daily scheduled post</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
            <Clock className="h-3.5 w-3.5 text-purple-400" />
            <Input
              type="time"
              value={slot.time}
              onChange={(e) => onUpdate(index, { time: e.target.value })}
              className="bg-transparent border-0 p-0 h-auto w-[80px] text-sm font-mono focus-visible:ring-0"
            />
          </div>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Subfolder selector */}
      <div className="px-5 pt-4 pb-2">
        <Select
          value={slot.subfolder_drive_id || ""}
          onValueChange={(val) => {
            const folder = subfolders.find((s) => s.subfolder_drive_id === val);
            onUpdate(index, {
              subfolder_drive_id: val,
              subfolder_name: folder?.name || "",
            });
          }}
        >
          <SelectTrigger className="bg-white/5 border-white/10 h-10 rounded-xl text-sm">
            <SelectValue placeholder="📁 Choose a folder...">
              {slot.subfolder_drive_id && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                  <span className="truncate">{slot.subfolder_name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="glass border-white/10 max-h-60">
            {subfolders.map((folder) => (
              <SelectItem
                key={folder.subfolder_drive_id}
                value={folder.subfolder_drive_id}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">{folder.name}</span>
                  {folder.file_count > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {folder.file_count} files
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Caption area — with proper padding so first letter is visible */}
      <div className="px-5 pt-2 pb-4">
        <Textarea
          placeholder="Write a caption for this post..."
          value={slot.caption}
          onChange={(e) => onUpdate(index, { caption: e.target.value })}
          className="bg-white/5 border-white/10 rounded-xl px-4 py-3 resize-none text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 min-h-[80px]"
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {slot.subfolder_drive_id ? (
            <>
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              <span className="truncate max-w-[200px]">{slot.subfolder_name}</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>No folder selected</span>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {slot.caption ? `${slot.caption.length} chars` : "No caption"}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AutoPost Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoPost() {
  const { currentPage, pages } = usePage();
  const { toast } = useToast();
  const pageId = currentPage?.id || null;

  // Hooks
  const { connection, loading: connectionLoading } =
    useGoogleDriveConnection(pageId);
  const { subfolders, loading: subfoldersLoading, refresh: refreshSubfolders } =
    useGoogleDriveSubfolders(connection?.id || null);
  const {
    config,
    loading: configLoading,
    saveConfig,
    toggleActive,
    deleteConfig,
  } = usePostSchedule(pageId);
  const { files: postedFiles, stats } = usePostedFiles(pageId, 50);

  // Form state
  const [postSlots, setPostSlots] = useState<PostSlot[]>([
    { time: "09:00", caption: "", subfolder_drive_id: "", subfolder_name: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [duplicating, setDuplicating] = useState(false);
  const [showCloneFromDialog, setShowCloneFromDialog] = useState(false);
  const [cloneSourcePageId, setCloneSourcePageId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [activeSection, setActiveSection] = useState<"schedule" | "history">(
    "schedule"
  );

  // Load existing config or reset when switching pages
  useEffect(() => {
    if (config) {
      const times = config.post_times?.length
        ? config.post_times.map((t) => t.substring(0, 5))
        : ["09:00"];
      const captions: string[] = config.captions || [];
      const subIds: string[] = config.subfolder_ids || [];
      const subNames: string[] = config.subfolder_names || [];
      setPostSlots(
        times.map((time, i) => ({
          time,
          caption: captions[i] || "",
          subfolder_drive_id: subIds[i] || "",
          subfolder_name: subNames[i] || "",
        }))
      );
    } else {
      // No config for this page — reset to empty
      setPostSlots([{ time: "09:00", caption: "", subfolder_drive_id: "", subfolder_name: "" }]);
    }
  }, [config]);

  // Detect changes vs saved config
  const hasChanges = useMemo(() => {
    if (!config) return true; // new config = always saveable
    const savedTimes = (config.post_times || []).map((t) => t.substring(0, 5));
    const savedCaptions = config.captions || [];
    const savedSubIds = config.subfolder_ids || [];
    const savedSubNames = config.subfolder_names || [];
    if (postSlots.length !== savedTimes.length) return true;
    return postSlots.some((slot, i) => (
      slot.time !== (savedTimes[i] || "") ||
      slot.caption !== (savedCaptions[i] || "") ||
      slot.subfolder_drive_id !== (savedSubIds[i] || "") ||
      slot.subfolder_name !== (savedSubNames[i] || "")
    ));
  }, [config, postSlots]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const addPostSlot = () => {
    if (postSlots.length >= 24) {
      toast({ title: "Limit reached", description: "Maximum 24 posts per day", variant: "destructive" });
      return;
    }
    const lastTime = postSlots[postSlots.length - 1]?.time || "09:00";
    const [h, m] = lastTime.split(":").map(Number);
    const nextH = (h + 3) % 24;
    setPostSlots([
      ...postSlots,
      {
        time: `${nextH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        caption: "",
        subfolder_drive_id: "",
        subfolder_name: "",
      },
    ]);
  };

  const removePostSlot = (index: number) => {
    if (postSlots.length <= 1) return;
    setPostSlots(postSlots.filter((_, i) => i !== index));
  };

  const updatePostSlot = (index: number, updates: Partial<PostSlot>) => {
    const updated = [...postSlots];
    updated[index] = { ...updated[index], ...updates };
    setPostSlots(updated);
  };

  const handleSave = async () => {
    if (!pageId) return;
    if (postSlots.some((s) => !s.time)) {
      toast({ title: "Error", description: "Set a time for every post", variant: "destructive" });
      return;
    }
    if (postSlots.some((s) => !s.subfolder_drive_id)) {
      toast({ title: "Error", description: "Select a folder for every post", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const success = await saveConfig({
        page_id: pageId,
        subfolder_id: postSlots[0]?.subfolder_drive_id || "",
        subfolder_name: postSlots[0]?.subfolder_name || "",
        post_times: postSlots.map((s) => `${s.time}:00`),
        captions: postSlots.map((s) => s.caption || ""),
        subfolder_ids: postSlots.map((s) => s.subfolder_drive_id),
        subfolder_names: postSlots.map((s) => s.subfolder_name),
        is_active: true,
      });

      if (success) {
        toast({ title: "Saved!", description: "Auto-post schedule configured" });
      } else {
        toast({ title: "Error", description: "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const success = await toggleActive();
    if (success) {
      toast({
        title: config?.is_active ? "Paused" : "Activated",
        description: config?.is_active ? "Auto-posting paused" : "Auto-posting activated",
      });
    }
  };

  const handleDuplicate = async () => {
    if (!config || selectedPageIds.length === 0) return;
    setDuplicating(true);
    try {
      const result = await duplicateConfigToPages(config, selectedPageIds);
      if (result.success.length > 0) {
        toast({
          title: "Duplicated!",
          description: `Schedule cloned to ${result.success.length} page${result.success.length > 1 ? "s" : ""} (paused by default)`,
        });
      }
      if (result.failed.length > 0) {
        toast({
          title: "Some failed",
          description: `${result.failed.length} page${result.failed.length > 1 ? "s" : ""} failed`,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate", variant: "destructive" });
    } finally {
      setDuplicating(false);
      setShowDuplicateDialog(false);
      setSelectedPageIds([]);
    }
  };

  const otherPages = pages.filter((p) => p.id !== currentPage?.id);

  const togglePageSelection = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleCloneFrom = async () => {
    if (!cloneSourcePageId || !pageId) return;
    setCloning(true);
    try {
      const success = await cloneConfigFromPage(cloneSourcePageId, pageId);
      if (success) {
        toast({ title: "Cloned!", description: "Schedule cloned from other page (paused by default)" });
        // Refresh the config for current page
        window.location.reload();
      } else {
        toast({ title: "Error", description: "Source page has no config", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to clone", variant: "destructive" });
    } finally {
      setCloning(false);
      setShowCloneFromDialog(false);
      setCloneSourcePageId(null);
    }
  };

  const handleDelete = async () => {
    const success = await deleteConfig();
    if (success) {
      toast({ title: "Deleted", description: "Schedule removed" });
      setPostSlots([{ time: "09:00", caption: "", subfolder_drive_id: "", subfolder_name: "" }]);
    }
    setShowDeleteConfirm(false);
  };

  const isLoading = connectionLoading || subfoldersLoading || configLoading;

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout pageName="Auto Post">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ── No Page ────────────────────────────────────────────────────────────
  if (!currentPage) {
    return (
      <DashboardLayout pageName="Auto Post">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">No Page Selected</h2>
          <p className="text-muted-foreground mt-2">
            Select a page from the sidebar to configure auto-posting
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ── No Drive Connection ────────────────────────────────────────────────
  if (!connection?.is_connected) {
    return (
      <DashboardLayout pageName="Auto Post">
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-16"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 via-green-400/20 to-yellow-400/20 border border-white/10 flex items-center justify-center"
            >
              <HardDrive className="h-12 w-12 text-blue-400" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold">Connect Google Drive First</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Go to <strong>Settings &rarr; Integrations</strong> to connect
                your Google Drive folder, then come back here.
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = "/settings")}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              <Settings className="h-4 w-4" />
              Go to Settings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Clone from another page — always available even without Drive */}
          <Button
            variant="outline"
            onClick={() => {
              setCloneSourcePageId(null);
              setShowCloneFromDialog(true);
            }}
            className="w-full h-12 rounded-2xl gap-2 border-white/10 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
            Clone from another page
          </Button>

          {/* Clone From Dialog */}
          <Dialog open={showCloneFromDialog} onOpenChange={setShowCloneFromDialog}>
            <DialogContent className="glass border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5 text-blue-400" />
                  Clone from another page
                </DialogTitle>
                <DialogDescription>
                  Select a page to copy its auto-post schedule to <strong>{currentPage?.name}</strong>. The cloned schedule starts paused.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto py-2">
                {otherPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No other pages available
                  </p>
                ) : (
                  otherPages.map((page) => (
                    <label
                      key={page.id}
                      onClick={() => setCloneSourcePageId(page.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        cloneSourcePageId === page.id
                          ? "border-blue-500/40 bg-blue-500/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        cloneSourcePageId === page.id ? "border-blue-500" : "border-white/20"
                      )}>
                        {cloneSourcePageId === page.id && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {page.avatar_url ? (
                          <img src={page.avatar_url} alt={page.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {page.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{page.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCloneFromDialog(false)} className="border-white/10">Cancel</Button>
                <Button
                  onClick={handleCloneFrom}
                  disabled={cloning || !cloneSourcePageId}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                >
                  {cloning ? (<><Loader2 className="h-4 w-4 animate-spin" />Cloning...</>) : (<><Copy className="h-4 w-4" />Clone</>)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout pageName="Auto Post">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auto Post</h1>
              <p className="text-sm text-muted-foreground">
                Schedule posts for <strong>{currentPage.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {config && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      config.is_active ? "bg-emerald-400 animate-pulse" : "bg-gray-400"
                    )}
                  />
                  <span className="text-xs font-medium">
                    {config.is_active ? "Active" : "Paused"}
                  </span>
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={handleToggle}
                    className="scale-75"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPageIds([]);
                    setShowDuplicateDialog(true);
                  }}
                  title="Duplicate to other pages"
                  className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-blue-400"
                >
                  <Copy className="h-4 w-4" />
                  Clone to page
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-9 w-9 text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Clone from — always visible even without config */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCloneSourcePageId(null);
                setShowCloneFromDialog(true);
              }}
              title="Clone from another page"
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-blue-400"
            >
              <Copy className="h-4 w-4" />
              Clone from page
            </Button>
          </div>
        </div>

        {/* Drive info + refresh subfolders */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-green-400 to-yellow-400 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{connection.folder_name}</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {subfolders.length} subfolder{subfolders.length !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSubfolders}
              className="gap-1.5 h-8 text-xs text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Folders
            </Button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveSection("schedule")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              activeSection === "schedule"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </button>
          <button
            onClick={() => setActiveSection("history")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              activeSection === "history"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            History
            {stats.total > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {stats.total}
              </Badge>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════ SCHEDULE TAB ═══════════════════════ */}
          {activeSection === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Post Slots */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      Scheduled Posts
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each post has its own time, folder, and caption
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {postSlots.length} post{postSlots.length > 1 ? "s" : ""}/day
                  </Badge>
                </div>

                {subfolders.length === 0 ? (
                  <div className="flex items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 text-center justify-center">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">No subfolders found yet</p>
                      <p className="text-xs text-muted-foreground">
                        Wait for N8N to scan your Drive, then click Refresh Folders above
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                      {postSlots.map((slot, index) => (
                        <PostSlotCard
                          key={index}
                          slot={slot}
                          index={index}
                          subfolders={subfolders}
                          onUpdate={updatePostSlot}
                          onRemove={removePostSlot}
                          canRemove={postSlots.length > 1}
                        />
                      ))}
                    </AnimatePresence>

                    {/* Add Post */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={addPostSlot}
                      className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Add Another Post</span>
                    </motion.button>
                  </>
                )}
              </div>

              {/* Save */}
              {subfolders.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={cn(
                      "w-full h-14 text-base font-semibold rounded-2xl gap-3 transition-all",
                      hasChanges
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-xl shadow-orange-500/20"
                        : "bg-white/10 text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : !hasChanges ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        No changes
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        {config ? "Update Schedule" : "Save Schedule"}
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Clone from another page — always visible */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCloneSourcePageId(null);
                    setShowCloneFromDialog(true);
                  }}
                  className="w-full h-12 rounded-2xl gap-2 border-white/10 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                  Clone from another page
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════════════ HISTORY TAB ═══════════════════════ */}
          {activeSection === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Posts", value: stats.total, color: "text-foreground", bg: "from-blue-500/10 to-purple-500/10" },
                  { label: "Successful", value: stats.success, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
                  { label: "Failed", value: stats.failed, color: "text-red-400", bg: "from-red-500/10 to-orange-500/10" },
                ].map((stat) => (
                  <div key={stat.label} className={cn("rounded-2xl border border-white/10 p-5 bg-gradient-to-br", stat.bg)}>
                    <p className={cn("text-3xl font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Posted Files */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="font-semibold">Recent Posts</h3>
                  <p className="text-xs text-muted-foreground">History of published files</p>
                </div>

                {postedFiles.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No posts yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posts will appear here once auto-posting starts
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px]">
                    <div className="divide-y divide-white/5">
                      {postedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              file.file_type === "video" ? "bg-purple-500/15" : "bg-blue-500/15"
                            )}
                          >
                            {file.file_type === "video" ? (
                              <Video className="h-5 w-5 text-purple-400" />
                            ) : (
                              <Image className="h-5 w-5 text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(file.posted_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              file.status === "success"
                                ? "default"
                                : file.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={cn(
                              "shrink-0",
                              file.status === "success" &&
                                "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            )}
                          >
                            {file.status === "success" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {file.status === "failed" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {file.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="glass border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-400" />
              Duplicate Schedule
            </DialogTitle>
            <DialogDescription>
              Clone this auto-post configuration to other pages. Cloned schedules start paused.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {otherPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No other pages available
              </p>
            ) : (
              otherPages.map((page) => (
                <label
                  key={page.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    selectedPageIds.includes(page.id)
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  <Checkbox
                    checked={selectedPageIds.includes(page.id)}
                    onCheckedChange={() => togglePageSelection(page.id)}
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {page.avatar_url ? (
                      <img
                        src={page.avatar_url}
                        alt={page.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {page.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">{page.name}</span>
                  </div>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDuplicateDialog(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicating || selectedPageIds.length === 0}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {duplicating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Clone to {selectedPageIds.length || ""} page{selectedPageIds.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone From Dialog */}
      <Dialog open={showCloneFromDialog} onOpenChange={setShowCloneFromDialog}>
        <DialogContent className="glass border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-400" />
              Clone from another page
            </DialogTitle>
            <DialogDescription>
              Select a page to copy its auto-post schedule to <strong>{currentPage?.name}</strong>. The cloned schedule starts paused.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {otherPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No other pages available
              </p>
            ) : (
              otherPages.map((page) => (
                <label
                  key={page.id}
                  onClick={() => setCloneSourcePageId(page.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    cloneSourcePageId === page.id
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    cloneSourcePageId === page.id ? "border-blue-500" : "border-white/20"
                  )}>
                    {cloneSourcePageId === page.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {page.avatar_url ? (
                      <img
                        src={page.avatar_url}
                        alt={page.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {page.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">{page.name}</span>
                  </div>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCloneFromDialog(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloneFrom}
              disabled={cloning || !cloneSourcePageId}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {cloning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Clone
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auto-Post Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all scheduling settings. Auto-posting will stop
              immediately. Published files history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
