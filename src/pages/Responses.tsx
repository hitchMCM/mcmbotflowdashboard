import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Plus, Image, ExternalLink, Copy, Eye, Save, Trash2, HelpCircle, Loader2, Check, Code, RefreshCw, Send, CheckCheck, MousePointer } from "lucide-react";
import { useState, useEffect } from "react";
import { useResponses, useMessageStats, useButtonClicks } from "@/hooks/useSupabase";
import { useToast } from "@/hooks/use-toast";

interface MessageButton {
  type: "web_url" | "postback";
  url: string;
  title: string;
}

interface TemplateElement {
  title: string;
  subtitle: string;
  image_url: string;
  buttons: MessageButton[];
}

export default function Responses() {
  const [messageType, setMessageType] = useState<"text" | "template">("template");
  const [responseName, setResponseName] = useState("Réponse Standard");
  const [textMessage, setTextMessage] = useState("Bonjour {{ $json.Name_complet }}! Merci pour votre message. Comment puis-je vous aider?");
  const [template, setTemplate] = useState<TemplateElement>({
    title: "{{ $json.Name_complet }}, Comment puis-je vous aider? 🤝",
    subtitle: "Choisissez une option ci-dessous pour obtenir une réponse rapide.",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [
      { type: "web_url", url: "https://example.com/faq", title: "❓ FAQ" },
      { type: "web_url", url: "https://example.com/contact", title: "📞 Contact" }
    ]
  });
  const [saving, setSaving] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const { responses, loading, saveResponse, deleteResponse, refetch } = useResponses();
  const currentResponseId = responses.length > 0 ? responses[0].id : undefined;
  const { stats, loading: statsLoading } = useMessageStats('response', currentResponseId);
  const { data: clicksData, loading: clicksLoading } = useButtonClicks('response', currentResponseId);
  const { toast } = useToast();

  // Charger les données de Supabase au démarrage
  useEffect(() => {
    if (responses.length > 0) {
      const savedResponse = responses[0]; // Prendre la première réponse
      setResponseName(savedResponse.name || "Réponse Standard");
      setMessageType((savedResponse.message_type as "text" | "template") ?? "template");
      if (savedResponse.text_content) {
        setTextMessage(savedResponse.text_content);
      }
      if (savedResponse.title || savedResponse.subtitle || savedResponse.image_url) {
        setTemplate({
          title: savedResponse.title || "",
          subtitle: savedResponse.subtitle || "",
          image_url: savedResponse.image_url || "",
          buttons: (savedResponse.buttons as MessageButton[]) || []
        });
      }
    }
  }, [responses]);

  const updateButton = (index: number, field: keyof MessageButton, value: string) => {
    const newButtons = [...template.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setTemplate({ ...template, buttons: newButtons });
  };

  const addButton = () => {
    if (template.buttons.length < 3) {
      setTemplate({ ...template, buttons: [...template.buttons, { type: "web_url", url: "", title: "New" }] });
    }
  };

  const removeButton = (index: number) => {
    setTemplate({ ...template, buttons: template.buttons.filter((_, i) => i !== index) });
  };

  const generateJSON = () => {
    if (messageType === "text") {
      return { recipient: { id: "{{ $json.ID }}" }, message: { text: textMessage } };
    }
    return {
      recipient: { id: "{{ $json.ID }}" },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [{ title: template.title, subtitle: template.subtitle, image_url: template.image_url, buttons: template.buttons }]
          }
        }
      }
    };
  };

  const copyJSON = () => navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, 2));

  // Synchroniser le JSON texte avec le formulaire
  useEffect(() => {
    if (!jsonEditMode) {
      setJsonText(JSON.stringify(generateJSON(), null, 2));
    }
  }, [messageType, textMessage, template, jsonEditMode]);

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      
      // Détecter si c'est un message texte ou template
      if (parsed.message?.text) {
        setMessageType("text");
        setTextMessage(parsed.message.text);
      } else if (parsed.message?.attachment?.payload?.elements?.[0]) {
        const element = parsed.message.attachment.payload.elements[0];
        setMessageType("template");
        setTemplate({
          title: element.title || "",
          subtitle: element.subtitle || "",
          image_url: element.image_url || "",
          buttons: element.buttons || []
        });
      }
      
      setJsonEditMode(false);
      toast({
        title: "✅ JSON appliqué !",
        description: "Le formulaire a été mis à jour avec votre JSON.",
      });
    } catch (err) {
      setJsonError("JSON invalide: " + (err instanceof Error ? err.message : "Erreur de syntaxe"));
    }
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const messengerPayload = generateJSON();
      
      await saveResponse({
        is_enabled: true,
        trigger_type: "keyword",
        trigger_keywords: ["aide", "help", "info"],
        message_type: messageType,
        text_content: messageType === "text" ? textMessage : null,
        title: messageType === "template" ? template.title : null,
        subtitle: messageType === "template" ? template.subtitle : null,
        image_url: messageType === "template" ? template.image_url : null,
        buttons: messageType === "template" ? template.buttons : [],
        messenger_payload: messengerPayload,
        times_triggered: 0
      }, responseName);
      
      toast({
        title: "✅ Sauvegardé !",
        description: "Votre réponse standard a été enregistrée dans Supabase.",
      });
      
      await refetch();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder la réponse.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteFromSupabase = async () => {
    if (responses.length === 0) return;
    try {
      await deleteResponse(responses[0].id);
      toast({
        title: "🗑️ Supprimé !",
        description: "La réponse a été supprimée. Les valeurs par défaut seront affichées.",
      });
      // Reset to defaults
      setResponseName("Réponse Standard");
      setTextMessage("Bonjour {{ $json.Name_complet }}! Merci pour votre message. Comment puis-je vous aider?");
      setTemplate({
        title: "{{ $json.Name_complet }}, Comment puis-je vous aider? 🤝",
        subtitle: "Choisissez une option ci-dessous pour obtenir une réponse rapide.",
        image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
        buttons: [
          { type: "web_url", url: "https://example.com/faq", title: "❓ FAQ" },
          { type: "web_url", url: "https://example.com/contact", title: "📞 Contact" }
        ]
      });
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer la réponse.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout pageName="Standard Responses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Réponses Standards</h1>
            <p className="text-muted-foreground">Message de réponse automatique</p>
          </div>
          <div className="flex gap-2">
            {responses.length > 0 && (
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={deleteFromSupabase}>
                <Trash2 className="h-4 w-4 mr-2" />Supprimer
              </Button>
            )}
            <Button variant="outline" className="border-white/10" onClick={copyJSON}><Copy className="h-4 w-4 mr-2" />Copier JSON</Button>
            <Button 
              className="bg-gradient-primary text-primary-foreground" 
              onClick={saveToSupabase}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Sauvegarder</>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <GlassCard><div className="text-center"><p className="text-3xl font-bold gradient-text">{loading ? "..." : responses.length}</p><p className="text-sm text-muted-foreground mt-1">Réponses</p></div></GlassCard>
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20"><Send className="h-4 w-4 text-blue-400" /></div>
              <div><p className="text-2xl font-bold text-blue-400">{statsLoading ? "..." : stats.sent_count}</p><p className="text-xs text-muted-foreground">Envoyés</p></div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20"><CheckCheck className="h-4 w-4 text-green-400" /></div>
              <div>
                <p className="text-2xl font-bold text-green-400">{statsLoading ? "..." : stats.delivered_count}</p>
                <p className="text-xs text-muted-foreground">Délivrés</p>
                {stats.sent_count > 0 && <p className="text-[10px] text-muted-foreground">{Math.round((stats.delivered_count / stats.sent_count) * 100)}%</p>}
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20"><Eye className="h-4 w-4 text-purple-400" /></div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{statsLoading ? "..." : stats.read_count}</p>
                <p className="text-xs text-muted-foreground">Lus</p>
                {stats.delivered_count > 0 && <p className="text-[10px] text-muted-foreground">{Math.round((stats.read_count / stats.delivered_count) * 100)}%</p>}
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20"><MousePointer className="h-4 w-4 text-orange-400" /></div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{clicksLoading ? "..." : clicksData.total_clicks}</p>
                <p className="text-xs text-muted-foreground">Cliqués</p>
                {stats.read_count > 0 && <p className="text-[10px] text-muted-foreground">{Math.round((clicksData.total_clicks / stats.read_count) * 100)}%</p>}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Détail des clics par bouton */}
        {currentResponseId && clicksData.total_clicks > 0 && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MousePointer className="h-5 w-5 text-orange-400" />
              <h3 className="font-semibold">Détail des clics par bouton</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {clicksData.buttons.map((btn, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                      {i + 1}
                    </div>
                    <p className="font-medium text-sm truncate max-w-[150px]">{btn.button_title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-400">{btn.click_count}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round((btn.click_count / clicksData.total_clicks) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard hover={false}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/20"><HelpCircle className="h-5 w-5 text-primary" /></div>
                <h3 className="font-display font-semibold">Éditeur de Réponse</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label>Nom de la réponse</Label>
                  <Input 
                    value={responseName} 
                    onChange={(e) => setResponseName(e.target.value)} 
                    className="bg-white/5 border-white/10" 
                    placeholder="Ex: Réponse de bienvenue, FAQ, etc." 
                  />
                </div>
              </div>

              <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "text" | "template")}>
                <TabsList className="bg-white/5 w-full">
                  <TabsTrigger value="text" className="flex-1">Message Texte</TabsTrigger>
                  <TabsTrigger value="template" className="flex-1">Template Riche</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Contenu du message</Label>
                    <Textarea value={textMessage} onChange={(e) => setTextMessage(e.target.value)} className="bg-white/5 border-white/10 min-h-[200px]" placeholder="Entrez votre message..." />
                    <p className="text-xs text-muted-foreground">Variables: {"{{ $json.Name_complet }}"}, {"{{ $json.ID }}"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="template" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label><Image className="h-4 w-4 inline mr-1" />URL de l'image</Label>
                    <Input value={template.image_url} onChange={(e) => setTemplate({ ...template, image_url: e.target.value })} className="bg-white/5 border-white/10" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input value={template.title} onChange={(e) => setTemplate({ ...template, title: e.target.value })} className="bg-white/5 border-white/10" />
                    <p className="text-xs text-muted-foreground">Variables: {"{{ $json.Name_complet }}"}, {"{{ $json.ID }}"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Textarea value={template.subtitle} onChange={(e) => setTemplate({ ...template, subtitle: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Boutons (max 3)</Label>
                      {template.buttons.length < 3 && <Button variant="outline" size="sm" onClick={addButton} className="border-white/10"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
                    </div>
                    {template.buttons.map((button, index) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Bouton {index + 1}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeButton(index)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                        <Input value={button.title} onChange={(e) => updateButton(index, "title", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="Texte du bouton" />
                        <Input value={button.url} onChange={(e) => updateButton(index, "url", e.target.value)} className="bg-white/5 border-white/10 h-8 text-sm" placeholder="https://..." />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4"><Eye className="h-5 w-5 text-primary" /><h3 className="font-display font-semibold">Aperçu Messenger</h3></div>
              <div className="bg-[#0084ff]/10 rounded-2xl p-4">
                {messageType === "text" ? (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0" />
                    <div className="bg-white/10 rounded-2xl rounded-tl-none p-4 max-w-[300px]">
                      <p className="text-sm whitespace-pre-wrap">{textMessage.replace("{{ $json.Name_complet }}", "John") || "Votre message ici..."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-none overflow-hidden max-w-[280px] shadow-lg">
                      {template.image_url && <img src={template.image_url} alt="" className="w-full h-32 object-cover" />}
                      <div className="p-3 bg-white text-black">
                        <h4 className="font-semibold text-sm">{template.title.replace("{{ $json.Name_complet }}", "John")}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.subtitle}</p>
                      </div>
                      <div className="border-t border-gray-200">
                        {template.buttons.map((btn, i) => (
                          <div key={i} className="flex items-center justify-center gap-2 py-2 text-[#0084ff] text-sm font-medium border-b border-gray-100 last:border-0">{btn.title}<ExternalLink className="h-3 w-3" /></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold text-sm">JSON {jsonEditMode ? "(Mode Édition)" : "Output"}</h3>
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
                      <Button variant="outline" size="sm" onClick={copyJSON} className="border-white/10"><Copy className="h-3 w-3 mr-1" />Copier</Button>
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
                  className="bg-black/30 border-white/10 font-mono text-xs text-green-400 min-h-[250px]"
                  spellCheck={false}
                />
              ) : (
                <pre className="bg-black/30 rounded-xl p-3 overflow-auto text-xs text-green-400 max-h-[200px]">{JSON.stringify(generateJSON(), null, 2)}</pre>
              )}
              <p className="text-xs text-muted-foreground mt-2">💡 Cliquez sur "Éditer" pour modifier le JSON directement, puis "Appliquer" pour synchroniser le formulaire.</p>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
