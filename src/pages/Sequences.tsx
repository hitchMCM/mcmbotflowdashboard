import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { Plus, Trash2, Image, ExternalLink, Copy, Clock, Calendar, Edit, Eye, Save, Loader2, Code, RefreshCw, Send, CheckCheck, MousePointer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useMemo } from "react";
import { useAllSequenceMessages, useAllSequenceClicks } from "@/hooks/useSupabase";
import { useToast } from "@/hooks/use-toast";

interface MessageButton {
  type: "web_url" | "postback";
  url: string;
  title: string;
}

interface SequenceMessage {
  id: string;
  day: number;
  order: number;
  title: string;
  subtitle: string;
  image_url: string;
  buttons: MessageButton[];
  delay: string;
  // Stats
  sent_count: number;
  delivered_count: number;
  read_count: number;
  click_count: number;
}

const initialMessages: SequenceMessage[] = [
  {
    id: "1", day: 1, order: 1, delay: "0h",
    title: "{{ $json.Name_complet }}, Welcome! 🎉",
    subtitle: "We're excited to have you here. Let's get started!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/start", title: "🚀 Get Started" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "2", day: 1, order: 2, delay: "4h",
    title: "Here's what you can do 📋",
    subtitle: "Explore our top features and discover what suits you best.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/features", title: "✨ Explore" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "3", day: 1, order: 3, delay: "8h",
    title: "Pro tip for you! 💡",
    subtitle: "Complete your profile to get personalized recommendations.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/profile", title: "👤 Profile" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "4", day: 2, order: 1, delay: "24h",
    title: "New opportunities! 🌟",
    subtitle: "Check out today's fresh job listings matching your skills.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/jobs", title: "🔍 View Jobs" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "5", day: 2, order: 2, delay: "28h",
    title: "Success story 📖",
    subtitle: "See how others like you achieved their goals with us.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/stories", title: "📚 Read" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "6", day: 2, order: 3, delay: "32h",
    title: "Don't miss out! ⏰",
    subtitle: "Limited time offers are waiting for you. Act now!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [
      { type: "web_url", url: "https://example.com/offers", title: "🎁 See Offers" },
      { type: "web_url", url: "https://example.com/apply", title: "📝 Apply Now" }
    ],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  }
];

