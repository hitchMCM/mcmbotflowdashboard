import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { Users, Filter, Search, MoreHorizontal, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscribers } from "@/hooks/useSupabase";
import { usePage } from "@/contexts/PageContext";
import { useState } from "react";

export default function Subscribers() {
  const { currentPage } = usePage();
  // Filter subscribers by current page
  const { subscribers, loading, error, refetch, getStats } = useSubscribers(currentPage?.id);
  const [searchTerm, setSearchTerm] = useState("");
  const stats = getStats();

  const filteredSubscribers = subscribers.filter(sub => {
    const name = sub.full_name || sub.name_complet || sub.first_name || '';
    const psid = sub.facebook_psid || sub.psid || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           psid.includes(searchTerm);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout pageName="Subscribers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Subscribers</h1>
            <p className="text-muted-foreground">
              {stats.total} total • {stats.active} active • {stats.inactive} inactive
            </p>
          </div>
          <Button variant="outline" className="border-white/10" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <GlassCard hover={false} className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search subscribers..." 
                className="pl-10 bg-white/5 border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-white/10">
              <Filter className="h-4 w-4 mr-2" /> Filters
            </Button>
          </div>
        </GlassCard>

        {error && (
          <GlassCard hover={false} className="p-4 border-destructive/50 bg-destructive/10">
            <p className="text-destructive font-medium">❌ Error loading subscribers:</p>
            <p className="text-destructive text-sm mt-1">{error}</p>
            <p className="text-muted-foreground text-xs mt-2">Check browser console (F12) for more details</p>
          </GlassCard>
        )}

        {!loading && !error && subscribers.length === 0 && (
          <GlassCard hover={false} className="p-4 border-yellow-500/50 bg-yellow-500/10">
            <p className="text-yellow-500 font-medium">⚠️ No subscribers in database</p>
            <p className="text-muted-foreground text-sm mt-1">
              The subscribers table might be empty or RLS policies might be blocking access.
            </p>
          </GlassCard>
        )}

        <GlassCard hover={false}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading subscribers...</span>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>No subscribers found</p>
              {searchTerm && <p className="text-sm">Try another search</p>}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subscriber</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PSID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subscribed</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Message</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub, index) => {
                  // Compatible avec les deux formats de table
                  const displayName = sub.full_name || sub.name_complet || `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || 'Unknown User';
                  const displayPsid = sub.facebook_psid || sub.psid || '';
                  const displayAvatar = sub.avatar_url || sub.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayPsid}`;
                  const displayDate = sub.subscribed_at || sub.created_at || '';
                  const displayLastMessage = sub.last_message_at || sub.last_interaction;
                  const isActive = sub.is_active ?? sub.is_subscribed ?? true;
                  
                  return (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={displayAvatar} />
                          <AvatarFallback>{displayName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <code className="text-xs bg-white/10 px-2 py-1 rounded">{displayPsid}</code>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{displayDate ? formatDate(displayDate) : 'N/A'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {displayLastMessage ? formatDate(displayLastMessage) : 'No messages'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-2 text-sm ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
                        <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
