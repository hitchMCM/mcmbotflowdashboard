import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Subscribers from "./pages/Subscribers";
import Welcome from "./pages/Welcome";
import Responses from "./pages/Responses";
import Sequences from "./pages/Sequences";
import Flows from "./pages/Flows";
import Broadcasts from "./pages/Broadcasts";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/subscribers" element={<ProtectedRoute><Subscribers /></ProtectedRoute>} />
          <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/responses" element={<ProtectedRoute><Responses /></ProtectedRoute>} />
          <Route path="/sequences" element={<ProtectedRoute><Sequences /></ProtectedRoute>} />
          <Route path="/flows" element={<ProtectedRoute><Flows /></ProtectedRoute>} />
          <Route path="/broadcasts" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
