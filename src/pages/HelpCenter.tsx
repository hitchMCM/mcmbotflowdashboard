import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, BookOpen, MessageCircle, Settings, BarChart3, Send, Users } from "lucide-react";

export default function HelpCenter() {
  const navigate = useNavigate();

  const categories = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of MCM BotFlow",
      articles: 12
    },
    {
      icon: MessageCircle,
      title: "Messages & Automation",
      description: "Create and manage automated messages",
      articles: 18
    },
    {
      icon: Users,
      title: "Subscriber Management",
      description: "Track and segment your audience",
      articles: 8
    },
    {
      icon: Send,
      title: "Broadcasts & Sequences",
      description: "Send targeted campaigns",
      articles: 15
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Understand your performance",
      articles: 10
    },
    {
      icon: Settings,
      title: "Account & Settings",
      description: "Manage your account preferences",
      articles: 6
    }
  ];

  const popularArticles = [
    "How to connect your Facebook page",
    "Creating your first welcome message",
    "Understanding message delivery rates",
    "Setting up automated sequences",
    "Best practices for broadcasts",
    "Troubleshooting connection issues",
    "How to segment subscribers",
    "Reading analytics dashboard"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
              How can we <span className="text-primary">help you?</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Search our knowledge base or browse categories below
            </p>
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for articles..."
                className="pl-12 py-6 text-lg bg-background border-white/20"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                  <p className="text-sm text-primary">{category.articles} articles</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Articles</h2>
          <div className="space-y-4">
            {popularArticles.map((article, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="text-lg">{article}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <MessageCircle className="mr-2 h-5 w-5" />
              Contact Support
            </Button>
            <Button size="lg" variant="outline">
              <Send className="mr-2 h-5 w-5" />
              Submit a Ticket
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
