import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, Zap, Webhook, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "pages", label: "Pages", icon: Globe },
  { id: "workflows", label: "Workflows", icon: Zap },
  { id: "api", label: "API & Webhooks", icon: Webhook },
  { id: "team", label: "Team", icon: Users },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <DashboardLayout pageName="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your dashboard</p>
        </div>

        <div className="flex gap-6">
          <GlassCard hover={false} className="w-64 h-fit p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </GlassCard>

          <div className="flex-1">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <GlassCard hover={false}>
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <h3 className="font-display font-semibold text-lg">General Settings</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>App Name</Label>
                        <Input defaultValue="MCM BotFlow" className="bg-white/5 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Input defaultValue="UTC+0" className="bg-white/5 border-white/10" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                        <div>
                          <p className="font-medium">Dark Mode</p>
                          <p className="text-sm text-muted-foreground">Enable dark theme</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                    <Button className="bg-gradient-primary text-primary-foreground">Save Changes</Button>
                  </div>
                )}
                {activeTab === "api" && (
                  <div className="space-y-6">
                    <h3 className="font-display font-semibold text-lg">API & Webhooks</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-white/5">
                        <Label className="text-muted-foreground">Webhook URL</Label>
                        <div className="flex gap-2 mt-2">
                          <Input value="https://api.mcmbotflow.com/webhooks/..." readOnly className="bg-white/5 border-white/10" />
                          <Button variant="outline" className="border-white/10">Copy</Button>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                        <p className="text-success font-medium">✓ Lovable Cloud Connected</p>
                        <p className="text-sm text-muted-foreground mt-1">Your backend is fully configured</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab !== "general" && activeTab !== "api" && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Coming soon...</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
