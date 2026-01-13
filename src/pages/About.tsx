import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Target, Heart, Award } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  const values = [
    {
      icon: Users,
      title: "Customer First",
      description: "We put our customers at the heart of everything we do, delivering exceptional value and support."
    },
    {
      icon: Target,
      title: "Innovation",
      description: "We continuously innovate to provide cutting-edge automation solutions that drive results."
    },
    {
      icon: Heart,
      title: "Integrity",
      description: "We operate with transparency and honesty, building trust with every interaction."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We strive for excellence in our products, services, and customer relationships."
    }
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
              About <span className="text-primary">MCM BotFlow</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're on a mission to revolutionize how businesses communicate with their customers through intelligent Messenger automation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              MCM BotFlow was founded in 2024 with a simple vision: make powerful Messenger marketing automation accessible to businesses of all sizes. We saw that while large enterprises had access to sophisticated automation tools, small and medium businesses were left behind.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Our team of developers, marketers, and customer success experts came together to build a platform that combines enterprise-grade features with simplicity and affordability. Today, thousands of businesses trust MCM BotFlow to automate their customer conversations and grow their audience.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We're just getting started. Our roadmap includes AI-powered personalization, multi-channel support, and advanced analytics that will help businesses create even more meaningful connections with their customers.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground text-lg">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Join Our Team</h2>
          <p className="text-muted-foreground text-lg mb-8">
            We're always looking for talented individuals who share our passion for innovation and customer success.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/careers')}
            className="bg-primary hover:bg-primary/90"
          >
            View Open Positions
          </Button>
        </div>
      </section>
    </div>
  );
}
