import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";
import { MessageCircle, Save, Eye, Plus, Trash2, Image, Link, ExternalLink, Copy, Loader2, Code, RefreshCw, Send, CheckCheck, MousePointer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWelcomeMessage, useMessageStats, useButtonClicks } from "@/hooks/useSupabase";
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

export default function Welcome() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [messageType, setMessageType] = useState<"text" | "template">("template");
  const [saving, setSaving] = useState(false);
  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const { welcomeMessage, loading, saveWelcomeMessage, deleteWelcomeMessage, refetch } = useWelcomeMessage();
  const { stats, loading: statsLoading } = useMessageStats('welcome', welcomeMessage?.id);
  const { data: clicksData, loading: clicksLoading } = useButtonClicks('welcome', welcomeMessage?.id);
  const { toast } = useToast();
  
  // Text message state
  const [textMessage, setTextMessage] = useState(
    "👋 Bienvenue sur notre page !\n\nNous sommes ravis de vous accueillir."
  );

  // Template message state
  const [templateElement, setTemplateElement] = useState<TemplateElement>({
    title: "{{ $json.Name_complet }}, your opportunity starts now!",
    subtitle: "High-demand jobs abroad are waiting for you 🌍\n🔥 Fast hiring • Real companies • Legal visas",
    image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
    buttons: [
      {
        type: "web_url",
        url: "https://allwork.intoput.com/canada/",
        title: "🇨🇦 See Canada Jobs Now"
      },
      {
        type: "web_url",
        url: "https://allwork.intoput.com/canada-jobs-with-visa-sponsorship/",
        title: "🎫 Check Visa-Approved Jobs"
      },
      {
        type: "web_url",
        url: "https://allwork.intoput.com/top-u-s-visa-sponsorship-jobs-for-foreigners/",
        title: "🇺🇸 Apply for U.S. Jobs"
      }
    ]
  });

  // Charger les données de Supabase au démarrage
  useEffect(() => {
    if (welcomeMessage) {
      setIsEnabled(welcomeMessage.is_enabled ?? true);
      setMessageType((welcomeMessage.message_type as "text" | "template") ?? "template");
      if (welcomeMessage.text_content) {
        setTextMessage(welcomeMessage.text_content);
      }
      if (welcomeMessage.title || welcomeMessage.subtitle || welcomeMessage.image_url) {
        setTemplateElement({
          title: welcomeMessage.title || "",
          subtitle: welcomeMessage.subtitle || "",
          image_url: welcomeMessage.image_url || "",
          buttons: (welcomeMessage.buttons as MessageButton[]) || []
        });
      }
    }
  }, [welcomeMessage]);

  const updateButton = (index: number, field: keyof MessageButton, value: string) => {
    const newButtons = [...templateElement.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setTemplateElement({ ...templateElement, buttons: newButtons });
  };

  const addButton = () => {
    if (templateElement.buttons.length < 3) {
      setTemplateElement({
        ...templateElement,
        buttons: [
          ...templateElement.buttons,
          { type: "web_url", url: "", title: "New Button" }
        ]
      });
    }
  };

  const removeButton = (index: number) => {
    const newButtons = templateElement.buttons.filter((_, i) => i !== index);
    setTemplateElement({ ...templateElement, buttons: newButtons });
  };

  const generateJSON = () => {
    if (messageType === "text") {
      return {
        recipient: { id: "{{ $json.ID }}" },
        message: { text: textMessage }
      };
    }
    return {
      recipient: { id: "{{ $json.ID }}" },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [templateElement]
          }
        }
      }
    };
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, 2));
  };

  // Synchroniser le JSON texte avec le formulaire
  useEffect(() => {
    if (!jsonEditMode) {
      setJsonText(JSON.stringify(generateJSON(), null, 2));
    }
  }, [messageType, textMessage, templateElement, jsonEditMode]);

  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      
      if (parsed.message?.text) {
        setMessageType("text");
        setTextMessage(parsed.message.text);
      } else if (parsed.message?.attachment?.payload?.elements?.[0]) {
        const element = parsed.message.attachment.payload.elements[0];
        setMessageType("template");
        setTemplateElement({
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
      
      await saveWelcomeMessage({
        is_enabled: isEnabled,
        message_type: messageType,
        text_content: messageType === "text" ? textMessage : null,
        title: messageType === "template" ? templateElement.title : null,
        subtitle: messageType === "template" ? templateElement.subtitle : null,
        image_url: messageType === "template" ? templateElement.image_url : null,
        buttons: messageType === "template" ? templateElement.buttons : [],
        messenger_payload: messengerPayload
      });
      
      toast({
        title: "✅ Sauvegardé !",
        description: "Votre message de bienvenue a été enregistré dans Supabase.",
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

  const deleteFromSupabase = async () => {
    if (!welcomeMessage) return;
    try {
      await deleteWelcomeMessage();
      toast({
        title: "🗑️ Supprimé !",
        description: "Le message a été supprimé. Les valeurs par défaut seront affichées.",
      });
      // Reset to defaults
      setTextMessage("👋 Bienvenue sur notre page !\n\nNous sommes ravis de vous accueillir.");
      setTemplateElement({
        title: "{{ $json.Name_complet }}, your opportunity starts now!",
        subtitle: "High-demand jobs abroad are waiting for you 🌍\n🔥 Fast hiring • Real companies • Legal visas",
        image_url: "https://i.postimg.cc/X7p2SyFz/Depositphotos-10731593-s-2019.jpg",
        buttons: [
          { type: "web_url", url: "https://allwork.intoput.com/canada/", title: "🇨🇦 See Canada Jobs Now" },
          { type: "web_url", url: "https://allwork.intoput.com/canada-jobs-with-visa-sponsorship/", title: "🎫 Check Visa-Approved Jobs" },
          { type: "web_url", url: "https://allwork.intoput.com/top-u-s-visa-sponsorship-jobs-for-foreigners/", title: "🇺🇸 Apply for U.S. Jobs" }
        ]
      });
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le message.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout pageName="Welcome Message">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Message de Bienvenue</h1>
            <p className="text-muted-foreground">Créez des messages riches pour Facebook Messenger</p>
          </div>
          <div className="flex gap-2">
            {welcomeMessage && (
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={deleteFromSupabase}>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button variant="outline" className="border-white/10" onClick={copyJSON}>
              <Copy className="h-4 w-4 mr-2" />
              Copier JSON
            </Button>
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

        <div className="flex items-center gap-4 p-4 glass rounded-xl">
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          <div>
            <p className="font-medium">Message de bienvenue activé</p>
            <p className="text-sm text-muted-foreground">Envoyé automatiquement aux nouveaux abonnés</p>
          </div>
        </div>

        {/* Statistiques d'envoi et réponses */}
        {welcomeMessage && (
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Send className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{statsLoading ? "..." : stats.sent_count}</p>
                  <p className="text-xs text-muted-foreground">Envoyés</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCheck className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{statsLoading ? "..." : stats.delivered_count}</p>
                  <p className="text-xs text-muted-foreground">Délivrés</p>
                  {stats.sent_count > 0 && (
                    <p className="text-[10px] text-muted-foreground">{Math.round((stats.delivered_count / stats.sent_count) * 100)}%</p>
                  )}
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Eye className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{statsLoading ? "..." : stats.read_count}</p>
                  <p className="text-xs text-muted-foreground">Lus</p>
                  {stats.delivered_count > 0 && (
                    <p className="text-[10px] text-muted-foreground">{Math.round((stats.read_count / stats.delivered_count) * 100)}%</p>
                  )}
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <MousePointer className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{clicksLoading ? "..." : clicksData.total_clicks}</p>
                  <p className="text-xs text-muted-foreground">Cliqués</p>
                  {stats.read_count > 0 && (
                    <p className="text-[10px] text-muted-foreground">{Math.round((clicksData.total_clicks / stats.read_count) * 100)}%</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Détail des clics par bouton */}
        {welcomeMessage && clicksData.total_clicks > 0 && (
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
          {/* Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <GlassCard hover={false}>
              <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "text" | "template")}>
                <TabsList className="bg-white/5 w-full">
                  <TabsTrigger value="text" className="flex-1">Message Texte</TabsTrigger>
                  <TabsTrigger value="template" className="flex-1">Template Riche</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Contenu du message</Label>
                    <Textarea
                      value={textMessage}
                      onChange={(e) => setTextMessage(e.target.value)}
                      className="bg-white/5 border-white/10 min-h-[200px]"
                      placeholder="Entrez votre message..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="template" className="mt-6 space-y-6">
                  {/* Image URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      URL de l'image
                    </Label>
                    <Input
                      value={templateElement.image_url}
                      onChange={(e) => setTemplateElement({ ...templateElement, image_url: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="https://exemple.com/image.jpg"
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={templateElement.title}
                      onChange={(e) => setTemplateElement({ ...templateElement, title: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="Titre du message"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{{ $json.Name_complet }}"}, {"{{ $json.ID }}"}
                    </p>
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Textarea
                      value={templateElement.subtitle}
                      onChange={(e) => setTemplateElement({ ...templateElement, subtitle: e.target.value })}
                      className="bg-white/5 border-white/10 min-h-[80px]"
                      placeholder="Description du message"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Boutons (max 3)</Label>
                      {templateElement.buttons.length < 3 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addButton}
                          className="border-white/10"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      )}
                    </div>

                    {templateElement.buttons.map((button, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white/5 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Bouton {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeButton(index)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Texte du bouton</Label>
                          <Input
                            value={button.title}
                            onChange={(e) => updateButton(index, "title", e.target.value)}
                            className="bg-white/5 border-white/10"
                            placeholder="🔗 Mon bouton"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            URL
                          </Label>
                          <Input
                            value={button.url}
                            onChange={(e) => updateButton(index, "url", e.target.value)}
                            className="bg-white/5 border-white/10"
                            placeholder="https://..."
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </GlassCard>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-6">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold">Aperçu Messenger</h3>
              </div>

              {/* Messenger Preview */}
              <div className="bg-[#0084ff]/10 rounded-2xl p-4">
                {messageType === "text" ? (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0" />
                    <div className="bg-white/10 rounded-2xl rounded-tl-none p-4 max-w-[300px]">
                      <p className="text-sm whitespace-pre-wrap">{textMessage}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex-shrink-0" />
                    <div className="bg-white rounded-2xl rounded-tl-none overflow-hidden max-w-[300px] shadow-lg">
                      {/* Image */}
                      {templateElement.image_url && (
                        <div className="aspect-video bg-gray-200 relative">
                          <img
                            src={templateElement.image_url}
                            alt="Template"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x200?text=Image";
                            }}
                          />
                        </div>
                      )}
                      {/* Content */}
                      <div className="p-3 bg-white text-black">
                        <h4 className="font-semibold text-sm leading-tight">
                          {templateElement.title.replace("{{ $json.Name_complet }}", "John Doe")}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                          {templateElement.subtitle}
                        </p>
                      </div>
                      {/* Buttons */}
                      <div className="border-t border-gray-200">
                        {templateElement.buttons.map((button, index) => (
                          <a
                            key={index}
                            href={button.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-3 text-[#0084ff] text-sm font-medium hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            {button.title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* JSON Output */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">JSON {jsonEditMode ? "(Mode Édition)" : "Output"}</h3>
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
                <pre className="bg-black/30 rounded-xl p-4 overflow-x-auto text-xs text-green-400 max-h-[300px] overflow-y-auto">
                  {JSON.stringify(generateJSON(), null, 2)}
                </pre>
              )}
              <p className="text-xs text-muted-foreground mt-2">💡 Cliquez sur "Éditer" pour modifier le JSON directement, puis "Appliquer" pour synchroniser le formulaire.</p>
            </GlassCard>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">1,250</p>
                  <p className="text-xs text-muted-foreground mt-1">Messages envoyés</p>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">98.5%</p>
                  <p className="text-xs text-muted-foreground mt-1">Taux de livraison</p>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
