import { motion } from "framer-motion";
import { Users, Send, CheckCheck, Eye, MousePointer, MessageCircle, Zap, Radio, UserPlus, TrendingUp, Loader2, RefreshCw, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { useDashboardStats, useMessagesByType, useSubscribersGrowth } from "@/hooks/useSupabase";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, RadialBarChart, RadialBar, Legend } from "recharts";

export default function Dashboard() {
  const { stats, loading, refetch } = useDashboardStats();
  const { data: messagesByType, loading: msgLoading } = useMessagesByType();
  const { data: subscribersGrowth, loading: subLoading } = useSubscribersGrowth();
  
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bonjour" : currentHour < 18 ? "Bon après-midi" : "Bonsoir";

  // Couleurs pour les graphiques
  const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
  
  // Données pour le graphique radial de conversion
  const conversionData = [
    { name: 'Clics', value: stats.clickRate, fill: '#f97316' },
    { name: 'Lus', value: stats.readRate, fill: '#a855f7' },
    { name: 'Délivrés', value: stats.deliveryRate, fill: '#22c55e' },
  ];

  return (
    <DashboardLayout pageName="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-display font-bold">{greeting} 👋</h1>
            <p className="text-muted-foreground">Vue d'ensemble de votre bot Messenger</p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={loading} className="border-white/10">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </motion.div>

        {/* Stats principales en ligne */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-blue-500/20 w-fit mx-auto mb-2">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold">{loading ? "..." : stats.totalSubscribers}</p>
              <p className="text-xs text-muted-foreground">Abonnés</p>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-cyan-500/20 w-fit mx-auto mb-2">
                <Send className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-cyan-400">{loading ? "..." : stats.totalMessagesSent}</p>
              <p className="text-xs text-muted-foreground">Envoyés</p>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-green-500/20 w-fit mx-auto mb-2">
                <CheckCheck className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{loading ? "..." : stats.totalMessagesDelivered}</p>
              <p className="text-xs text-muted-foreground">Délivrés</p>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-purple-500/20 w-fit mx-auto mb-2">
                <Eye className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-400">{loading ? "..." : stats.totalMessagesRead}</p>
              <p className="text-xs text-muted-foreground">Lus</p>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-orange-500/20 w-fit mx-auto mb-2">
                <MousePointer className="h-5 w-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-orange-400">{loading ? "..." : stats.totalButtonClicks}</p>
              <p className="text-xs text-muted-foreground">Clics</p>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
            <GlassCard className="p-4 text-center">
              <div className="p-2 rounded-full bg-pink-500/20 w-fit mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-pink-400" />
              </div>
              <p className="text-2xl font-bold text-pink-400">+{loading ? "..." : stats.newSubscribersToday}</p>
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Graphique principal - Croissance des abonnés (GRAND) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Croissance des Abonnés</h3>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-muted-foreground">Total cumulé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-muted-foreground">Nouveaux/jour</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              {subLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                      name="Total abonnés"
                      stroke="#06b6d4" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      animationDuration={1500}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="new" 
                      name="Nouveaux"
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
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Données insuffisantes</p>
                    <p className="text-xs mt-1">Les données apparaîtront avec plus d'abonnés</p>
                  </div>
                </div>
              )}
            </div>
            {/* Stats résumé sous le graphique */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{stats.totalSubscribers}</p>
                <p className="text-xs text-muted-foreground">Total Abonnés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.activeSubscribers}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-400">+{stats.newSubscribersToday}</p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {stats.totalSubscribers > 0 ? Math.round((stats.activeSubscribers / stats.totalSubscribers) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taux d'activité</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Graphiques secondaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart - Messages par type */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Messages par Type</h3>
              </div>
              <div className="h-[200px]">
                {msgLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <p className="text-sm">Aucun message envoyé</p>
                  </div>
                )}
              </div>
              {/* Légende */}
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {messagesByType.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Radial Chart - Taux de conversion */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Taux de Conversion</h3>
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
              {/* Légende */}
              <div className="flex flex-wrap gap-4 justify-center">
                {conversionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Configuration et Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel visuel amélioré */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Funnel de Performance</h3>
              </div>
              <div className="space-y-3">
                {/* Envoyés - 100% */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2"><Send className="h-4 w-4 text-cyan-400" /> Envoyés</span>
                    <span className="text-sm font-bold text-cyan-400">{stats.totalMessagesSent}</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                
                {/* Délivrés */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2"><CheckCheck className="h-4 w-4 text-green-400" /> Délivrés</span>
                    <span className="text-sm font-bold text-green-400">{stats.totalMessagesDelivered} ({stats.deliveryRate}%)</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.deliveryRate, 5)}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                    />
                  </div>
                </div>

                {/* Lus */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-purple-400" /> Lus</span>
                    <span className="text-sm font-bold text-purple-400">{stats.totalMessagesRead} ({stats.readRate}%)</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.readRate, 5)}%` }}
                      transition={{ duration: 1, delay: 0.9 }}
                    />
                  </div>
                </div>

                {/* Clics */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm flex items-center gap-2"><MousePointer className="h-4 w-4 text-orange-400" /> Clics</span>
                    <span className="text-sm font-bold text-orange-400">{stats.totalButtonClicks} ({stats.clickRate}%)</span>
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stats.clickRate, 5)}%` }}
                      transition={{ duration: 1, delay: 1.1 }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Configuration du Bot - Style cartes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Configuration du Bot</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${stats.welcomeMessageEnabled ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                  <MessageCircle className={`h-8 w-8 mb-2 ${stats.welcomeMessageEnabled ? 'text-green-400' : 'text-red-400'}`} />
                  <p className="text-sm font-medium">Message Bienvenue</p>
                  <p className={`text-lg font-bold ${stats.welcomeMessageEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.welcomeMessageEnabled ? '✓ Actif' : '✗ Inactif'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                  <Zap className="h-8 w-8 mb-2 text-indigo-400" />
                  <p className="text-sm font-medium">Réponses Auto</p>
                  <p className="text-lg font-bold text-indigo-400">{stats.responsesCount}</p>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <Send className="h-8 w-8 mb-2 text-amber-400" />
                  <p className="text-sm font-medium">Messages Séquence</p>
                  <p className="text-lg font-bold text-amber-400">{stats.sequenceMessagesCount}</p>
                </div>

                <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-500/10">
                  <Radio className="h-8 w-8 mb-2 text-pink-400" />
                  <p className="text-sm font-medium">Broadcasts</p>
                  <p className="text-lg font-bold text-pink-400">{stats.broadcastsCount}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
