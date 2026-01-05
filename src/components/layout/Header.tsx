import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Bell, Plus, ChevronDown, Zap, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, logout } from "@/components/auth/ProtectedRoute";

interface HeaderProps {
  pageName?: string;
  isActive?: boolean;
}

export function Header({ pageName = "Career Hub", isActive = true }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasNotifications] = useState(true);
  const { user } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-40 glass border-b border-white/10 px-8 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Left: Page Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-display font-bold">{pageName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className={`relative transition-all duration-300 ${searchFocused ? 'glow-primary rounded-xl' : ''}`}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscribers, flows, broadcasts..."
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:border-primary/50 focus:bg-white/10"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 glow-sm rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Quick Action
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass border-white/10 w-48">
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10">
                <Zap className="h-4 w-4 mr-2 text-primary" />
                New Broadcast
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10">
                <Plus className="h-4 w-4 mr-2 text-primary" />
                Connect Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <button className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {hasNotifications && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
              />
            )}
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:block">
                  {user?.full_name || user?.email || 'User'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass border-white/10 w-48" align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10">
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                className="cursor-pointer focus:bg-red-500/10 text-red-400"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
