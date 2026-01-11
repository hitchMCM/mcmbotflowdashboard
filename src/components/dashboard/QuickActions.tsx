import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Radio, 
  Users, 
  Settings, 
  MessageCircle, 
  Zap,
  PlusCircle,
  ArrowRight 
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  to: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    id: "broadcast",
    icon: Radio,
    label: "New Broadcast",
    description: "Send message to all subscribers",
    to: "/broadcasts",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20 hover:bg-pink-500/30",
  },
  {
    id: "subscribers",
    icon: Users,
    label: "View Subscribers",
    description: "Manage your audience",
    to: "/subscribers",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 hover:bg-blue-500/30",
  },
  {
    id: "responses",
    icon: MessageCircle,
    label: "Auto Responses",
    description: "Set up keyword triggers",
    to: "/responses",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20 hover:bg-cyan-500/30",
  },
  {
    id: "configuration",
    icon: Settings,
    label: "Configure Bot",
    description: "Manage bot settings",
    to: "/configuration",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 hover:bg-amber-500/30",
  },
];

export function QuickActions() {
  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold" id="quick-actions-title">Quick Actions</h3>
        </div>
      </div>
      
      <nav 
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        aria-labelledby="quick-actions-title"
      >
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={action.to}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl text-center",
                "transition-all duration-200",
                action.bgColor,
                "border border-white/5 hover:border-white/20"
              )}
              aria-label={`${action.label}: ${action.description}`}
            >
              <action.icon className={cn("h-6 w-6", action.color)} aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground hidden md:block">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </nav>
    </GlassCard>
  );
}

// Floating action button variant
export function FloatingQuickAction() {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: "spring" }}
    >
      <Button
        size="lg"
        className="rounded-full h-14 w-14 shadow-lg shadow-primary/30"
        aria-label="Create new broadcast"
        asChild
      >
        <Link to="/broadcasts">
          <PlusCircle className="h-6 w-6" />
        </Link>
      </Button>
    </motion.div>
  );
}
