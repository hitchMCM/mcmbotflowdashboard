import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line
} from "recharts";
import { 
  Users, Send, CheckCheck, Eye, MousePointer, 
  Zap, Award, ArrowUpRight, ArrowDownRight,
  RefreshCw, Sparkles, MessageCircle, Radio, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
};

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#3b82f6'];

export default function Analytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalMessages: 0,
    delivered: 0,
    read: 0,
    clicks: 0,
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    welcomeEnabled: false,
    responsesCount: 0,
    sequencesCount: 0,
    broadcastsCount: 0,
  });
  const [messagesByDay, setMessagesByDay] = useState<any[]>([]);
  const [subscribersByDay, setSubscribersByDay] = useState<any[]>([]);
  const [messagesByType, setMessagesByType] = useState<any[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startISO = startDate.toISOString();

      const results = await Promise.allSettled([
        supabase.from('subscribers').select('id, is_active, is_subscribed, created_at'),
        supabase.from('message_logs').select('id, status, source_type, sent_at, delivered_at, read_at').gte('sent_at', startISO),
        supabase.from('button_clicks').select('id, clicked_at, source_type').gte('clicked_at', startISO),
        supabase.from('welcome_message').select('id, is_enabled').maybeSingle(),
        supabase.from('responses').select('id, times_triggered'),
        supabase.from('sequence_messages').select('id, sent_count, delivered_count, read_count'),
        supabase.from('broadcasts').select('id, name, sent_count, delivered_count, read_count, clicked_count, status'),
      ]);

      const subscribersRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const messagesRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const clicksRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
      const welcomeRes = results[3].status === 'fulfilled' ? results[3].value : { data: null };
      const responsesRes = results[4].status === 'fulfilled' ? results[4].value : { data: [] };
      const sequencesRes = results[5].status === 'fulfilled' ? results[5].value : { data: [] };
      const broadcastsRes = results[6].status === 'fulfilled' ? results[6].value : { data: [] };

      const subscribers = subscribersRes.data || [];
      const messages = messagesRes.data || [];
      const clicks = clicksRes.data || [];

      const totalSubscribers = subscribers.length;
      const activeSubscribers = subscribers.filter((s: any) => s.is_active && s.is_subscribed).length;
      const totalMessages = messages.length;
      const delivered = messages.filter((m: any) => m.delivered_at || m.status === 'delivered' || m.status === 'read').length;
      const read = messages.filter((m: any) => m.read_at || m.status === 'read').length;
      const totalClicks = clicks.length;

      setStats({
        totalSubscribers,
        activeSubscribers,
        totalMessages,
        delivered,
        read,
        clicks: totalClicks,
        deliveryRate: totalMessages > 0 ? Math.round((delivered / totalMessages) * 100) : 0,
        readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        clickRate: read > 0 ? Math.round((totalClicks / read) * 100) : 0,
        welcomeEnabled: welcomeRes.data?.is_enabled || false,
        responsesCount: Array.isArray(responsesRes.data) ? responsesRes.data.length : 0,
        sequencesCount: Array.isArray(sequencesRes.data) ? sequencesRes.data.length : 0,
        broadcastsCount: Array.isArray(broadcastsRes.data) ? broadcastsRes.data.length : 0,
      });

      // Messages by day
      const dayMap = new Map<string, { sent: number; delivered: number; read: number }>();
      messages.forEach((msg: any) => {
        const date = new Date(msg.sent_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const existing = dayMap.get(date) || { sent: 0, delivered: 0, read: 0 };
        existing.sent++;
        if (msg.delivered_at || msg.status === 'delivered' || msg.status === 'read') existing.delivered++;
        if (msg.read_at || msg.status === 'read') existing.read++;
        dayMap.set(date, existing);
      });
      setMessagesByDay(Array.from(dayMap.entries()).map(([date, data]) => ({ date, ...data })).slice(-14));

      // Subscribers growth
      const subDayMap = new Map<string, number>();
      subscribers.forEach((sub: any) => {
        const date = new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        subDayMap.set(date, (subDayMap.get(date) || 0) + 1);
      });
      let cumulative = 0;
      const subGrowth = Array.from(subDayMap.entries()).map(([date, count]) => {
        cumulative += count;
        return { date, new: count, total: cumulative };
      });
      setSubscribersByDay(subGrowth.slice(-14));

      // Messages by type
      const typeMap = new Map<string, number>();
      const typeLabels: Record<string, string> = {
        'welcome': 'Welcome',
        'response': 'Responses',
        'sequence': 'Sequences',
        'broadcast': 'Broadcasts'
      };
      messages.forEach((msg: any) => {
        const type = msg.source_type || 'other';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      setMessagesByType(Array.from(typeMap.entries()).map(([type, value], i) => ({
        name: typeLabels[type] || type,
        value,
        color: COLORS[i % COLORS.length]
      })));

      // Hourly activity
      const hourMap = new Map<number, number>();
      messages.forEach((msg: any) => {
        const hour = new Date(msg.sent_at).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });
      setHourlyActivity(Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}h`,
        value: hourMap.get(i) || 0,
      })));

      // Top performers
      const broadcasts = broadcastsRes.data || [];
      const sorted = (broadcasts as any[])
        .filter((b: any) => b.sent_count > 0)
        .map((b: any) => ({
          name: b.name,
          sent: b.sent_count,
          delivered: b.delivered_count,
          read: b.read_count,
          clicks: b.clicked_count,
          deliveryRate: b.sent_count > 0 ? Math.round((b.delivered_count / b.sent_count) * 100) : 0,
          readRate: b.delivered_count > 0 ? Math.round((b.read_count / b.delivered_count) * 100) : 0,
        }))
        .sort((a: any, b: any) => b.sent - a.sent)
        .slice(0, 5);
      setTopPerformers(sorted);

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const statCards = [
    { 
      label: "Total Subscribers", 
      value: stats.totalSubscribers, 
      icon: Users, 
      color: "from-cyan-500 to-blue-500",
      change: stats.activeSubscribers,
      changeLabel: "active",
      trend: "up"
    },
    { 
      label: "Messages Sent", 
      value: stats.totalMessages, 
      icon: Send, 
      color: "from-purple-500 to-pink-500",
      change: stats.deliveryRate,
      changeLabel: "% delivered",
      trend: "up"
    },
    { 
      label: "Messages Read", 
      value: stats.read, 
      icon: Eye, 
      color: "from-green-500 to-emerald-500",
      change: stats.readRate,
      changeLabel: "% read rate",
      trend: "up"
    },
    { 
      label: "Button Clicks", 
      value: stats.clicks, 
      icon: MousePointer, 
      color: "from-orange-500 to-red-500",
      change: stats.clickRate,
      changeLabel: "% click rate",
      trend: stats.clickRate > 10 ? "up" : "down"
    },
  ];

  const funnelData = [
    { name: 'Sent', value: stats.totalMessages, fill: '#06b6d4' },
    { name: 'Delivered', value: stats.delivered, fill: '#8b5cf6' },
    { name: 'Read', value: stats.read, fill: '#10b981' },
    { name: 'Clicked', value: stats.clicks, fill: '#f97316' },
  ];

  return (
    <DashboardLayout pageName="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Analyze your Messenger bot performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded-xl p-1">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <Button 
                  key={p} 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPeriod(p)}
                  className={`relative px-4 ${period === p ? 'text-white' : 'text-muted-foreground'}`}
                >
                  {period === p && (
                    <motion.div
                      layoutId="period-indicator"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{p}</span>
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAnalytics}
              disabled={loading}
              className="border-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${stat.trend === 'up' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}
                    >
                      {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {stat.change} {stat.changeLabel}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold">
                      {loading ? "..." : <AnimatedCounter value={stat.value} />}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <GlassCard hover={false} className="h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-semibold text-lg">Message Trends</h3>
                  <p className="text-sm text-muted-foreground">Sent, delivered and read per day</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-muted-foreground">Sent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Read</span>
                  </div>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={messagesByDay}>
                    <defs>
                      <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sent" stroke="#06b6d4" fill="url(#sentGradient)" strokeWidth={2} name="Sent" />
                    <Area type="monotone" dataKey="delivered" stroke="#8b5cf6" fill="url(#deliveredGradient)" strokeWidth={2} name="Delivered" />
                    <Line type="monotone" dataKey="read" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} name="Read" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Conversion Funnel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard hover={false} className="h-full">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-lg">Conversion Funnel</h3>
                <p className="text-sm text-muted-foreground">From send to click</p>
              </div>
              <div className="space-y-4">
                {funnelData.map((item, i) => {
                  const percentage = stats.totalMessages > 0 
                    ? Math.round((item.value / stats.totalMessages) * 100) 
                    : 0;
                  const prevValue = i > 0 ? funnelData[i - 1].value : item.value;
                  const conversionRate = prevValue > 0 ? Math.round((item.value / prevValue) * 100) : 0;
                  
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{item.value.toLocaleString()}</span>
                          {i > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {conversionRate}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard hover={false}>
              <h3 className="font-display font-semibold text-lg mb-4">Messages by Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={messagesByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {messagesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {messagesByType.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Subscribers Growth */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard hover={false}>
              <h3 className="font-display font-semibold text-lg mb-4">Subscriber Growth</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subscribersByDay}>
                    <defs>
                      <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      fill="url(#subGradient)" 
                      strokeWidth={3}
                      name="Total Subscribers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Hourly Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard hover={false}>
              <h3 className="font-display font-semibold text-lg mb-4">Activity by Hour</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivity} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" fontSize={10} interval={2} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                      name="Messages"
                    >
                      {hourlyActivity.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`hsl(${180 + entry.value * 0.5}, 70%, 50%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Top Performers & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Broadcasts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-yellow-500" />
                <h3 className="font-display font-semibold text-lg">Top Broadcasts</h3>
              </div>
              {topPerformers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Radio className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No broadcasts sent</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPerformers.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-gray-400/20 text-gray-300' :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-white/10 text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" /> {item.sent}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCheck className="h-3 w-3 text-green-400" /> {item.deliveryRate}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-purple-400" /> {item.readRate}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-400">{item.clicks}</p>
                        <p className="text-xs text-muted-foreground">clics</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-cyan-500" />
                <h3 className="font-display font-semibold text-lg">Bot Configuration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <MessageCircle className="h-8 w-8 text-cyan-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.welcomeEnabled ? 'Active' : 'Inactive'}</p>
                  <p className="text-sm text-muted-foreground">Welcome Message</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <Zap className="h-8 w-8 text-purple-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.responsesCount}</p>
                  <p className="text-sm text-muted-foreground">Auto Responses</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <Sparkles className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.sequencesCount}</p>
                  <p className="text-sm text-muted-foreground">Sequence Messages</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                  <Radio className="h-8 w-8 text-orange-400 mb-2" />
                  <p className="text-2xl font-bold">{stats.broadcastsCount}</p>
                  <p className="text-sm text-muted-foreground">Broadcasts</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Engagement Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <GlassCard hover={false} className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 rounded-full border-4 border-dashed border-purple-500/30"
                  />
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {Math.round((stats.deliveryRate + stats.readRate + stats.clickRate) / 3) || 0}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold">Engagement Score</h3>
                  <p className="text-muted-foreground">Average performance rates</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{stats.deliveryRate}%</p>
                  <p className="text-sm text-muted-foreground">Deliverability</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">{stats.readRate}%</p>
                  <p className="text-sm text-muted-foreground">Read Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-400">{stats.clickRate}%</p>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
