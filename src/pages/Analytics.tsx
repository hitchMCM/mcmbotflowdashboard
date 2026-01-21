import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { 
  Users, Send, CheckCheck, Eye, MousePointer, 
  Zap, Award, ArrowUpRight, ArrowDownRight,
  RefreshCw, Sparkles, MessageCircle, Radio, Activity,
  TrendingUp, Clock, Calendar, Globe, Target, 
  BarChart3, PieChart as PieChartIcon, Flame, Star,
  UserPlus, UserMinus, MessageSquare, Bot, Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { usePage } from "@/contexts/PageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000, suffix = "" }: { value: number; duration?: number; suffix?: string }) => {
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
  
  return <span>{count.toLocaleString()}{suffix}</span>;
};

// Sparkline mini chart
const SparkLine = ({ data, color }: { data: number[]; color: string }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-8">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#3b82f6', '#eab308', '#14b8a6'];

const CATEGORY_COLORS: Record<string, string> = {
  welcome: '#06b6d4',
  response: '#8b5cf6',
  sequence: '#10b981',
  broadcast: '#f97316',
};

export default function Analytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [view, setView] = useState<'overview' | 'subscribers' | 'messages' | 'pages'>('overview');
  const [loading, setLoading] = useState(true);
  const { currentPage, pages } = usePage();
  const { timezone } = useSettings();

  // Main stats
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    newSubscribersThisPeriod: 0,
    totalSends: 0,
    welcomeSends: 0,
    responseSends: 0,
    sequenceSends: 0,
    broadcastSends: 0,
    totalButtonClicks: 0,
    avgSendsPerDay: 0,
    avgSubscribersPerDay: 0,
    engagementScore: 0,
    topHour: 0,
    topDay: '',
  });

  // Button clicks data
  const [topButtonClicks, setTopButtonClicks] = useState<{ button_title: string; clicks: number; source_type: string }[]>([]);

  // Chart data
  const [subscriberGrowth, setSubscriberGrowth] = useState<any[]>([]);
  const [messagesByCategory, setMessagesByCategory] = useState<any[]>([]);
  const [hourlyHeatmap, setHourlyHeatmap] = useState<any[]>([]);
  const [pageComparison, setPageComparison] = useState<any[]>([]);
  const [recentSubscribers, setRecentSubscribers] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [weeklyPattern, setWeeklyPattern] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startISO = startDate.toISOString();

      // Fetch all data in parallel - using pages and messages tables for stats
      const [
        subscribersCountRes,
        subscribersRecentRes,
        pagesRes,
        configsRes,
        messagesRes,
      ] = await Promise.all([
        // Get total count of subscribers
        supabase.from('subscribers').select('id', { count: 'exact', head: true }),
        // Get only recent 500 subscribers for display
        supabase.from('subscribers').select('id, full_name, avatar_url, subscribed_at, is_active, page_id')
          .order('subscribed_at', { ascending: false })
          .limit(500),
        // Pages table has aggregated stats: total_sent, total_delivered, total_read, total_clicks
        supabase.from('pages').select('*'),
        supabase.from('page_configs').select('*'),
        supabase.from('messages').select('id, name, category, sent_count, delivered_count, read_count, clicked_count, created_at, messenger_payload'),
      ]);

      // Use count for totals, recent data for display
      const totalSubscribersCount = subscribersCountRes.count || 0;
      const subscribers = subscribersRecentRes.data || [];
      const allPages = (pagesRes.data || []) as any[];
      const configs = configsRes.data || [];
      const messages = messagesRes.data || [];

      // Debug: log data fetch results
      console.log('Analytics Debug:', {
        totalSubscribersCount,
        subscribersLoaded: subscribers.length,
        pages: allPages.length,
        configs: configs.length,
        messages: messages.length,
        // Sample data from pages table
        pagesStats: allPages.map(p => ({
          name: p.name,
          total_sent: p.total_sent,
          total_clicks: p.total_clicks
        })),
        // Totals calculated from messages
        msgClickedTotal: messages.reduce((sum, m) => sum + (m.clicked_count || 0), 0),
        msgSentTotal: messages.reduce((sum, m) => sum + (m.sent_count || 0), 0),
      });

      // Filter by period (from the 500 recent subscribers we loaded)
      const subscribersInPeriod = subscribers.filter(s => new Date(s.subscribed_at) >= startDate);
      
      // Basic stats - use count for total, loaded data for active estimation
      const totalSubscribers = totalSubscribersCount;
      const activeSubscribers = subscribers.filter(s => s.is_active).length;
      const newSubscribersThisPeriod = subscribersInPeriod.length;

      // Calculate sends from messages table (sent_count column)
      const welcomeSends = messages
        .filter(m => m.category === 'welcome')
        .reduce((sum, m) => sum + (m.sent_count || 0), 0);
      const responseSends = messages
        .filter(m => m.category === 'response')
        .reduce((sum, m) => sum + (m.sent_count || 0), 0);
      const sequenceSends = messages
        .filter(m => m.category === 'sequence')
        .reduce((sum, m) => sum + (m.sent_count || 0), 0);
      const broadcastSends = messages
        .filter(m => m.category === 'broadcast')
        .reduce((sum, m) => sum + (m.sent_count || 0), 0);
      
      // Get totals from pages table (primary source) or fallback to messages table
      const pagesTotalSent = allPages.reduce((sum, p) => sum + (p.total_sent || 0), 0);
      const msgTotalSent = welcomeSends + responseSends + sequenceSends + broadcastSends;
      const totalSends = Math.max(pagesTotalSent, msgTotalSent);
      
      // Button clicks - from pages table or messages table
      const pagesTotalClicks = allPages.reduce((sum, p) => sum + (p.total_clicks || 0), 0);
      const msgClickedCount = messages.reduce((sum, m) => sum + (m.clicked_count || 0), 0);
      const totalButtonClicks = Math.max(pagesTotalClicks, msgClickedCount);

      // Calculate averages
      const avgSendsPerDay = days > 0 ? Math.round(totalSends / days * 10) / 10 : 0;
      const avgSubscribersPerDay = days > 0 ? Math.round(newSubscribersThisPeriod / days * 10) / 10 : 0;

      // Top button clicks - extract from messages messenger_payload
      const buttonClickMap = new Map<string, { clicks: number; category: string }>();
      messages.forEach((msg: any) => {
        if (msg.clicked_count > 0) {
          // Try to extract button titles from messenger_payload
          const payload = msg.messenger_payload;
          const buttons = payload?._message_content?.elements?.[0]?.buttons || 
                         payload?.message?.attachment?.payload?.buttons ||
                         payload?.message?.attachment?.payload?.elements?.[0]?.buttons ||
                         [];
          
          if (buttons.length > 0) {
            // Distribute clicks across buttons
            const clicksPerButton = Math.round(msg.clicked_count / buttons.length);
            buttons.forEach((btn: any) => {
              const title = btn.title || 'Button';
              const existing = buttonClickMap.get(title) || { clicks: 0, category: msg.category };
              buttonClickMap.set(title, { 
                clicks: existing.clicks + clicksPerButton, 
                category: msg.category 
              });
            });
          } else {
            // No button info, use message name
            const title = msg.name || `${msg.category} message`;
            const existing = buttonClickMap.get(title) || { clicks: 0, category: msg.category };
            buttonClickMap.set(title, { 
              clicks: existing.clicks + msg.clicked_count, 
              category: msg.category 
            });
          }
        }
      });
      const topClicks = Array.from(buttonClickMap.entries())
        .map(([button_title, data]) => ({ button_title, clicks: data.clicks, source_type: data.category }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
      setTopButtonClicks(topClicks);

      // Engagement score (based on active configs, sends, and clicks)
      const activeConfigs = configs.filter(c => c.is_enabled);
      const engagementScore = Math.min(100, Math.round(
        (activeConfigs.length / Math.max(configs.length, 1)) * 30 +
        (activeSubscribers / Math.max(subscribers.length, 1)) * 25 +
        (totalSends > 0 ? 25 : 0) +
        (totalButtonClicks > 0 ? 20 : 0)
      ));

      // Find peak hour (from recent subscribers)
      const hourCounts: Record<number, number> = {};
      subscribers.forEach(s => {
        const hour = new Date(s.subscribed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '12';

      // Find peak day
      const dayCounts: Record<string, number> = {};
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      subscribers.forEach(s => {
        const day = dayNames[new Date(s.subscribed_at).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

      setStats({
        totalSubscribers,
        activeSubscribers,
        newSubscribersThisPeriod,
        totalSends,
        welcomeSends,
        responseSends,
        sequenceSends,
        broadcastSends,
        totalButtonClicks,
        avgSendsPerDay,
        avgSubscribersPerDay,
        engagementScore,
        topHour: parseInt(topHour),
        topDay,
      });

      // Subscriber growth chart
      const growthMap = new Map<string, { new: number; cumulative: number }>();
      let cumulative = 0;
      
      // Sort subscribers by date
      const sortedSubs = [...subscribers].sort((a, b) => 
        new Date(a.subscribed_at).getTime() - new Date(b.subscribed_at).getTime()
      );
      
      sortedSubs.forEach(s => {
        const date = new Date(s.subscribed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = growthMap.get(date) || { new: 0, cumulative: 0 };
        cumulative++;
        existing.new++;
        existing.cumulative = cumulative;
        growthMap.set(date, existing);
      });
      
      setSubscriberGrowth(Array.from(growthMap.entries()).slice(-14).map(([date, data]) => ({
        date,
        ...data,
      })));

      // Sends by category pie chart
      setMessagesByCategory([
        { name: 'Welcome', value: welcomeSends, color: CATEGORY_COLORS.welcome },
        { name: 'Response', value: responseSends, color: CATEGORY_COLORS.response },
        { name: 'Sequence', value: sequenceSends, color: CATEGORY_COLORS.sequence },
        { name: 'Broadcast', value: broadcastSends, color: CATEGORY_COLORS.broadcast },
      ].filter(item => item.value > 0));

      // Hourly heatmap data
      const maxHourCount = Math.max(...Object.values(hourCounts), 1);
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const count = hourCounts[hour] || 0;
        const intensity = count / maxHourCount;
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          value: count,
          intensity,
        };
      });
      setHourlyHeatmap(hourlyData);

      // Page comparison - use stats from pages table
      const pageStats = allPages.map(page => {
        const pageSubscribers = subscribers.filter(s => s.page_id === page.id);
        const pageConfigs = configs.filter(c => c.page_id === page.id);
        
        // Use stats directly from pages table
        const pageSends = page.total_sent || 0;
        const pageClicks = page.total_clicks || 0;
        
        return {
          name: page.name,
          subscribers: page.total_subscribers || pageSubscribers.length,
          sends: pageSends,
          clicks: pageClicks,
          activeConfigs: pageConfigs.filter(c => c.is_enabled).length,
          isActive: page.is_active,
        };
      }).sort((a, b) => b.subscribers - a.subscribers);
      
      setPageComparison(pageStats);
      setTopPages(pageStats.slice(0, 5));

      // Recent subscribers
      const recent = [...subscribers]
        .sort((a, b) => new Date(b.subscribed_at).getTime() - new Date(a.subscribed_at).getTime())
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          name: s.full_name || 'Anonymous',
          avatar: s.avatar_url,
          date: new Date(s.subscribed_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          isActive: s.is_active,
          page: allPages.find(p => p.id === s.page_id)?.name || 'Unknown',
        }));
      setRecentSubscribers(recent);

      // Category performance radar (based on sends)
      const maxSends = Math.max(welcomeSends, responseSends, sequenceSends, broadcastSends, 1);
      setCategoryPerformance([
        { category: 'Welcome', value: (welcomeSends / maxSends) * 100, fullMark: 100 },
        { category: 'Response', value: (responseSends / maxSends) * 100, fullMark: 100 },
        { category: 'Sequence', value: (sequenceSends / maxSends) * 100, fullMark: 100 },
        { category: 'Broadcast', value: (broadcastSends / maxSends) * 100, fullMark: 100 },
      ]);

      // Weekly pattern
      setWeeklyPattern(dayNames.map(day => ({
        day: day.slice(0, 3),
        subscribers: dayCounts[day] || 0,
      })));

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Stat cards configuration
  const statCards = [
    { 
      label: "Total Subscribers", 
      value: stats.totalSubscribers,
      icon: Users, 
      color: "from-cyan-500 to-blue-500",
      subValue: `${stats.activeSubscribers} active`,
      trend: stats.newSubscribersThisPeriod > 0 ? 'up' : 'neutral',
      sparkData: subscriberGrowth.map(d => d.cumulative),
    },
    { 
      label: "New This Period", 
      value: stats.newSubscribersThisPeriod,
      icon: UserPlus, 
      color: "from-green-500 to-emerald-500",
      subValue: `${stats.avgSubscribersPerDay}/day avg`,
      trend: 'up',
      sparkData: subscriberGrowth.map(d => d.new),
    },
    { 
      label: "Messages Sent", 
      value: stats.totalSends,
      icon: Send, 
      color: "from-purple-500 to-pink-500",
      subValue: `${stats.avgSendsPerDay}/day avg`,
      trend: stats.totalSends > 0 ? 'up' : 'neutral',
    },
    { 
      label: "Button Clicks", 
      value: stats.totalButtonClicks,
      icon: MousePointer, 
      color: "from-orange-500 to-red-500",
      subValue: "Total interactions",
      trend: stats.totalButtonClicks > 0 ? 'up' : 'neutral',
    },
  ];

  return (
    <DashboardLayout pageName="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-cyan-400" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time insights across {pages.length} page{pages.length !== 1 ? 's' : ''} • 
              <span className="text-cyan-400 ml-1">{stats.totalSubscribers.toLocaleString()} subscribers</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View Tabs */}
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="bg-white/5">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-500">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="pages">Pages</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Period Selector */}
            <div className="flex bg-white/5 rounded-xl p-1">
              {(['7d', '30d', '90d', 'all'] as const).map((p) => (
                <Button 
                  key={p} 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPeriod(p)}
                  className={`relative px-3 ${period === p ? 'text-white' : 'text-muted-foreground'}`}
                >
                  {period === p && (
                    <motion.div
                      layoutId="period-indicator"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{p === 'all' ? 'All' : p}</span>
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

        <AnimatePresence mode="wait">
          {view === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
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
                          {stat.sparkData && stat.sparkData.length > 1 && (
                            <SparkLine 
                              data={stat.sparkData} 
                              color={stat.trend === 'up' ? '#10b981' : stat.trend === 'down' ? '#ef4444' : '#6b7280'} 
                            />
                          )}
                        </div>
                        <div className="mt-4">
                          <p className="text-3xl font-bold">
                            {loading ? "..." : <AnimatedCounter value={stat.value} />}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                          <Badge 
                            variant="outline" 
                            className={`mt-2 ${
                              stat.trend === 'up' ? 'border-green-500/50 text-green-400' : 
                              stat.trend === 'down' ? 'border-red-500/50 text-red-400' : 
                              'border-gray-500/50 text-gray-400'
                            }`}
                          >
                            {stat.trend === 'up' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {stat.trend === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {stat.subValue}
                          </Badge>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subscriber Growth */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-2"
                >
                  <GlassCard hover={false} className="h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-cyan-400" />
                          Subscriber Growth
                        </h3>
                        <p className="text-sm text-muted-foreground">New subscribers and cumulative total</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-cyan-500" />
                          <span className="text-muted-foreground">Total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">New</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={subscriberGrowth}>
                          <defs>
                            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                          <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="cumulative" 
                            stroke="#06b6d4" 
                            fill="url(#cumulativeGradient)" 
                            strokeWidth={2} 
                            name="Total" 
                          />
                          <Bar 
                            dataKey="new" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]} 
                            name="New" 
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Messages by Category */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <GlassCard hover={false} className="h-full">
                    <div className="mb-4">
                      <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                        <Send className="h-5 w-5 text-purple-400" />
                        Sends by Type
                      </h3>
                      <p className="text-sm text-muted-foreground">{stats.totalSends} total sends</p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={messagesByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {messagesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {messagesByCategory.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm flex-1">{item.name}</span>
                          <span className="text-sm font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Peak Hours */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <GlassCard hover={false}>
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-400" />
                      Peak Activity Hours
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyHeatmap} barCategoryGap="10%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" fontSize={9} interval={3} />
                          <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Activity">
                            {hourlyHeatmap.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`rgba(249, 115, 22, ${0.3 + entry.intensity * 0.7})`}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-sm">Peak hour: <span className="font-bold text-orange-400">{stats.topHour}:00</span></span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Weekly Pattern */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <GlassCard hover={false}>
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-400" />
                      Weekly Pattern
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyPattern} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                          <YAxis dataKey="day" type="category" stroke="rgba(255,255,255,0.5)" fontSize={10} width={30} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="subscribers" fill="#10b981" radius={[0, 4, 4, 0]} name="Subscribers" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-400" />
                        <span className="text-sm">Best day: <span className="font-bold text-green-400">{stats.topDay}</span></span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Category Performance Radar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <GlassCard hover={false}>
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <Bot className="h-5 w-5 text-purple-400" />
                      Bot Performance
                    </h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={categoryPerformance}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="category" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                          <PolarRadiusAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                          <Radar 
                            name="Usage" 
                            dataKey="value" 
                            stroke="#8b5cf6" 
                            fill="#8b5cf6" 
                            fillOpacity={0.3} 
                          />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </motion.div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Subscribers */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <GlassCard hover={false}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-cyan-400" />
                        Recent Subscribers
                      </h3>
                      <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                        Live
                      </Badge>
                    </div>
                    <ScrollArea className="h-80">
                      <div className="space-y-2">
                        {recentSubscribers.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No subscribers yet</p>
                          </div>
                        ) : (
                          recentSubscribers.map((sub, i) => (
                            <motion.div
                              key={sub.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.8 + i * 0.05 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={sub.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.name}`} />
                                <AvatarFallback>{sub.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{sub.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.page}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{sub.date}</p>
                                <Badge variant={sub.isActive ? "default" : "secondary"} className="mt-1 text-xs">
                                  {sub.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </GlassCard>
                </motion.div>

                {/* Top Pages */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <GlassCard hover={false}>
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-display font-semibold text-lg">Top Pages</h3>
                    </div>
                    {topPages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No pages configured</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topPages.map((page, i) => {
                          const maxSubs = Math.max(...topPages.map(p => p.subscribers), 1);
                          const percentage = (page.subscribers / maxSubs) * 100;
                          
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.9 + i * 0.1 }}
                              className="space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-white/10 text-muted-foreground'
                                  }`}>
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium">{page.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {page.sends} sends • {page.activeConfigs} active triggers
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-cyan-400">{page.subscribers}</p>
                                  <p className="text-xs text-muted-foreground">subscribers</p>
                                </div>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              </div>

              {/* Engagement Score Footer */}
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
                            {stats.engagementScore}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold">Bot Health Score</h3>
                        <p className="text-muted-foreground">Overall performance indicator</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-cyan-400">{pages.length}</p>
                        <p className="text-sm text-muted-foreground">Pages</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-400">{stats.totalSends}</p>
                        <p className="text-sm text-muted-foreground">Sends</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-400">{stats.totalButtonClicks}</p>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-400">{stats.activeSubscribers}</p>
                        <p className="text-sm text-muted-foreground">Active Users</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}

          {/* Subscribers View */}
          {view === 'subscribers' && (
            <motion.div
              key="subscribers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard hover={false}>
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                    Subscriber Growth Over Time
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={subscriberGrowth}>
                        <defs>
                          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="#06b6d4" 
                          fill="url(#growthGradient)" 
                          strokeWidth={3}
                          name="Total Subscribers"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard hover={false}>
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-green-400" />
                    All Recent Subscribers
                  </h3>
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {recentSubscribers.map((sub, i) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={sub.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.name}`} />
                            <AvatarFallback>{sub.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">{sub.page}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{sub.date}</p>
                            <Badge variant={sub.isActive ? "default" : "secondary"} className="mt-1 text-xs">
                              {sub.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* Messages View */}
          {view === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Welcome', value: stats.welcomeSends, icon: MessageCircle, color: 'from-cyan-500 to-blue-500', textColor: 'text-cyan-400' },
                  { label: 'Response', value: stats.responseSends, icon: Zap, color: 'from-purple-500 to-pink-500', textColor: 'text-purple-400' },
                  { label: 'Sequence', value: stats.sequenceSends, icon: Clock, color: 'from-green-500 to-emerald-500', textColor: 'text-green-400' },
                  { label: 'Broadcast', value: stats.broadcastSends, icon: Radio, color: 'from-orange-500 to-red-500', textColor: 'text-orange-400' },
                ].map((item, i) => (
                  <GlassCard key={item.label}>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color}`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${item.textColor}`}>{item.value}</p>
                        <p className="text-sm text-muted-foreground">{item.label} Sent</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard hover={false}>
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <Send className="h-5 w-5 text-purple-400" />
                    Sends Distribution
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={messagesByCategory}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {messagesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard hover={false}>
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <MousePointer className="h-5 w-5 text-orange-400" />
                    Top Button Clicks
                  </h3>
                  <ScrollArea className="h-72">
                    {topButtonClicks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MousePointer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No button clicks recorded</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topButtonClicks.map((btn, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
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
                              <p className="font-medium truncate">{btn.button_title}</p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {btn.source_type}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-400">{btn.clicks}</p>
                              <p className="text-xs text-muted-foreground">clicks</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* Pages View */}
          {view === 'pages' && (
            <motion.div
              key="pages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <GlassCard hover={false}>
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  Page Comparison
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pageComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={12} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="subscribers" fill="#06b6d4" name="Subscribers" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="sends" fill="#8b5cf6" name="Sends" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageComparison.map((page, i) => (
                  <GlassCard key={i} className="hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          i === 1 ? 'bg-gray-400/20 text-gray-300' :
                          i === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/10 text-muted-foreground'
                        }`}>
                          #{i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <Badge variant={page.isActive ? "default" : "secondary"} className="mt-1">
                            {page.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-cyan-400">{page.subscribers}</p>
                        <p className="text-xs text-muted-foreground">Subscribers</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-400">{page.sends}</p>
                        <p className="text-xs text-muted-foreground">Sends</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{page.activeConfigs}</p>
                        <p className="text-xs text-muted-foreground">Triggers</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
