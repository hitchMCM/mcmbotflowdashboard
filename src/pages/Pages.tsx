import { motion } from "framer-motion";
import { Plus, Globe, Users, Zap, Pause, Play, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mockPages = [
  { id: "1", name: "Career Hub", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=career", cover: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400", subscribers: 1250, activeFlows: 6, isActive: true },
  { id: "2", name: "Tech News", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=tech", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400", subscribers: 890, activeFlows: 4, isActive: true },
  { id: "3", name: "Daily Tips", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=tips", cover: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400", subscribers: 456, activeFlows: 2, isActive: false },
];

export default function Pages() {
  return (
    <DashboardLayout pageName="Pages">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Connected Pages</h1>
            <p className="text-muted-foreground">Manage your Facebook pages</p>
          </div>
          <Button className="bg-gradient-primary text-primary-foreground glow-sm">
            <Plus className="h-4 w-4 mr-2" /> Connect Page
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="overflow-hidden p-0">
                <div className="relative h-24 bg-gradient-primary">
                  <img src={page.cover} alt="" className="w-full h-full object-cover opacity-50" />
                  <Avatar className="absolute -bottom-6 left-4 h-16 w-16 ring-4 ring-card">
                    <AvatarImage src={page.avatar} />
                    <AvatarFallback>{page.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="p-4 pt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold">{page.name}</h3>
                    <Badge variant={page.isActive ? "default" : "secondary"} className={page.isActive ? "bg-success" : ""}>
                      {page.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" /> {page.subscribers.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4" /> {page.activeFlows} flows
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-white/10">View</Button>
                    <Button variant="outline" size="icon" className="border-white/10">
                      {page.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
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