export default function Sequences() {
  const [messages, setMessages] = useState<SequenceMessage[]>(initialMessages);
  const [selectedMessage, setSelectedMessage] = useState<SequenceMessage | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { messages: dbMessages, loading, saveMessage, deleteMessage, deleteAllMessages, refetch } = useAllSequenceMessages();
  const { clicks: sequenceClicks } = useAllSequenceClicks();
  const { toast } = useToast();

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    const totalSent = messages.reduce((sum, m) => sum + m.sent_count, 0);
    const totalDelivered = messages.reduce((sum, m) => sum + m.delivered_count, 0);
    const totalRead = messages.reduce((sum, m) => sum + m.read_count, 0);
    const totalClicks = messages.reduce((sum, m) => sum + m.click_count, 0);
    
    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicks,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      readRate: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0,
      clickRate: totalRead > 0 ? Math.round((totalClicks / totalRead) * 100) : 0
    };
  }, [messages]);

  // Charger les données de Supabase au démarrage (fusion avec les messages initiaux)
  useEffect(() => {
    if (dbMessages.length > 0) {
      // Créer une map des messages de la DB par clé unique (day-order)
      const dbMessagesMap = new Map(
        dbMessages.map(msg => [`${msg.day}-${msg.order_in_day}`, msg])
      );
      
      // Fusionner: prendre les données de la DB si elles existent, sinon garder les valeurs initiales
      const mergedMessages: SequenceMessage[] = initialMessages.map((initial) => {
        const dbMsg = dbMessagesMap.get(`${initial.day}-${initial.order}`);
        // Récupérer les clics depuis la map (par source_id = message id en DB)
        const clickCount = dbMsg ? (sequenceClicks.get(dbMsg.id) || 0) : 0;
        
        if (dbMsg) {
          // Le message existe en DB, utiliser ses données
          return {
            id: dbMsg.id,
            day: dbMsg.day,
            order: dbMsg.order_in_day,
            title: dbMsg.title || "",
            subtitle: dbMsg.subtitle || "",
            image_url: dbMsg.image_url || "",
            buttons: (dbMsg.buttons as MessageButton[]) || [],
            delay: `${dbMsg.delay_hours || 0}h`,
            sent_count: dbMsg.sent_count || 0,
            delivered_count: dbMsg.delivered_count || 0,
            read_count: dbMsg.read_count || 0,
            click_count: clickCount
          };
        } else {
          // Le message n'existe pas en DB, garder les valeurs initiales
          return { ...initial, click_count: 0 };
        }
      });
      
      setMessages(mergedMessages);
    }
  }, [dbMessages, sequenceClicks]);

  const day1Messages = messages.filter(m => m.day === 1);
  const day2Messages = messages.filter(m => m.day === 2);

  const updateMessage = (id: string, updates: Partial<SequenceMessage>) => {
    setMessages(messages.map(m => m.id === id ? { ...m, ...updates } : m));
    if (selectedMessage?.id === id) setSelectedMessage({ ...selectedMessage, ...updates });
  };

  const updateButton = (messageId: string, buttonIndex: number, field: keyof MessageButton, value: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const newButtons = [...message.buttons];
      newButtons[buttonIndex] = { ...newButtons[buttonIndex], [field]: value };
      updateMessage(messageId, { buttons: newButtons });
    }
  };

  const addButton = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.buttons.length < 3) {
      updateMessage(messageId, { buttons: [...message.buttons, { type: "web_url", url: "", title: "New" }] });
    }
  };

  const removeButton = (messageId: string, buttonIndex: number) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      updateMessage(messageId, { buttons: message.buttons.filter((_, i) => i !== buttonIndex) });
    }
  };

  const generateJSON = (message: SequenceMessage) => ({
    recipient: { id: "{{ $json.ID }}" },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{ title: message.title, subtitle: message.subtitle, image_url: message.image_url, buttons: message.buttons }]
        }
      }
    }
  });

  const copyJSON = (message: SequenceMessage) => navigator.clipboard.writeText(JSON.stringify(generateJSON(message), null, 2));
  const copyAllJSON = () => navigator.clipboard.writeText(JSON.stringify(messages.map(m => ({ day: m.day, order: m.order, delay: m.delay, ...generateJSON(m) })), null, 2));

  // Synchroniser JSON avec le message sélectionné
  useEffect(() => {
    if (selectedMessage && !jsonEditMode) {
      setJsonText(JSON.stringify(generateJSON(selectedMessage), null, 2));
    }
  }, [selectedMessage, jsonEditMode]);

  const applyJsonChanges = () => {
    if (!selectedMessage) return;
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      
      if (parsed.message?.attachment?.payload?.elements?.[0]) {
        const element = parsed.message.attachment.payload.elements[0];
        updateMessage(selectedMessage.id, {
          title: element.title || "",
          subtitle: element.subtitle || "",
          image_url: element.image_url || "",
          buttons: element.buttons || []
        });
      }
      
      setJsonEditMode(false);
      toast({
        title: "✅ JSON appliqué !",
        description: "Le message a été mis à jour avec votre JSON.",
      });
    } catch (err) {
      setJsonError("JSON invalide: " + (err instanceof Error ? err.message : "Erreur de syntaxe"));
    }
  };

  const saveMessageToSupabase = async () => {
    if (!selectedMessage) return;
    setSaving(true);
    try {
      const delayHours = parseInt(selectedMessage.delay.replace('h', '')) || 0;
      const messengerPayload = generateJSON(selectedMessage);
      
      await saveMessage({
        title: selectedMessage.title,
        subtitle: selectedMessage.subtitle,
        image_url: selectedMessage.image_url,
        buttons: selectedMessage.buttons,
        delay_hours: delayHours,
        messenger_payload: messengerPayload
      }, selectedMessage.day, selectedMessage.order);
      
      toast({
        title: "✅ Sauvegardé !",
        description: `Message ${selectedMessage.day}.${selectedMessage.order} enregistré dans Supabase.`,
      });
      
      await refetch();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder le message.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllToSupabase = async () => {
    setSaving(true);
    try {
      for (const msg of messages) {
        const delayHours = parseInt(msg.delay.replace('h', '')) || 0;
        const messengerPayload = generateJSON(msg);
        
        await saveMessage({
          title: msg.title,
          subtitle: msg.subtitle,
          image_url: msg.image_url,
          buttons: msg.buttons,
          delay_hours: delayHours,
          messenger_payload: messengerPayload
        }, msg.day, msg.order);
      }
      
      toast({
        title: "✅ Tous sauvegardés !",
        description: `${messages.length} messages enregistrés dans Supabase.`,
      });
      
      await refetch();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder les messages.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteMessageFromSupabase = async () => {
    if (!selectedMessage) return;
    try {
      await deleteMessage(selectedMessage.day, selectedMessage.order);
      toast({
        title: "🗑️ Supprimé !",
        description: `Message ${selectedMessage.day}.${selectedMessage.order} supprimé.`,
      });
      setSelectedMessage(null);
      await refetch();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le message.",
        variant: "destructive"
      });
    }
  };

  const deleteAllFromSupabase = async () => {
    try {
      await deleteAllMessages();
      setMessages(initialMessages);
      setSelectedMessage(null);
      toast({
        title: "🗑️ Tout supprimé !",
        description: "Tous les messages ont été supprimés. Valeurs par défaut restaurées.",
      });
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer les messages.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout pageName="Sequences">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Séquences</h1>
            <p className="text-muted-foreground">{loading ? "Chargement..." : `${messages.length} messages sur 2 jours`}</p>
          </div>
          <div className="flex gap-2">
            {dbMessages.length > 0 && (
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={deleteAllFromSupabase}>
                <Trash2 className="h-4 w-4 mr-2" />Supprimer tout
              </Button>
            )}
            <Button variant="outline" className="border-white/10" onClick={copyAllJSON}><Copy className="h-4 w-4 mr-2" />Copier Tout</Button>
            <Button 
              className="bg-gradient-primary text-primary-foreground" 
              onClick={saveAllToSupabase}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Sauvegarder tout</>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 glass rounded-xl">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          <div>
            <p className="font-medium">Séquence activée</p>
            <p className="text-sm text-muted-foreground">Les nouveaux abonnés recevront cette séquence</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          <GlassCard><div className="text-center"><p className="text-2xl font-bold gradient-text">{loading ? "..." : messages.length}</p><p className="text-xs text-muted-foreground mt-1">Messages</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-blue-400">{globalStats.totalSent}</p><p className="text-xs text-muted-foreground mt-1">Envoyés</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-green-400">{globalStats.totalDelivered}</p><p className="text-xs text-muted-foreground mt-1">Délivrés</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-purple-400">{globalStats.totalRead}</p><p className="text-xs text-muted-foreground mt-1">Lus</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-orange-400">{globalStats.totalClicks}</p><p className="text-xs text-muted-foreground mt-1">Clics</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-cyan-400">{globalStats.deliveryRate}%</p><p className="text-xs text-muted-foreground mt-1">Délivrance</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-pink-400">{globalStats.readRate}%</p><p className="text-xs text-muted-foreground mt-1">Lecture</p></div></GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <GlassCard hover={false} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-primary/20"><Calendar className="h-4 w-4 text-primary" /></div>
                <div><h3 className="font-display font-semibold text-sm">Jour 1</h3><p className="text-xs text-muted-foreground">{day1Messages.length} messages</p></div>
              </div>
              <div className="space-y-2">
                {day1Messages.map((msg, i) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${selectedMessage?.id === msg.id ? 'bg-primary/20 border border-primary/50' : 'bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">{msg.order}</div>
                        <div>
                          <p className="font-medium text-xs truncate max-w-[120px]">{msg.title.replace("{{ $json.Name_complet }}", "User")}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />+{msg.delay}</span>
                            {msg.sent_count > 0 && (
                              <span className="flex items-center gap-0.5 text-blue-400"><Send className="h-2.5 w-2.5" />{msg.sent_count}</span>
                            )}
                            {msg.delivered_count > 0 && (
                              <span className="flex items-center gap-0.5 text-green-400"><CheckCheck className="h-2.5 w-2.5" />{msg.delivered_count}</span>
                            )}
                            {msg.read_count > 0 && (
                              <span className="flex items-center gap-0.5 text-purple-400"><Eye className="h-2.5 w-2.5" />{msg.read_count}</span>
                            )}
                            {msg.click_count > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-400"><MousePointer className="h-2.5 w-2.5" />{msg.click_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); copyJSON(msg); }}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <GlassCard hover={false} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-secondary/20"><Calendar className="h-4 w-4 text-secondary" /></div>
                <div><h3 className="font-display font-semibold text-sm">Jour 2</h3><p className="text-xs text-muted-foreground">{day2Messages.length} messages</p></div>
              </div>
              <div className="space-y-2">
                {day2Messages.map((msg, i) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${selectedMessage?.id === msg.id ? 'bg-secondary/20 border border-secondary/50' : 'bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">{msg.order}</div>
                        <div>
                          <p className="font-medium text-xs truncate max-w-[120px]">{msg.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />+{msg.delay}</span>
                            {msg.sent_count > 0 && (
                              <span className="flex items-center gap-0.5 text-blue-400"><Send className="h-2.5 w-2.5" />{msg.sent_count}</span>
                            )}
                            {msg.delivered_count > 0 && (
                              <span className="flex items-center gap-0.5 text-green-400"><CheckCheck className="h-2.5 w-2.5" />{msg.delivered_count}</span>
                            )}
                            {msg.read_count > 0 && (
                              <span className="flex items-center gap-0.5 text-purple-400"><Eye className="h-2.5 w-2.5" />{msg.read_count}</span>
                            )}
                            {msg.click_count > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-400"><MousePointer className="h-2.5 w-2.5" />{msg.click_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); copyJSON(msg); }}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selectedMessage ? (
              <>
                <GlassCard hover={false}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-semibold">Message {selectedMessage.day}.{selectedMessage.order}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={selectedMessage.day === 1 ? "bg-primary" : "bg-secondary"}>Jour {selectedMessage.day}</Badge>
                      {dbMessages.some(m => m.day === selectedMessage.day && m.order_in_day === selectedMessage.order) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={deleteMessageFromSupabase}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Statistiques d'envoi */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Send className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-blue-400 font-medium">Envoyés</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">{selectedMessage.sent_count}</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCheck className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Délivrés</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">{selectedMessage.delivered_count}</p>
                      {selectedMessage.sent_count > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {Math.round((selectedMessage.delivered_count / selectedMessage.sent_count) * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-purple-400 font-medium">Lus</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-400">{selectedMessage.read_count}</p>
                      {selectedMessage.delivered_count > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {Math.round((selectedMessage.read_count / selectedMessage.delivered_count) * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointer className="h-4 w-4 text-orange-400" />
                        <span className="text-xs text-orange-400 font-medium">Clics</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">{selectedMessage.click_count}</p>
                      {selectedMessage.read_count > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {Math.round((selectedMessage.click_count / selectedMessage.read_count) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label><Clock className="h-4 w-4 inline mr-1" />Délai</Label><Input value={selectedMessage.delay} onChange={(e) => updateMessage(selectedMessage.id, { delay: e.target.value })} className="bg-white/5 border-white/10" /></div>
                      <div className="space-y-2"><Label><Image className="h-4 w-4 inline mr-1" />Image</Label><Input value={selectedMessage.image_url} onChange={(e) => updateMessage(selectedMessage.id, { image_url: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    </div>
                    <div className="space-y-2"><Label>Titre</Label><Input value={selectedMessage.title} onChange={(e) => updateMessage(selectedMessage.id, { title: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Sous-titre</Label><Textarea value={selectedMessage.subtitle} onChange={(e) => updateMessage(selectedMessage.id, { subtitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" /></div>
                    <div className="space-y-3">
                      <div className="flex justify-between"><Label>Boutons</Label>{selectedMessage.buttons.length < 3 && <Button variant="outline" size="sm" onClick={() => addButton(selectedMessage.id)} className="border-white/10"><Plus className="h-4 w-4" /></Button>}</div>
                      {selectedMessage.buttons.map((btn, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-lg space-y-2">
                          <div className="flex justify-between"><span className="text-xs text-muted-foreground">Bouton {i + 1}</span><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeButton(selectedMessage.id, i)}><Trash2 className="h-3 w-3" /></Button></div>
                          <Input value={btn.title} onChange={(e) => updateButton(selectedMessage.id, i, "title", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="Texte" />
                          <Input value={btn.url} onChange={(e) => updateButton(selectedMessage.id, i, "url", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="URL" />
                        </div>
                      ))}
                    </div>
                    <Button 
                      className="w-full bg-gradient-primary text-primary-foreground mt-4" 
                      onClick={saveMessageToSupabase}
                      disabled={saving}
                    >
                      {saving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" />Sauvegarder ce message</>
                      )}
                    </Button>
                  </div>
                </GlassCard>
                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-4"><Eye className="h-5 w-5 text-primary" /><h3 className="font-display font-semibold">Aperçu</h3></div>
                  <div className="bg-[#0084ff]/10 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0" />
                      <div className="bg-white rounded-2xl rounded-tl-none overflow-hidden max-w-[280px] shadow-lg">
                        {selectedMessage.image_url && <img src={selectedMessage.image_url} alt="" className="w-full h-32 object-cover" />}
                        <div className="p-3 bg-white text-black">
                          <h4 className="font-semibold text-sm">{selectedMessage.title.replace("{{ $json.Name_complet }}", "John")}</h4>
                          <p className="text-xs text-gray-600 mt-1">{selectedMessage.subtitle}</p>
                        </div>
                        <div className="border-t border-gray-200">
                          {selectedMessage.buttons.map((btn, i) => (
                            <div key={i} className="flex items-center justify-center gap-2 py-2 text-[#0084ff] text-sm font-medium border-b border-gray-100 last:border-0">{btn.title}<ExternalLink className="h-3 w-3" /></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
                <GlassCard hover={false}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">JSON {jsonEditMode ? "(Mode Édition)" : ""}</h3>
                    </div>
                    <div className="flex gap-2">
                      {jsonEditMode ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => { setJsonEditMode(false); setJsonError(null); }} className="border-white/10">Annuler</Button>
                          <Button size="sm" onClick={applyJsonChanges} className="bg-green-600 hover:bg-green-700"><RefreshCw className="h-3 w-3 mr-1" />Appliquer</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setJsonEditMode(true)} className="border-white/10"><Code className="h-3 w-3 mr-1" />Éditer</Button>
                          <Button variant="outline" size="sm" onClick={() => copyJSON(selectedMessage)} className="border-white/10"><Copy className="h-3 w-3 mr-1" />Copier</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {jsonError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 mb-2 text-xs text-red-400">
                      {jsonError}
                    </div>
                  )}
                  {jsonEditMode ? (
                    <Textarea 
                      value={jsonText} 
                      onChange={(e) => setJsonText(e.target.value)} 
                      className="bg-black/30 border-white/10 font-mono text-xs text-green-400 min-h-[200px]"
                      spellCheck={false}
                    />
                  ) : (
                    <pre className="bg-black/30 rounded-xl p-3 overflow-auto text-xs text-green-400 max-h-[150px]">{JSON.stringify(generateJSON(selectedMessage), null, 2)}</pre>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">💡 Cliquez sur "Éditer" pour modifier le JSON directement.</p>
                </GlassCard>
              </>
            ) : (
              <GlassCard hover={false} className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground"><Edit className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Sélectionnez un message</p></div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
