import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/ProtectedRoute";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Database,
  Terminal,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Play,
  XCircle,
  CheckCircle,
  Globe,
  Mail,
  Key,
  UserCog,
  Activity,
  Server,
  HardDrive,
  Cpu,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  avatar_url: string | null;
}

interface Page {
  id: string;
  name: string;
  facebook_page_id: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
}

interface UserWithPages extends User {
  pages: Page[];
}

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  rowCount?: number;
  executionTime?: number;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "⛔ Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
      navigate('/dashboard');
    }
  }, [user, navigate, toast]);

  // State
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);
  
  // Users state
  const [users, setUsers] = useState<UserWithPages[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPages | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // New user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [savingUser, setSavingUser] = useState(false);
  
  // Edit user form
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState("");
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserPassword, setEditUserPassword] = useState("");
  
  // SQL Query state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10;");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryExecuting, setQueryExecuting] = useState(false);
  
  // System stats
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPages: 0,
    totalSubscribers: 0,
    totalMessages: 0,
    lastActivity: null as string | null,
  });

  // Load users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      // Load users and pages in parallel
      const [usersRes, pagesRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('pages').select('*').order('name', { ascending: true })
      ]);
      
      if (usersRes.error) throw usersRes.error;
      if (pagesRes.error) throw pagesRes.error;
      
      const usersData = usersRes.data || [];
      const pagesData = pagesRes.data || [];
      
      setAllPages(pagesData);
      
      // Attach pages to each user
      const usersWithPages: UserWithPages[] = usersData.map(u => ({
        ...u,
        pages: pagesData.filter(p => p.user_id === u.id)
      }));
      
      setUsers(usersWithPages);
    } catch (err: any) {
      console.error('Error loading users:', err);
      toast({
        title: "❌ Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  // Load system stats
  const loadSystemStats = async () => {
    try {
      const [usersRes, pagesRes, subscribersRes, messagesRes] = await Promise.all([
        supabase.from('users').select('id, is_active', { count: 'exact' }),
        supabase.from('pages').select('id', { count: 'exact' }),
        supabase.from('subscribers').select('id', { count: 'exact' }),
        supabase.from('messages').select('id', { count: 'exact' }),
      ]);

      setSystemStats({
        totalUsers: usersRes.count || 0,
        activeUsers: usersRes.data?.filter(u => u.is_active).length || 0,
        totalPages: pagesRes.count || 0,
        totalSubscribers: subscribersRes.count || 0,
        totalMessages: messagesRes.count || 0,
        lastActivity: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadSystemStats();
  }, []);

  // Add new user
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast({
        title: "❌ Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSavingUser(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: newUserEmail.toLowerCase().trim(),
          password_hash: newUserPassword,
          full_name: newUserName,
          role: newUserRole,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ User Created",
        description: `User ${newUserEmail} has been created successfully.`
      });

      setShowAddUserDialog(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserRole("user");
      loadUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast({
        title: "❌ Error",
        description: err.message || "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setSavingUser(false);
    }
  };

  // Edit user
  const handleEditUser = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    try {
      const updateData: any = {
        full_name: editUserName,
        role: editUserRole,
        is_active: editUserActive,
      };

      // Only update password if provided
      if (editUserPassword) {
        updateData.password_hash = editUserPassword;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "✅ User Updated",
        description: `User ${selectedUser.email} has been updated.`
      });

      setShowEditUserDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: "❌ Error",
        description: err.message || "Failed to update user",
        variant: "destructive"
      });
    } finally {
      setSavingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "✅ User Deleted",
        description: `User ${selectedUser.email} has been deleted.`
      });

      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: "❌ Error",
        description: err.message || "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setSavingUser(false);
    }
  };

  // Execute SQL query
  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "❌ Error",
        description: "Please enter a SQL query",
        variant: "destructive"
      });
      return;
    }

    // Security check - only allow SELECT queries in the UI
    const normalizedQuery = sqlQuery.trim().toLowerCase();
    const isReadOnly = normalizedQuery.startsWith('select');
    
    if (!isReadOnly) {
      // For non-SELECT queries, show warning
      const confirmed = window.confirm(
        "⚠️ WARNING: You are about to execute a write operation (INSERT/UPDATE/DELETE).\n\nThis can modify or delete data. Are you sure?"
      );
      if (!confirmed) return;
    }

    setQueryExecuting(true);
    const startTime = Date.now();

    try {
      // Use PostgREST RPC or direct query
      // Note: This requires a database function or direct connection
      // For now, we'll use the PostgREST API with limited capabilities
      
      const response = await fetch('/api/rpc/execute_sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sqlQuery }),
      });

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        // If RPC doesn't exist, show info message
        setQueryResult({
          success: false,
          error: "Direct SQL execution is not available. Please use psql or your database client.",
          executionTime,
        });
        return;
      }

      const data = await response.json();
      
      setQueryResult({
        success: true,
        data: Array.isArray(data) ? data : [data],
        rowCount: Array.isArray(data) ? data.length : 1,
        executionTime,
      });
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      setQueryResult({
        success: false,
        error: err.message || "Query execution failed. Use psql or database client for direct queries.",
        executionTime,
      });
    } finally {
      setQueryExecuting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: UserWithPages) => {
    setSelectedUser(user);
    setEditUserName(user.full_name || "");
    setEditUserRole(user.role);
    setEditUserActive(user.is_active);
    setEditUserPassword("");
    setShowEditUserDialog(true);
  };

  // Open user details dialog
  const openUserDetails = (user: UserWithPages) => {
    setSelectedUser(user);
    setShowUserDetailsDialog(true);
  };

  // Filter users
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "📋 Copied!", description: "Copied to clipboard" });
  };

  // Quick SQL templates
  const sqlTemplates = [
    { label: "All Users", query: "SELECT id, email, full_name, role, is_active, last_login FROM users ORDER BY created_at DESC;" },
    { label: "All Pages", query: "SELECT id, name, facebook_page_id, is_active, user_id FROM pages ORDER BY name;" },
    { label: "Active Subscribers", query: "SELECT id, name_complet, psid, page_id, subscribed_at FROM subscribers WHERE is_subscribed = true ORDER BY subscribed_at DESC LIMIT 50;" },
    { label: "Recent Messages Queue", query: "SELECT id, page_id, subscriber_name, message_type, status, scheduled_at FROM message_queue_sequence_broadcast ORDER BY scheduled_at DESC LIMIT 20;" },
    { label: "Page Configs", query: "SELECT pc.id, p.name as page_name, pc.category, pc.selection_mode, pc.is_enabled FROM page_configs pc JOIN pages p ON pc.page_id = p.id ORDER BY p.name, pc.category;" },
  ];

  if (!user || user.role !== 'admin') {
    return (
      <DashboardLayout pageName="Admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageName="Admin Panel">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage users, execute queries, and monitor system
            </p>
          </div>
          <Button onClick={() => { loadUsers(); loadSystemStats(); }} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats.activeUsers}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Globe className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats.totalPages}</p>
                <p className="text-xs text-muted-foreground">Pages</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats.totalSubscribers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Subscribers</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Activity className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemStats.totalMessages}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Add, edit, and manage user accounts</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddUserDialog(true)} className="gap-2 bg-gradient-primary">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                {/* Users Table */}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Pages</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => (
                          <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                            <TableCell>
                              <div>
                                <p className="font-medium">{u.full_name || "No name"}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  {u.pages.length} page{u.pages.length !== 1 ? 's' : ''}
                                </Badge>
                                {u.pages.length > 0 && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={u.pages.map(p => p.name).join(', ')}>
                                    ({u.pages[0].name}{u.pages.length > 1 ? '...' : ''})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_active ? 'default' : 'destructive'} className={u.is_active ? 'bg-green-500/20 text-green-500' : ''}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openUserDetails(u)}
                                  className="h-8 w-8"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(u)}
                                  className="h-8 w-8"
                                  title="Edit User"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setSelectedUser(u); setShowDeleteDialog(true); }}
                                  className="h-8 w-8 text-red-500 hover:text-red-400"
                                  disabled={u.id === user?.id}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  SQL Query Console
                </CardTitle>
                <CardDescription>
                  Execute SQL queries directly on the database. Use with caution!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Templates */}
                <div className="flex flex-wrap gap-2">
                  {sqlTemplates.map((template) => (
                    <Button
                      key={template.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setSqlQuery(template.query)}
                      className="text-xs"
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>

                {/* Query Input */}
                <div className="space-y-2">
                  <Textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="Enter SQL query..."
                    className="font-mono text-sm bg-black/30 border-white/10 min-h-[150px]"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      ⚠️ Direct SQL execution requires database function. Use psql for full access.
                    </p>
                    <Button
                      onClick={executeQuery}
                      disabled={queryExecuting}
                      className="gap-2 bg-gradient-primary"
                    >
                      {queryExecuting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Execute
                    </Button>
                  </div>
                </div>

                {/* Query Result */}
                {queryResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {queryResult.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {queryResult.success 
                            ? `${queryResult.rowCount} row(s) returned` 
                            : 'Query failed'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Execution time: {queryResult.executionTime}ms
                      </span>
                    </div>

                    <ScrollArea className="h-[300px] rounded-lg border border-white/10 bg-black/30">
                      <pre className="p-4 text-xs font-mono">
                        {queryResult.success 
                          ? JSON.stringify(queryResult.data, null, 2)
                          : queryResult.error}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Server Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-muted-foreground">Platform</span>
                    <span className="font-mono text-sm">Linux/Docker</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-muted-foreground">Database</span>
                    <span className="font-mono text-sm">PostgreSQL 15</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-muted-foreground">API</span>
                    <span className="font-mono text-sm">PostgREST</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span className="text-sm text-muted-foreground">Frontend</span>
                    <span className="font-mono text-sm">React + Vite</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={loadSystemStats}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Stats
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveTab('database')}>
                    <Database className="h-4 w-4" />
                    Open Query Console
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => copyToClipboard(window.location.origin)}>
                    <Copy className="h-4 w-4" />
                    Copy App URL
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2 text-orange-500" onClick={() => {
                    toast({
                      title: "ℹ️ SSH Info",
                      description: "SSH access requires terminal connection. Use: ssh user@your-server"
                    });
                  }}>
                    <Terminal className="h-4 w-4" />
                    SSH Connection Info
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                placeholder="John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="bg-white/5 border-white/10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={savingUser} className="bg-gradient-primary">
              {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={selectedUser?.email || ""}
                disabled
                className="bg-white/5 border-white/10 opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password (leave empty to keep current)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="bg-white/5 border-white/10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editUserRole} onValueChange={setEditUserRole}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={editUserActive} onCheckedChange={setEditUserActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={savingUser} className="bg-gradient-primary">
              {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.email}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
              disabled={savingUser}
            >
              {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="glass border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>Complete information about this user</DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* User Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedUser.full_name || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedUser.is_active ? 'default' : 'destructive'} className={selectedUser.is_active ? 'bg-green-500/20 text-green-500' : ''}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="text-sm">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-black/30 px-2 py-1 rounded font-mono">{selectedUser.password_hash}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedUser.password_hash)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-black/30 px-2 py-1 rounded">{selectedUser.id}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedUser.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pages Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    Managed Pages ({selectedUser.pages.length})
                  </h4>
                </div>
                
                {selectedUser.pages.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-white/5 rounded-lg">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pages assigned to this user</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedUser.pages.map((page) => (
                      <div key={page.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                          <img 
                            src={`https://graph.facebook.com/${page.facebook_page_id}/picture?type=small`} 
                            alt={page.name}
                            className="h-8 w-8 rounded-full"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                          />
                          <div>
                            <p className="font-medium text-sm">{page.name}</p>
                            <p className="text-xs text-muted-foreground">FB ID: {page.facebook_page_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={page.is_active ? 'default' : 'secondary'} className={page.is_active ? 'bg-green-500/20 text-green-500' : ''}>
                            {page.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(page.id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowUserDetailsDialog(false); if (selectedUser) openEditDialog(selectedUser); }} className="bg-gradient-primary">
              <Pencil className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
