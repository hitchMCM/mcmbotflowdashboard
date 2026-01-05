import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail, Loader2, MessageCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Check user in database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .eq('is_active', true)
        .single();
      
      if (error || !user) {
        toast({
          title: "❌ Échec de connexion",
          description: "Email ou mot de passe incorrect.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Store user in localStorage
      localStorage.setItem('mcm_user', JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url
      }));

      toast({
        title: "✅ Connexion réussie",
        description: `Bienvenue ${user.full_name || user.email} !`,
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div 
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <MessageCircle className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-display font-bold gradient-text">MCM BotFlow</h1>
            <p className="text-muted-foreground mt-2">Connectez-vous à votre dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@mcm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-primary">Demo:</span> admin@mcm.com / admin123
            </p>
          </div>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 MCM BotFlow. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}
