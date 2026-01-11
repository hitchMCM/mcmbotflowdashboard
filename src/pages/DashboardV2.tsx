import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, Send, CheckCheck, Eye, MousePointer, TrendingUp, 
  Loader2, RefreshCw, BarChart3, MessageCircle, Zap, Radio,
  Calendar, AlertCircle
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStats, useMessagesByType, useSubscribersGrowth } from "@/hooks/useSupabase";
import { StatCard, ConfigStatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PageSelector } from "@/components/dashboard/PageSelector";
import { usePage } from "@/contexts/PageContext";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, Tooltip, RadialBarChart, RadialBar 
} from "recharts";

type TimeRange = "today" | "week" | "month" | "all";

export default function Dashboard() {
  // Get current page from context for multi-page filtering
  const { currentPage } = usePage();
  const pageId = currentPage?.id;
  
  // Pass pageId to all hooks for page-specific data
  const { stats, loading, error, refetch } = useDashboardStats(pageId);
  const { data: messagesByType, loading: msgLoading } = useMessagesByType(pageId);
  const { data: subscribersGrowth, loading: subLoading } = useSubscribersGrowth(pageId);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  // Colors for charts
  const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
  
  // Conversion rate data
  const conversionData = [
    { name: 'Clicks', value: stats.clickRate, fill: '#f97316' },
    { name: 'Read', value: stats.readRate, fill: '#a855f7' },
    { name: 'Delivered', value: stats.deliveryRate, fill: '#22c55e' },
  ];

  return (
    <DashboardLayout pageName="Dashboard">
      <div className="space-y-6">
        {/* Header with Page Selector and Time Range */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          role="banner"
        >
          <div>
            <h1 className="text-3xl font-display font-bold">{greeting} 👋</h1>
            <p className="text-muted-foreground">Overview of your Messenger bot performance</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PageSelector />
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="outline" 
              onClick={refetch} 
              disabled={loading} 
              className="border-white/10"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </motion.header>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-red-400">Failed to load dashboard data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
              Retry
            </Button>
          </motion.div>
        )}

        {/* Main Stats Grid */}
        <section aria-label="Key metrics">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={Users}
              value={stats.totalSubscribers}
              label="Subscribers"
              loading={loading}
              color="blue"
              delay={0}
            />
            <StatCard
              icon={Send}
              value={stats.totalMessagesSent}
              label="Sent"
              loading={loading}
              color="cyan"
              delay={0.05}
            />
            <StatCard
              icon={CheckCheck}
              value={stats.totalMessagesDelivered}
              label="Delivered"
              loading={loading}
              color="green"
              delay={0.1}
            />
            <StatCard
              icon={Eye}
              value={stats.totalMessagesRead}
              label="Read"
              loading={loading}
              color="purple"
              delay={0.15}
            />
            <StatCard
              icon={MousePointer}
              value={stats.totalButtonClicks}
              label="Clicks"
              loading={loading}
              color="orange"
              delay={0.2}
            />
            <StatCard
              icon={TrendingUp}
              value={`+${stats.newSubscribersToday}`}
              label="Today"
              loading={loading}
              color="pink"
              delay={0.25}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          aria-label="Quick actions"
        >
          <QuickActions />
        </motion.section>

        {/* Main Chart - Subscriber Growth */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.35 }}
          aria-label="Subscriber growth chart"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="font-semibold text-lg">Subscriber Growth</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" aria-hidden="true" />
                  <span className="text-muted-foreground">Cumulative Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="text-muted-foreground">New per day</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              {subLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading chart" />
                </div>
              ) : subscribersGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subscribersGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#888' }} 
                      axisLine={{ stroke: '#333' }} 
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#888' }} 
                      axisLine={{ stroke: '#333' }} 
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid #333', borderRadius: '12px', padding: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#888', marginBottom: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Subscribers"
                      stroke="#06b6d4" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      animationDuration={1500}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="new" 
                      name="New"
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorNew)" 
                      animationDuration={1500}
                      animationBegin={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
                    <p className="text-sm font-medium">Insufficient Data</p>
                    <p className="text-xs mt-1">Data will appear with more subscribers</p>
                  </div>
                </div>
              )}
            </div>
            {/* Summary stats below chart */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : (
                  <p className="text-2xl font-bold text-cyan-400">{stats.totalSubscribers}</p>
                )}
                <p className="text-xs text-muted-foreground">Total Subscribers</p>
              </div>
              <div className="text-center">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : (
                  <p className="text-2xl font-bold text-green-400">{stats.activeSubscribers}</p>
                )}
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : (
                  <p className="text-2xl font-bold text-pink-400">+{stats.newSubscribersToday}</p>
                )}
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div className="text-center">
                {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : (
                  <p className="text-2xl font-bold text-amber-400">
                    {stats.totalSubscribers > 0 ? Math.round((stats.activeSubscribers / stats.totalSubscribers) * 100) : 0}%
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Activity Rate</p>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart - Messages by Type */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            aria-label="Messages by type"
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">Messages by Type</h2>
              </div>
              <div className="h-[200px]">
                {msgLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
                  </div>
                ) : messagesByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={messagesByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1000}
                      >
                        {messagesByType.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Send className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
                      <p className="text-sm">No messages sent yet</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {messagesByType.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      aria-hidden="true" 
                    />
                    <span className="text-xs">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.section>

          {/* Radial Chart - Conversion Rates */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.45 }}
            aria-label="Conversion rates"
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">Conversion Rates</h2>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="30%" 
                    outerRadius="100%" 
                    barSize={15} 
                    data={conversionData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background={{ fill: 'rgba(255,255,255,0.05)' }}
                      dataKey="value"
                      cornerRadius={10}
                      animationDuration={1500}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center">
                {conversionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.fill }} 
                      aria-hidden="true" 
                    />
                    <span className="text-xs">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.section>

          {/* Live Activity Feed */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            aria-label="Live activity"
          >
            <ActivityFeed pageId={pageId} />
          </motion.section>
        </div>

        {/* Bottom Row - Funnel & Bot Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Funnel */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.55 }}
            aria-label="Performance funnel"
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">Performance Funnel</h2>
              </div>
              <div className="space-y-3">
                {/* Sent - 100% */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <Send className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Sent
                    </span>
                    <span className="text-sm font-bold text-cyan-400">
                      {loading ? <Skeleton className="h-4 w-12 inline-block" /> : stats.totalMessagesSent}
                    </span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                </div>
                
                {/* Delivered */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCheck className="h-4 w-4 text-green-400" aria-hidden="true" /> Delivered
                    </span>
                    <span className="text-sm font-bold text-green-400">
                      {loading ? <Skeleton className="h-4 w-20 inline-block" /> : `${stats.totalMessagesDelivered} (${stats.deliveryRate}%)`}
                    </span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.deliveryRate, 5)}%` }}
                      transition={{ duration: 1, delay: 0.8 }}
                    />
                  </div>
                </div>

                {/* Read */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-400" aria-hidden="true" /> Read
                    </span>
                    <span className="text-sm font-bold text-purple-400">
                      {loading ? <Skeleton className="h-4 w-20 inline-block" /> : `${stats.totalMessagesRead} (${stats.readRate}%)`}
                    </span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.readRate, 5)}%` }}
                      transition={{ duration: 1, delay: 1 }}
                    />
                  </div>
                </div>

                {/* Clicks */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-orange-400" aria-hidden="true" /> Clicks
                    </span>
                    <span className="text-sm font-bold text-orange-400">
                      {loading ? <Skeleton className="h-4 w-20 inline-block" /> : `${stats.totalButtonClicks} (${stats.clickRate}%)`}
                    </span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.clickRate, 5)}%` }}
                      transition={{ duration: 1, delay: 1.2 }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.section>

          {/* Bot Configuration Status */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
            aria-label="Bot configuration"
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">Bot Configuration</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ConfigStatCard
                  icon={MessageCircle}
                  title="Welcome Message"
                  value={stats.welcomeMessageEnabled ? '✓ Active' : '✗ Inactive'}
                  isActive={stats.welcomeMessageEnabled}
                  color={stats.welcomeMessageEnabled ? "green" : "red"}
                />
                <ConfigStatCard
                  icon={Zap}
                  title="Auto Responses"
                  value={loading ? "..." : stats.responsesCount.toString()}
                  color="indigo"
                />
                <ConfigStatCard
                  icon={Send}
                  title="Sequence Messages"
                  value={loading ? "..." : stats.sequenceMessagesCount.toString()}
                  color="amber"
                />
                <ConfigStatCard
                  icon={Radio}
                  title="Broadcasts"
                  value={loading ? "..." : stats.broadcastsCount.toString()}
                  color="pink"
                />
              </div>
            </GlassCard>
          </motion.section>
        </div>
      </div>
    </DashboardLayout>
  );
}
