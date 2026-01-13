import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";

export default function Blog() {
  const navigate = useNavigate();

  const posts = [
    {
      title: "10 Best Practices for Messenger Marketing Automation",
      excerpt: "Learn the proven strategies that top brands use to engage their audience through automated Messenger campaigns.",
      author: "Sarah Johnson",
      date: "Jan 10, 2026",
      category: "Marketing",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop"
    },
    {
      title: "How to Create Engaging Welcome Messages",
      excerpt: "First impressions matter. Discover how to craft welcome messages that convert new subscribers into loyal customers.",
      author: "Michael Chen",
      date: "Jan 8, 2026",
      category: "Tutorials",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop"
    },
    {
      title: "The Future of Conversational Marketing",
      excerpt: "Explore emerging trends in conversational marketing and how AI is transforming customer engagement.",
      author: "Emily Rodriguez",
      date: "Jan 5, 2026",
      category: "Trends",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop"
    },
    {
      title: "Case Study: 300% Increase in Customer Engagement",
      excerpt: "See how TechStart Inc. tripled their engagement rates using MCM BotFlow's automation features.",
      author: "David Kim",
      date: "Jan 3, 2026",
      category: "Case Studies",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop"
    },
    {
      title: "Building Effective Message Sequences",
      excerpt: "A step-by-step guide to creating message sequences that nurture leads and drive conversions.",
      author: "Sarah Johnson",
      date: "Dec 28, 2025",
      category: "Tutorials",
      image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=400&fit=crop"
    },
    {
      title: "GDPR Compliance for Messenger Marketing",
      excerpt: "Everything you need to know about staying compliant with data protection regulations in your Messenger campaigns.",
      author: "Legal Team",
      date: "Dec 25, 2025",
      category: "Compliance",
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop"
    }
  ];

  const categories = ["All", "Marketing", "Tutorials", "Trends", "Case Studies", "Compliance"];

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
              MCM BotFlow <span className="text-primary">Blog</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tips, tutorials, and insights to help you master Messenger marketing automation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                className={index === 0 ? "bg-primary" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <Badge className="w-fit mb-3">{post.category}</Badge>
                    <h3 className="text-xl font-semibold mb-3 line-clamp-2">{post.title}</h3>
                    <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-white/10">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Subscribe to Our Newsletter</h2>
          <p className="text-muted-foreground mb-8">
            Get the latest tips and insights delivered straight to your inbox every week.
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg bg-background border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button className="bg-primary hover:bg-primary/90">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
