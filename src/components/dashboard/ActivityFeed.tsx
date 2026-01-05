import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, Send, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "subscriber" | "flow" | "broadcast" | "error" | "success";
  title: string;
  page?: string;
  timestamp: Date;
}

const mockActivities: Activity[] = [
  { id: "1", type: "subscriber", title: "New subscriber on Career Hub", page: "Career Hub", timestamp: new Date(Date.now() - 1000 * 60 * 2) },
  { id: "2", type: "flow", title: "Flow #3 sent to 150 users", timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  { id: "3", type: "success", title: "Broadcast completed successfully", timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: "4", type: "subscriber", title: "New subscriber on Tech News", page: "Tech News", timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: "5", type: "error", title: "Failed to send message to 3 users", timestamp: new Date(Date.now() - 1000 * 60 * 120) },
  { id: "6", type: "broadcast", title: "Scheduled broadcast started", timestamp: new Date(Date.now() - 1000 * 60 * 180) },
];

const iconMap = {
  subscriber: UserPlus,
  flow: Zap,
  broadcast: Send,
  error: AlertCircle,
  success: CheckCircle,
};

const colorMap = {
  subscriber: "text-primary bg-primary/20",
  flow: "text-secondary bg-secondary/20",
  broadcast: "text-primary bg-primary/20",
  error: "text-destructive bg-destructive/20",
  success: "text-success bg-success/20",
};

export function ActivityFeed() {
  return (
    <GlassCard className="h-full max-h-[400px] overflow-hidden" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Live Activity</h3>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>
      
      <div className="space-y-3 overflow-y-auto max-h-[320px] scrollbar-thin pr-2">
        {mockActivities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className={cn("p-2 rounded-lg", colorMap[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
