import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, Send, AlertCircle, CheckCircle, Zap, Eye, MousePointer, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useRecentActivity } from "@/hooks/useSupabase";

interface Activity {
  id: string;
  type: "subscriber" | "message_sent" | "message_delivered" | "message_read" | "button_click" | "error" | "success";
  title: string;
  timestamp: Date;
}

interface ActivityFeedProps {
  pageId?: string | null;
  limit?: number;
}

const iconMap = {
  subscriber: UserPlus,
  message_sent: Send,
  message_delivered: CheckCircle,
  message_read: Eye,
  button_click: MousePointer,
  error: AlertCircle,
  success: CheckCircle,
};

const colorMap = {
  subscriber: "text-blue-400 bg-blue-500/20",
  message_sent: "text-cyan-400 bg-cyan-500/20",
  message_delivered: "text-green-400 bg-green-500/20",
  message_read: "text-purple-400 bg-purple-500/20",
  button_click: "text-orange-400 bg-orange-500/20",
  error: "text-red-400 bg-red-500/20",
  success: "text-emerald-400 bg-emerald-500/20",
};

export function ActivityFeed({ pageId, limit = 10 }: ActivityFeedProps) {
  const { activities, loading, error } = useRecentActivity(pageId, limit);

  return (
    <GlassCard className="h-full max-h-[400px] overflow-hidden" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold" id="activity-feed-title">Live Activity</h3>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
          <span>Live</span>
        </span>
      </div>
      
      <div 
        className="space-y-3 overflow-y-auto max-h-[320px] scrollbar-thin pr-2"
        role="region"
        aria-labelledby="activity-feed-title"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Failed to load activity</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Activity will appear here</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = iconMap[activity.type] || Zap;
            return (
              <motion.article
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                role="article"
                aria-label={`${activity.title}, ${formatDistanceToNow(activity.timestamp, { addSuffix: true })}`}
              >
                <div className={cn("p-2 rounded-lg", colorMap[activity.type] || "text-gray-400 bg-gray-500/20")} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={activity.timestamp.toISOString()}>
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </time>
                  </p>
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
