import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  children: ReactNode;
  pageName?: string;
}

export function DashboardLayout({ children, pageName }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header pageName={pageName} />
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
