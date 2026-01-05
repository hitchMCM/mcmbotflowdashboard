import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const pieData = [
  { name: "Career Hub", value: 1250, color: "#06B6D4" },
  { name: "Tech News", value: 890, color: "#8B5CF6" },
  { name: "Daily Tips", value: 456, color: "#10B981" },
];

const volumeData = [
  { name: "Mon", value: 450 }, { name: "Tue", value: 520 }, { name: "Wed", value: 380 },
  { name: "Thu", value: 620 }, { name: "Fri", value: 780 }, { name: "Sat", value: 540 }, { name: "Sun", value: 420 },
];

export default function Analytics() {
  return (
    <DashboardLayout pageName="Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your bot performance</p>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((period) => (
              <Button key={period} variant={period === "7d" ? "default" : "outline"} size="sm" className={period === "7d" ? "bg-gradient-primary" : "border-white/10"}>
                {period}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Messages", value: "12,847", change: "+12%" },
            { label: "Avg Delivery Rate", value: "98.5%", change: "+0.5%" },
            { label: "Flow Completion", value: "67.8%", change: "+3.2%" },
            { label: "Best Page", value: "Career Hub", change: "1.2k subs" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-success mt-1">{stat.change}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <GlassCard hover={false}>
            <h3 className="font-display font-semibold mb-4">Subscribers by Page</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
          
          <GlassCard hover={false}>
            <h3 className="font-display font-semibold mb-4">Message Volume</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
