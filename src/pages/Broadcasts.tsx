import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Plus, Clock, Image, ExternalLink, Copy, Eye, Save, Trash2, Edit, Radio, Loader2, Code, Send, CheckCheck, MousePointer, Calendar, Rocket, Settings, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MessageButton {
  type: "web_url" | "postback";
  url: string;
  title: string;
}

interface BroadcastMessage {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  image_url: string;
  buttons: MessageButton[];
  send_time: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  click_count: number;
}

const initialMessages: BroadcastMessage[] = [
  {
    id: "1", order: 1, send_time: "08:00",
    title: "{{ $json.Name_complet }}, Exclusive Offer! 🎁",
    subtitle: "We have something special just for you. Don't miss out!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/offer", title: "🎁 Get Offer" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "2", order: 2, send_time: "10:00",
    title: "Still thinking about it? 🤔",
    subtitle: "Your exclusive offer is waiting. Limited spots available!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/offer", title: "✨ Claim Now" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "3", order: 3, send_time: "12:00",
    title: "People are loving this! ❤️",
    subtitle: "Join thousands who already took action.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/testimonials", title: "📖 See Stories" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "4", order: 4, send_time: "14:00",
    title: "Reminder: Your spot is reserved 📌",
    subtitle: "We're holding your place. Don't let it go!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/reserve", title: "✅ Confirm Spot" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "5", order: 5, send_time: "16:00",
    title: "Hours left! ⚡",
    subtitle: "Only a few hours remaining. Make your move!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [{ type: "web_url", url: "https://example.com/final", title: "⚡ Go Now" }],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  },
  {
    id: "6", order: 6, send_time: "18:00",
    title: "Last call! 🚨",
    subtitle: "This is it. Your final opportunity is closing soon!",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [
      { type: "web_url", url: "https://example.com/final", title: "🔥 Final Chance" },
      { type: "web_url", url: "https://example.com/contact", title: "💬 Talk to Us" }
    ],
    sent_count: 0, delivered_count: 0, read_count: 0, click_count: 0
  }
];

export default function Broadcasts() {
  const [messages, setMessages] = useState<BroadcastMessage[]>(initialMessages);
  const [selectedMessage, setSelectedMessage] = useState<BroadcastMessage | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [broadcastName, setBroadcastName] = useState("Campagne Promo Janvier");
  const [scheduledDate, setScheduledDate] = useState("2026-01-15");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [broadcastStatus, setBroadcastStatus] = useState<"draft" | "scheduled" | "sending" | "sent">("draft");
  const [scheduling, setScheduling] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("https://n8n.srv815482.hstgr.cloud/webhook/broadcast");
  const [showSettings, setShowSettings] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const { toast } = useToast();

  // Calculer le temps restant (affichage seulement)
  const getTimeRemaining = () => {
    if (!scheduledAt || broadcastStatus !== "scheduled") return null;
    const now = new Date();
    const diff = scheduledAt.getTime() - now.getTime();
    if (diff <= 0) return "Envoi imminent...";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

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

  // Charger les données de Supabase
  useEffect(() => {
    const loadBroadcasts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const loadedMessages: BroadcastMessage[] = data.map((msg: any, index: number) => ({
            id: msg.id,
            order: index + 1,
            title: msg.title || initialMessages[index]?.title || "",
            subtitle: msg.subtitle || msg.description || initialMessages[index]?.subtitle || "",
            image_url: msg.image_url || initialMessages[index]?.image_url || "",
            buttons: (msg.buttons as MessageButton[]) || [],
            send_time: msg.scheduled_time ? msg.scheduled_time.substring(0, 5) : "08:00",
            sent_count: msg.sent_count || 0,
            delivered_count: msg.delivered_count || 0,
            read_count: msg.read_count || 0,
            click_count: msg.clicked_count || 0
          }));
          setMessages(loadedMessages);

          // Charger le statut et la date programmée
          const firstMsg = data[0];
          if (firstMsg.name) setBroadcastName(firstMsg.name.split(' - ')[0] || firstMsg.name);
          if (firstMsg.status === 'scheduled' && firstMsg.scheduled_date) {
            setBroadcastStatus('scheduled');
            setScheduledDate(firstMsg.scheduled_date);
            if (firstMsg.scheduled_time) {
              setScheduledTime(firstMsg.scheduled_time.substring(0, 5));
            }
            const schedDate = new Date(firstMsg.scheduled_date);
            if (firstMsg.scheduled_time) {
              const [h, m] = firstMsg.scheduled_time.split(':');
              schedDate.setHours(parseInt(h), parseInt(m));
            }
            setScheduledAt(schedDate);
          } else if (firstMsg.status === 'sent') {
            setBroadcastStatus('sent');
          }
        }
      } catch (err) {
        console.error("Erreur chargement broadcasts:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBroadcasts();
  }, []);

  const updateMessage = (id: string, updates: Partial<BroadcastMessage>) => {
    setMessages(messages.map(m => m.id === id ? { ...m, ...updates } : m));
    if (selectedMessage?.id === id) setSelectedMessage({ ...selectedMessage, ...updates });
  };

  const updateButton = (id: string, index: number, field: keyof MessageButton, value: string) => {
    const msg = messages.find(m => m.id === id);
    if (msg) {
      const btns = [...msg.buttons];
      btns[index] = { ...btns[index], [field]: value };
      updateMessage(id, { buttons: btns });
    }
  };

  const addButton = (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (msg && msg.buttons.length < 3) {
      updateMessage(id, { buttons: [...msg.buttons, { type: "web_url", url: "", title: "New" }] });
    }
  };

  const removeButton = (id: string, index: number) => {
    const msg = messages.find(m => m.id === id);
    if (msg) updateMessage(id, { buttons: msg.buttons.filter((_, i) => i !== index) });
  };

  const generateJSON = (msg: BroadcastMessage) => ({
    recipient: { id: "{{ $json.ID }}" },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{ title: msg.title, subtitle: msg.subtitle, image_url: msg.image_url, buttons: msg.buttons }]
        }
      }
    }
  });

  const copyJSON = (msg: BroadcastMessage) => {
    navigator.clipboard.writeText(JSON.stringify(generateJSON(msg), null, 2));
    toast({ title: "📋 Copié !", description: "JSON copié dans le presse-papiers" });
  };
  
  const copyAllJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(messages.map(m => ({ order: m.order, send_time: m.send_time, ...generateJSON(m) })), null, 2));
    toast({ title: "📋 Tout copié !", description: "Tous les JSON copiés" });
  };

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
      toast({ title: "✅ JSON appliqué !", description: "Le message a été mis à jour." });
    } catch (err) {
      setJsonError("JSON invalide: " + (err instanceof Error ? err.message : "Erreur"));
    }
  };

  const saveMessageToSupabase = async () => {
    if (!selectedMessage) return;
    setSaving(true);
    try {
      const messengerPayload = generateJSON(selectedMessage);
      const messageName = `${broadcastName} - Message ${selectedMessage.order}`;
      
      // Chercher si ce message existe déjà par son nom
      const { data: existing, error: findError } = await supabase
        .from('broadcasts')
        .select('id')
        .eq('name', messageName)
        .maybeSingle();
      
      console.log("Recherche existant:", { messageName, existing, findError });
      
      let error;
      
      const dataToSave = {
        name: messageName,
        title: selectedMessage.title,
        subtitle: selectedMessage.subtitle,
        description: selectedMessage.subtitle,
        image_url: selectedMessage.image_url,
        buttons: selectedMessage.buttons,
        scheduled_date: scheduledDate,
        scheduled_time: selectedMessage.send_time + ':00',
        messenger_payload: messengerPayload
      };
      
      console.log("Données à sauvegarder:", JSON.stringify(dataToSave, null, 2));
      
      if (existing) {
        // Update
        console.log("Update existing ID:", existing.id);
        const result = await supabase
          .from('broadcasts')
          .update(dataToSave)
          .eq('id', existing.id)
          .select();
        console.log("Update result:", result);
        error = result.error;
      } else {
        // Insert
        console.log("Inserting new record");
        const result = await supabase
          .from('broadcasts')
          .insert(dataToSave)
          .select();
        console.log("Insert result:", result);
        error = result.error;
      }
      
      if (error) throw error;
      
      toast({ title: "✅ Sauvegardé !", description: `Message #${selectedMessage.order} enregistré.` });
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      toast({ title: "❌ Erreur", description: error?.message || "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAllToSupabase = async () => {
    setSaving(true);
    try {
      for (const msg of messages) {
        const messengerPayload = generateJSON(msg);
        const messageName = `${broadcastName} - Message ${msg.order}`;
        
        // Vérifier si existe déjà
        const { data: existing } = await supabase
          .from('broadcasts')
          .select('id')
          .eq('name', messageName)
          .maybeSingle();
        
        const dataToSave = {
          name: messageName,
          title: msg.title,
          subtitle: msg.subtitle,
          description: msg.subtitle,
          image_url: msg.image_url,
          buttons: msg.buttons,
          scheduled_date: scheduledDate,
          scheduled_time: msg.send_time + ':00',
          messenger_payload: messengerPayload
        };
        
        if (existing) {
          await supabase
            .from('broadcasts')
            .update(dataToSave)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('broadcasts')
            .insert(dataToSave);
        }
      }
      
      toast({ title: "✅ Tous sauvegardés !", description: `${messages.length} messages enregistrés.` });
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      toast({ title: "❌ Erreur", description: error?.message || "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteAllFromSupabase = async () => {
    try {
      // Supprimer tous les messages de ce broadcast
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .like('name', `${broadcastName} - Message%`);
      if (error) throw error;
      
      setMessages(initialMessages);
      setSelectedMessage(null);
      setBroadcastStatus("draft");
      toast({ title: "🗑️ Supprimé !", description: "Tous les messages ont été supprimés." });
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({ title: "❌ Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  // Programmer le broadcast - sauvegarde dans Supabase, n8n vérifie automatiquement
  const scheduleBroadcast = async () => {
    setScheduling(true);
    try {
      // Combiner date et heure pour le timestamp programmé
      const scheduled = new Date(`${scheduledDate}T${scheduledTime}:00`);
      setScheduledAt(scheduled);
      
      // Sauvegarder tous les messages avec le statut scheduled
      for (const msg of messages) {
        const messengerPayload = generateJSON(msg);
        const messageName = `${broadcastName} - Message ${msg.order}`;
        
        // Vérifier si existe déjà
        const { data: existing } = await supabase
          .from('broadcasts')
          .select('id')
          .eq('name', messageName)
          .maybeSingle();
        
        const dataToSave = {
          name: messageName,
          title: msg.title,
          subtitle: msg.subtitle,
          description: msg.subtitle,
          image_url: msg.image_url,
          buttons: msg.buttons,
          scheduled_date: scheduledDate,
          scheduled_time: msg.send_time + ':00',
          messenger_payload: messengerPayload,
          status: 'scheduled'
        };
        
        if (existing) {
          await supabase.from('broadcasts').update(dataToSave).eq('id', existing.id);
        } else {
          await supabase.from('broadcasts').insert(dataToSave);
        }
      }

      setBroadcastStatus("scheduled");
      toast({ 
        title: "🚀 Broadcast programmé !", 
        description: `n8n enverra automatiquement le ${scheduledDate} à ${scheduledTime}` 
      });
    } catch (error: any) {
      console.error("Erreur programmation:", error);
      toast({ title: "❌ Erreur", description: error?.message || "Impossible de programmer.", variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  // Envoyer immédiatement
  const sendNow = async () => {
    if (!n8nWebhookUrl) {
      toast({ title: "⚠️ Configuration requise", description: "Veuillez configurer l'URL du webhook n8n.", variant: "destructive" });
      setShowSettings(true);
      return;
    }

    setScheduling(true);
    setBroadcastStatus("sending");
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_now',
          broadcast_name: broadcastName,
          messages: messages.map(msg => ({
            order: msg.order,
            send_time: msg.send_time,
            messenger_payload: generateJSON(msg)
          })),
          total_messages: messages.length
        })
      });

      if (!response.ok) throw new Error(`Webhook error: ${response.status}`);

      setBroadcastStatus("sent");
      toast({ title: "✅ Broadcast envoyé !", description: `${messages.length} messages en cours d'envoi.` });
    } catch (error) {
      console.error("Erreur envoi:", error);
      setBroadcastStatus("draft");
      toast({ title: "❌ Erreur", description: "Impossible d'envoyer le broadcast.", variant: "destructive" });
    } finally {
      setScheduling(false);
    }
  };

  // Annuler la programmation
  const cancelSchedule = async () => {
    try {
      await supabase
        .from('broadcasts')
        .update({ status: 'cancelled' })
        .like('name', `${broadcastName} - Message%`);

      if (n8nWebhookUrl) {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            broadcast_name: broadcastName
          })
        });
      }

      setBroadcastStatus("draft");
      toast({ title: "🛑 Annulé", description: "La programmation a été annulée." });
    } catch (error) {
      console.error("Erreur annulation:", error);
      toast({ title: "❌ Erreur", description: "Impossible d'annuler.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout pageName="Broadcasts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Broadcasts</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{loading ? "Chargement..." : `${messages.length} messages programmés`}</p>
              {broadcastStatus === "scheduled" && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Clock className="h-3 w-3 mr-1" />Programmé
                </Badge>
              )}
              {broadcastStatus === "scheduled" && getTimeRemaining() && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  🕐 {getTimeRemaining()}
                </Badge>
              )}
              {broadcastStatus === "sending" && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />Envoi en cours...
                </Badge>
              )}
              {broadcastStatus === "sent" && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />Envoyé
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/10" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={deleteAllFromSupabase}>
              <Trash2 className="h-4 w-4 mr-2" />Supprimer
            </Button>
            <Button variant="outline" className="border-white/10" onClick={saveAllToSupabase} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            {broadcastStatus === "scheduled" ? (
              <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={cancelSchedule}>
                <AlertCircle className="h-4 w-4 mr-2" />Annuler
              </Button>
            ) : (
              <>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white" onClick={sendNow} disabled={scheduling}>
                  {scheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Envoyer maintenant
                </Button>
                <Button className="bg-gradient-primary text-primary-foreground" onClick={scheduleBroadcast} disabled={scheduling}>
                  {scheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                  Programmer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard hover={false} className="border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Configuration n8n</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">URL du Webhook n8n</Label>
                <Input 
                  value={n8nWebhookUrl} 
                  onChange={(e) => setN8nWebhookUrl(e.target.value)} 
                  placeholder="https://votre-n8n.com/webhook/broadcast"
                  className="bg-white/5 border-white/10 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ce webhook sera appelé avec les données du broadcast. Actions: schedule, send_now, cancel
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Broadcast Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-4 glass rounded-xl">
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            <div>
              <p className="font-medium">Broadcast activé</p>
              <p className="text-sm text-muted-foreground">Campagne prête</p>
            </div>
          </div>
          <div className="p-4 glass rounded-xl">
            <Label className="text-xs text-muted-foreground">Nom de la campagne</Label>
            <Input value={broadcastName} onChange={(e) => setBroadcastName(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>
          <div className="p-4 glass rounded-xl">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Date programmée</Label>
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>
          <div className="p-4 glass rounded-xl">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Heure de début</Label>
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-7 gap-3">
          <GlassCard><div className="text-center"><p className="text-2xl font-bold gradient-text">{messages.length}</p><p className="text-xs text-muted-foreground mt-1">Messages</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-blue-400">{globalStats.totalSent}</p><p className="text-xs text-muted-foreground mt-1">Envoyés</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-green-400">{globalStats.totalDelivered}</p><p className="text-xs text-muted-foreground mt-1">Délivrés</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-purple-400">{globalStats.totalRead}</p><p className="text-xs text-muted-foreground mt-1">Lus</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-orange-400">{globalStats.totalClicks}</p><p className="text-xs text-muted-foreground mt-1">Clics</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-cyan-400">{globalStats.deliveryRate}%</p><p className="text-xs text-muted-foreground mt-1">Délivrance</p></div></GlassCard>
          <GlassCard><div className="text-center"><p className="text-2xl font-bold text-pink-400">{globalStats.readRate}%</p><p className="text-xs text-muted-foreground mt-1">Lecture</p></div></GlassCard>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Liste des messages */}
          <div className="lg:col-span-2">
            <GlassCard hover={false}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20"><Radio className="h-5 w-5 text-primary" /></div>
                <div><h3 className="font-display font-semibold">Messages du Broadcast</h3><p className="text-sm text-muted-foreground">{messages.length} messages espacés</p></div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {messages.map((msg, i) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${selectedMessage?.id === msg.id ? 'bg-primary/20 border border-primary/50' : 'bg-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">{msg.order}</div>
                        <div>
                          <p className="font-medium text-sm truncate max-w-[180px]">{msg.title.replace("{{ $json.Name_complet }}", "User")}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /><span>{msg.send_time}</span>
                            {msg.sent_count > 0 && <span className="flex items-center gap-0.5 text-blue-400"><Send className="h-2.5 w-2.5" />{msg.sent_count}</span>}
                            {msg.delivered_count > 0 && <span className="flex items-center gap-0.5 text-green-400"><CheckCheck className="h-2.5 w-2.5" />{msg.delivered_count}</span>}
                            {msg.read_count > 0 && <span className="flex items-center gap-0.5 text-purple-400"><Eye className="h-2.5 w-2.5" />{msg.read_count}</span>}
                            {msg.click_count > 0 && <span className="flex items-center gap-0.5 text-orange-400"><MousePointer className="h-2.5 w-2.5" />{msg.click_count}</span>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); copyJSON(msg); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Éditeur de message */}
          <div className="lg:col-span-3 space-y-4">
            {selectedMessage ? (
              <>
                <GlassCard hover={false}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Message #{selectedMessage.order}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary">{selectedMessage.send_time}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setJsonEditMode(!jsonEditMode)} className={jsonEditMode ? "bg-primary/20" : ""}>
                        <Code className="h-4 w-4 mr-1" />JSON
                      </Button>
                    </div>
                  </div>

                  {/* Stats du message */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Send className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-blue-400 font-medium">Envoyés</span>
                      </div>
                      <p className="text-xl font-bold text-blue-400">{selectedMessage.sent_count}</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCheck className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Délivrés</span>
                      </div>
                      <p className="text-xl font-bold text-green-400">{selectedMessage.delivered_count}</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-purple-400 font-medium">Lus</span>
                      </div>
                      <p className="text-xl font-bold text-purple-400">{selectedMessage.read_count}</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointer className="h-4 w-4 text-orange-400" />
                        <span className="text-xs text-orange-400 font-medium">Clics</span>
                      </div>
                      <p className="text-xl font-bold text-orange-400">{selectedMessage.click_count}</p>
                    </div>
                  </div>

                  {/* Formulaire d'édition */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label><Clock className="h-4 w-4 inline mr-1" />Heure d'envoi</Label>
                        <Input type="time" value={selectedMessage.send_time} onChange={(e) => updateMessage(selectedMessage.id, { send_time: e.target.value })} className="bg-white/5 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label><Image className="h-4 w-4 inline mr-1" />Image</Label>
                        <Input value={selectedMessage.image_url} onChange={(e) => updateMessage(selectedMessage.id, { image_url: e.target.value })} className="bg-white/5 border-white/10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Titre</Label>
                      <Input value={selectedMessage.title} onChange={(e) => updateMessage(selectedMessage.id, { title: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sous-titre</Label>
                      <Textarea value={selectedMessage.subtitle} onChange={(e) => updateMessage(selectedMessage.id, { subtitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Boutons ({selectedMessage.buttons.length}/3)</Label>
                        {selectedMessage.buttons.length < 3 && (
                          <Button variant="outline" size="sm" onClick={() => addButton(selectedMessage.id)} className="border-white/10">
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {selectedMessage.buttons.map((btn, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Bouton {i + 1}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeButton(selectedMessage.id, i)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input value={btn.title} onChange={(e) => updateButton(selectedMessage.id, i, "title", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="Texte" />
                          <Input value={btn.url} onChange={(e) => updateButton(selectedMessage.id, i, "url", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="URL" />
                        </div>
                      ))}
                    </div>
                    <Button className="w-full bg-gradient-primary text-primary-foreground mt-4" onClick={saveMessageToSupabase} disabled={saving}>
                      {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</> : <><Save className="h-4 w-4 mr-2" />Sauvegarder ce message</>}
                    </Button>
                  </div>
                </GlassCard>

                {/* Aperçu */}
                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-4"><Eye className="h-5 w-5 text-primary" /><h3 className="font-display font-semibold">Aperçu Messenger</h3></div>
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
                            <div key={i} className="flex items-center justify-center gap-2 py-2 text-[#0084ff] text-sm font-medium border-b border-gray-100 last:border-0">
                              {btn.title}<ExternalLink className="h-3 w-3" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* JSON Editor */}
                <GlassCard hover={false}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Code className="h-4 w-4 text-primary" />
                      JSON Messenger
                    </h3>
                    <div className="flex gap-2">
                      {jsonEditMode ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => { setJsonEditMode(false); setJsonError(null); }} className="border-white/10">Annuler</Button>
                          <Button size="sm" onClick={applyJsonChanges} className="bg-green-600 hover:bg-green-700">Appliquer</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setJsonEditMode(true)} className="border-white/10"><Edit className="h-3 w-3 mr-1" />Éditer</Button>
                          <Button variant="outline" size="sm" onClick={() => copyJSON(selectedMessage)} className="border-white/10"><Copy className="h-3 w-3 mr-1" />Copier</Button>
                        </>
                      )}
                    </div>
                  </div>
                  {jsonError && <p className="text-red-400 text-xs mb-2">{jsonError}</p>}
                  {jsonEditMode ? (
                    <Textarea 
                      value={jsonText} 
                      onChange={(e) => setJsonText(e.target.value)} 
                      className="font-mono text-xs bg-black/30 border-white/10 text-green-400 min-h-[200px]" 
                    />
                  ) : (
                    <pre className="bg-black/30 rounded-xl p-3 overflow-auto text-xs text-green-400 max-h-[200px]">
                      {JSON.stringify(generateJSON(selectedMessage), null, 2)}
                    </pre>
                  )}
                </GlassCard>
              </>
            ) : (
              <GlassCard hover={false} className="flex items-center justify-center h-[500px]">
                <div className="text-center text-muted-foreground">
                  <Radio className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Sélectionnez un message</p>
                  <p className="text-sm mt-1">Cliquez sur un message pour l'éditer</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
