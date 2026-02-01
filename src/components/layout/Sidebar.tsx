import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Radio,
  Sparkles,
  TrendingUp,
  Settings,
  Bot,
  ChevronDown,
  LogOut,
  Globe,
  MessageCircle,
  HelpCircle,
  Sliders,
  MessageSquare,
  Zap,
  Clock,
  Megaphone,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePage } from "@/contexts/PageContext";
import { logout, useAuth } from "@/components/auth/ProtectedRoute";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Configuration", href: "/configuration", icon: Sliders },
  { name: "Welcome", href: "/welcome", icon: MessageSquare },
  { name: "Comment Reply", href: "/comment-reply", icon: MessageCircle },
  { name: "Standard Reply", href: "/responses", icon: Zap },
  { name: "Sequences", href: "/sequences", icon: Clock },
  { name: "Broadcasts", href: "/broadcasts", icon: Megaphone },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Admin Panel", href: "/admin", icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { currentPage, pages, setCurrentPage, loading } = usePage();
  const { user } = useAuth();

  // Debug log
  console.log('[Sidebar] currentPage:', currentPage, 'pages:', pages, 'loading:', loading);

  const handleLogout = () => {
    logout();
  };

  // Get user display info
  const userName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/10 z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <motion.img 
            src="/logo3.png" 
            alt="MCM BotFlow" 
            className="h-14 w-14 object-contain"
            animate={{ filter: ["drop-shadow(0 0 4px hsl(187 93% 43% / 0.3))", "drop-shadow(0 0 8px hsl(187 93% 43% / 0.5))", "drop-shadow(0 0 4px hsl(187 93% 43% / 0.3))"] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-display text-xl font-bold gradient-text">MCM BotFlow</span>
        </div>
      </div>

      {/* Page Selector */}
      <div className="p-4 border-b border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentPage?.facebook_page_id ? `https://graph.facebook.com/${currentPage.facebook_page_id}/picture?type=large` : undefined} />
                <AvatarFallback>{currentPage?.name?.[0] || 'P'}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left text-sm font-medium truncate">{currentPage?.name || 'Select Page'}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass border-white/10">
            {pages.map((page) => (
              <DropdownMenuItem
                key={page.id}
                onClick={() => setCurrentPage(page)}
                className="cursor-pointer focus:bg-white/10"
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={`https://graph.facebook.com/${page.facebook_page_id}/picture?type=large`} />
                  <AvatarFallback>{page.name[0]}</AvatarFallback>
                </Avatar>
                <span>{page.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation
          .filter(item => !item.adminOnly || user?.role === 'admin')
          .map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <NavLink
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-primary text-primary-foreground glow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  item.adminOnly && "border border-amber-500/30"
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <Avatar className="h-10 w-10 ring-2 ring-primary/30">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
