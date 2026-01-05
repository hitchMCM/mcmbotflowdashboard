import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface PageCard {
  id: string;
  name: string;
  avatar: string;
  subscribers: number;
  isActive: boolean;
  lastActivity: Date;
}

// Une seule page Facebook
const currentPage: PageCard = {
  id: "1",
  name: "Ma Page Facebook",
  avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=mypage",
  subscribers: 1250,
  isActive: true,
  lastActivity: new Date(Date.now() - 1000 * 60 * 5)
};

export function PagesOverview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Page Connectée</h3>
        <Badge variant="outline" className="border-green-500/50 text-green-400">
          Active
        </Badge>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="relative">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/30">
              <AvatarImage src={currentPage.avatar} />
              <AvatarFallback>{currentPage.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{currentPage.name}</h4>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-muted-foreground">
                {currentPage.subscribers.toLocaleString()} abonnés
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Dernière activité: {formatDistanceToNow(currentPage.lastActivity, { addSuffix: true })}
            </p>
            <Badge className="bg-primary/20 text-primary border-0">Connectée</Badge>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
