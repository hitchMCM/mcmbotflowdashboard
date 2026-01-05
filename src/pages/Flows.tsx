import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { GitBranch, Check, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const flowSteps = [
  { number: 1, title: "Welcome Message", status: "completed", delay: "0h" },
  { number: 2, title: "Introduction", status: "completed", delay: "24h" },
  { number: 3, title: "Value Proposition", status: "active", delay: "48h" },
  { number: 4, title: "Case Study", status: "pending", delay: "72h" },
  { number: 5, title: "Offer", status: "pending", delay: "96h" },
  { number: 6, title: "Follow-up", status: "pending", delay: "120h" },
];

export default function Flows() {
  return (
    <DashboardLayout pageName="Flows">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Flow Builder</h1>
          <p className="text-muted-foreground">Create automated message sequences</p>
        </div>

        <GlassCard hover={false}>
          <h3 className="font-display font-semibold mb-8">Career Hub - Main Flow</h3>
          
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-primary via-secondary to-muted" />
            
            <div className="grid grid-cols-6 gap-4 relative">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold relative z-10 transition-all",
                    step.status === "completed" && "bg-primary text-primary-foreground glow-primary",
                    step.status === "active" && "bg-secondary text-secondary-foreground animate-pulse-glow",
                    step.status === "pending" && "bg-muted text-muted-foreground"
                  )}>
                    {step.status === "completed" ? <Check className="h-6 w-6" /> : step.number}
                  </div>
                  
                  <GlassCard className="mt-4 p-4 text-center w-full" variant={step.status === "active" ? "glow" : "default"}>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{step.delay}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-3 gap-4">
          <GlassCard>
            <div className="text-center">
              <p className="text-3xl font-bold gradient-text">1,250</p>
              <p className="text-sm text-muted-foreground mt-1">Started Flow</p>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-center">
              <p className="text-3xl font-bold text-success">847</p>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">67.8%</p>
              <p className="text-sm text-muted-foreground mt-1">Completion Rate</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
