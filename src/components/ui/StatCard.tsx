import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon: Icon, trend, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard className={cn("relative overflow-hidden", className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <motion.p
              className="text-3xl font-display font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: delay + 0.2 }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-gradient-primary">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      </GlassCard>
    </motion.div>
  );
}
