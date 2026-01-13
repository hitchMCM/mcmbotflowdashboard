import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

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

      {/* Content */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">
              Terms of Service
            </h1>
            <p className="text-muted-foreground mb-8">Last updated: January 13, 2026</p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using MCM BotFlow, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  MCM BotFlow provides a Messenger marketing automation platform that enables users to create, manage, and send automated messages through Facebook Messenger. Our service includes features such as welcome messages, auto-replies, broadcasts, and analytics.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
                <h3 className="text-xl font-semibold mb-3">3.1 Account Security</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>You must notify us immediately of any unauthorized access</li>
                  <li>You are liable for all activities under your account</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Content Standards</h3>
                <p className="text-muted-foreground mb-3">You agree not to use our service to:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Send spam or unsolicited messages</li>
                  <li>Violate Facebook's Terms of Service or Messenger Platform Policies</li>
                  <li>Distribute malicious software or harmful content</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Engage in harassment, hate speech, or illegal activities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">4. Subscription and Billing</h2>
                <h3 className="text-xl font-semibold mb-3">4.1 Plans and Pricing</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We offer various subscription plans with different features and limits. Pricing is subject to change with 30 days' notice to existing subscribers.
                </p>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Payment Terms</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                  <li>All fees are non-refundable unless otherwise stated</li>
                  <li>Failed payments may result in service suspension</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Cancellation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing period. No refunds will be provided for partial months.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">5. Facebook Integration</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Our service integrates with Facebook Messenger. You acknowledge that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>You must comply with Facebook's Terms of Service and Platform Policies</li>
                  <li>Facebook may change or discontinue their API at any time</li>
                  <li>We are not responsible for changes to Facebook's platform that affect our service</li>
                  <li>You grant us permission to access your Facebook page data as necessary to provide our services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content, features, and functionality of MCM BotFlow are owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our software or content without permission.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  To the maximum extent permitted by law:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>We provide our service "as is" without warranties of any kind</li>
                  <li>We are not liable for indirect, incidental, or consequential damages</li>
                  <li>Our total liability shall not exceed the amount you paid in the past 12 months</li>
                  <li>We are not responsible for third-party services or Facebook's actions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">8. Data and Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your use of MCM BotFlow is also governed by our Privacy Policy. We collect, use, and protect your data as described in that policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">9. Service Modifications and Termination</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We reserve the right to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Modify or discontinue any part of our service</li>
                  <li>Suspend or terminate accounts that violate these terms</li>
                  <li>Update these Terms of Service with notice to users</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">10. Dispute Resolution</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Any disputes arising from these terms will be resolved through binding arbitration, except where prohibited by law. You waive the right to participate in class actions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">11. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These terms are governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms of Service, contact us at:
                </p>
                <p className="text-muted-foreground mt-4">
                  Email: legal@mcmbotflow.com<br />
                  Address: MCM BotFlow, Legal Department
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
