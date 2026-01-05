import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Plus, Sparkles, Edit, Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockTemplates = [
  { id: "1", name: "Welcome Message", type: "text", usedBy: 3, preview: "Hey {{name}}! Welcome to our community..." },
  { id: "2", name: "Promo Card", type: "card", usedBy: 2, preview: "Special offer just for you!" },
  { id: "3", name: "Survey", type: "buttons", usedBy: 1, preview: "We'd love your feedback..." },
  { id: "4", name: "Newsletter", type: "text", usedBy: 5, preview: "Here's what's new this week..." },
];

export default function Templates() {
  return (
    <DashboardLayout pageName="Templates">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Templates</h1>
            <p className="text-muted-foreground">Reusable message templates</p>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground glow-sm">
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-gradient-primary">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <Badge variant="outline" className="border-white/20">{template.type}</Badge>
                </div>
                
                <h3 className="font-display font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{template.preview}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Used by {template.usedBy} pages</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
