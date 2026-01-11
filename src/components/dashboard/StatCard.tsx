import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  loading?: boolean;
  color?: "blue" | "cyan" | "green" | "purple" | "orange" | "pink" | "amber" | "indigo" | "red";
  trend?: {
    value: number;
    label: string;
  };
  delay?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorStyles = {
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    fill: "bg-blue-500/10",
  },
  cyan: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    fill: "bg-cyan-500/10",
  },
  green: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    fill: "bg-green-500/10",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    fill: "bg-purple-500/10",
  },
  orange: {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500/30",
    fill: "bg-orange-500/10",
  },
  pink: {
    bg: "bg-pink-500/20",
    text: "text-pink-400",
    border: "border-pink-500/30",
    fill: "bg-pink-500/10",
  },
  amber: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    fill: "bg-amber-500/10",
  },
  indigo: {
    bg: "bg-indigo-500/20",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    fill: "bg-indigo-500/10",
  },
  red: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    fill: "bg-red-500/10",
  },
};

const sizeStyles = {
  sm: {
    icon: "h-4 w-4",
    iconPadding: "p-1.5",
    value: "text-lg",
    label: "text-xs",
    padding: "p-3",
  },
  md: {
    icon: "h-5 w-5",
    iconPadding: "p-2",
    value: "text-2xl",
    label: "text-xs",
    padding: "p-4",
  },
  lg: {
    icon: "h-8 w-8",
    iconPadding: "p-3",
    value: "text-3xl",
    label: "text-sm",
    padding: "p-6",
  },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  loading = false,
  color = "blue",
  trend,
  delay = 0,
  size = "md",
  className,
}: StatCardProps) {
  const colors = colorStyles[color];
  const sizes = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      role="article"
      aria-label={`${label}: ${loading ? 'Loading' : value}`}
    >
      <GlassCard className={cn(sizes.padding, "text-center", className)}>
        <div className={cn(sizes.iconPadding, "rounded-full w-fit mx-auto mb-2", colors.bg)} aria-hidden="true">
          <Icon className={cn(sizes.icon, colors.text)} />
        </div>
        
        {loading ? (
          <Skeleton className="h-8 w-16 mx-auto mb-1" />
        ) : (
          <p className={cn(sizes.value, "font-bold", colors.text)}>{value}</p>
        )}
        
        <p className={cn(sizes.label, "text-muted-foreground")}>{label}</p>
        
        {trend && !loading && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            trend.value >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Compact config card variant
interface ConfigCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  isActive?: boolean;
  color?: "green" | "red" | "indigo" | "amber" | "pink";
  onClick?: () => void;
}

export function ConfigStatCard({
  icon: Icon,
  title,
  value,
  isActive,
  color = "indigo",
  onClick,
}: ConfigCardProps) {
  const colors = colorStyles[color];
  const statusColor = isActive !== undefined 
    ? (isActive ? colorStyles.green : colorStyles.red)
    : colors;

  return (
    <motion.button
      className={cn(
        "p-4 rounded-xl border text-left w-full transition-all",
        colors.border,
        colors.fill,
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      role="button"
      aria-label={`${title}: ${value}`}
    >
      <Icon className={cn("h-8 w-8 mb-2", statusColor.text)} aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className={cn("text-lg font-bold", statusColor.text)}>{value}</p>
    </motion.button>
  );
}
