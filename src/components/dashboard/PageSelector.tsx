import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePage } from "@/contexts/PageContext";
import { cn } from "@/lib/utils";

export function PageSelector() {
  const { currentPage, pages, setCurrentPage, loading } = usePage();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading pages...</span>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <Globe className="h-4 w-4 text-yellow-400" />
        <span className="text-sm text-yellow-400">No pages connected</span>
      </div>
    );
  }

  // If only one page, show it without dropdown
  if (pages.length === 1) {
    const page = pages[0];
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
        <Avatar className="h-6 w-6">
          <AvatarImage src={page.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${page.facebook_page_id}`} />
          <AvatarFallback>{page.name?.[0] || 'P'}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{page.name}</span>
        <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
          Active
        </Badge>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select Facebook page"
          className="border-white/10 bg-white/5 hover:bg-white/10 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            {currentPage ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentPage.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentPage.facebook_page_id}`} />
                  <AvatarFallback>{currentPage.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[120px]">{currentPage.name}</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span>Select page</span>
              </>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[250px] bg-background/95 backdrop-blur-xl border-white/10" 
        align="start"
      >
        <AnimatePresence>
          {pages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DropdownMenuItem
                onClick={() => {
                  setCurrentPage(page);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer",
                  currentPage?.id === page.id && "bg-primary/10"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={page.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${page.facebook_page_id}`} />
                  <AvatarFallback>{page.name?.[0] || 'P'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{page.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {page.subscribers_count?.toLocaleString() || 0} subscribers
                  </p>
                </div>
                {currentPage?.id === page.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
