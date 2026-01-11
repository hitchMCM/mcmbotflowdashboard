import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageProvider } from "@/contexts/PageContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/DashboardV2";
import Subscribers from "./pages/Subscribers";
import Flows from "./pages/Flows";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Configuration from "./pages/Configuration";
import Welcome from "./pages/Welcome";
import Responses from "./pages/Responses";
import Sequences from "./pages/Sequences";
import Broadcasts from "./pages/Broadcasts";
import NotFound from "./pages/NotFound";

console.log('[App] Loading application...');

const queryClient = new QueryClient();

// Wrapper for protected routes with PageProvider
const ProtectedWithPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <PageProvider>
      {children}
    </PageProvider>
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes - NO PageProvider */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes - WITH PageProvider */}
            <Route path="/dashboard" element={<ProtectedWithPage><Dashboard /></ProtectedWithPage>} />
            <Route path="/subscribers" element={<ProtectedWithPage><Subscribers /></ProtectedWithPage>} />
            <Route path="/flows" element={<ProtectedWithPage><Flows /></ProtectedWithPage>} />
            <Route path="/analytics" element={<ProtectedWithPage><Analytics /></ProtectedWithPage>} />
            <Route path="/welcome" element={<ProtectedWithPage><Welcome /></ProtectedWithPage>} />
            <Route path="/responses" element={<ProtectedWithPage><Responses /></ProtectedWithPage>} />
            <Route path="/sequences" element={<ProtectedWithPage><Sequences /></ProtectedWithPage>} />
            <Route path="/broadcasts" element={<ProtectedWithPage><Broadcasts /></ProtectedWithPage>} />
            <Route path="/configuration" element={<ProtectedWithPage><Configuration /></ProtectedWithPage>} />
            <Route path="/settings" element={<ProtectedWithPage><Settings /></ProtectedWithPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SettingsProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
