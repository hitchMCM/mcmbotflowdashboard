import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const subscriberData = [
  { name: "Mon", value: 120 },
  { name: "Tue", value: 180 },
  { name: "Wed", value: 150 },
  { name: "Thu", value: 220 },
  { name: "Fri", value: 280 },
  { name: "Sat", value: 350 },
  { name: "Sun", value: 420 },
];

const messagesData = [
  { name: "Career Hub", messages: 450, color: "#06B6D4" },
  { name: "Tech News", messages: 320, color: "#8B5CF6" },
  { name: "Daily Tips", messages: 180, color: "#10B981" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 rounded-xl border border-white/20">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-primary font-bold">{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard hover={false}>
          <h3 className="font-display font-semibold mb-6">Subscriber Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={subscriberData}>
                <defs>
                  <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#subscriberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard hover={false}>
          <h3 className="font-display font-semibold mb-6">Messages by Page</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="messages"
                  radius={[0, 8, 8, 0]}
                  fill="url(#barGradient)"
                >
                  {messagesData.map((entry, index) => (
                    <motion.rect
                      key={`bar-${index}`}
                      fill={entry.color}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
