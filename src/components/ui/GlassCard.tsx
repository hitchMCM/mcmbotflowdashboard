import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "strong" | "glow";
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hover = true, children, ...props }, ref) => {
    const variants = {
      default: "bg-white/5 backdrop-blur-xl border border-white/10",
      strong: "bg-white/10 backdrop-blur-2xl border border-white/20",
      glow: "bg-white/5 backdrop-blur-xl border border-primary/30 glow-primary",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl p-6",
          variants[variant],
          hover && "transition-all duration-300 hover:bg-white/10 hover:border-white/20",
          className
        )}
        whileHover={hover ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
