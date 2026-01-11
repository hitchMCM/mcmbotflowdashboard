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
import { useState } from "react";

export default function Subscribers() {
  const { subscribers, loading, error, refetch, getStats } = useSubscribers();
  const [searchTerm, setSearchTerm] = useState("");
  const stats = getStats();

  const filteredSubscribers = subscribers.filter(sub => 
    sub.name_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.psid?.includes(searchTerm) ||
    sub.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <GlassCard hover={false} className="p-4 border-destructive/50">
            <p className="text-destructive">Error: {error}</p>
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Messages</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub, index) => (
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
                          <AvatarImage src={sub.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.psid}`} />
                          <AvatarFallback>{(sub.name_complet || sub.first_name || 'U')[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{sub.name_complet || `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <code className="text-xs bg-white/10 px-2 py-1 rounded">{sub.psid}</code>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{formatDate(sub.subscribed_at)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-primary">↓{sub.total_messages_received}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-success">↑{sub.total_messages_sent}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`flex items-center gap-2 text-sm ${sub.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                        <span className={`h-2 w-2 rounded-full ${sub.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {sub.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
