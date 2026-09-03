import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  CreditCard,
  Users,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Client Management",
    desc: "Track planholders, beneficiaries, and contract details in one place.",
  },
  {
    icon: CreditCard,
    title: "Payment Collection",
    desc: "Record payments via cash, GCash, Maya, bank transfer, or check.",
  },
  {
    icon: FileText,
    title: "Auto Receipts",
    desc: "Official receipts generated instantly with every payment recorded.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "CEO, Manager, Finance Staff, and Cashier — each with appropriate access.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-terminal-green/10 flex items-center justify-center">
              <span className="text-terminal-green font-bold text-sm font-mono">
                EF
              </span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">Evangelist Funeral Services</span>
              <span className="text-[9px] text-muted-foreground ml-2 font-mono">
                v1.0
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2 font-mono text-xs"
            onClick={() => navigate("/auth")}
          >
            Sign In
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 border border-border rounded-full px-3 py-1 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-terminal-green animate-pulse" />
            <span className="text-[11px] text-muted-foreground font-mono">
              Pre-Need Deathcare Plan Management
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl">
            <span className="text-terminal-green font-mono">sudo</span>{" "}
            manage your deathcare plans
          </h1>

          <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed text-sm">
            A complete platform for tracking client contracts, recording
            payments, issuing receipts, and monitoring delinquency — built for
            teams who need clarity and control.
          </p>

          <div className="flex items-center gap-3 mt-8">
            <Button
              size="lg"
              className="gap-2 font-mono"
              onClick={() => navigate("/auth")}
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-terminal-green" />
              <span>Free for your team</span>
            </div>
          </div>

          {/* Terminal preview */}
          <div className="mt-12 border border-border rounded-lg overflow-hidden max-w-2xl">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-border">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono ml-2">
                evangelist-cli
              </span>
            </div>
            <div className="p-4 font-mono text-xs leading-relaxed bg-card">
              <p>
                <span className="text-terminal-green">$</span> evangelist clients
                --status current
              </p>
              <p className="text-muted-foreground mt-1">
                Found 248 active planholders
              </p>
              <p className="mt-3">
                <span className="text-terminal-green">$</span> evangelist payments
                --today --channel gcash
              </p>
              <p className="text-muted-foreground mt-1">
                12 payments recorded today · ₱47,200 collected
              </p>
              <p className="mt-3">
                <span className="text-terminal-green">$</span> evangelist receipts
                --latest
              </p>
              <p className="text-muted-foreground mt-1">
                RCP-20260822-0047 · ₱2,800 · Dela Cruz, Juan
              </p>
              <p className="mt-3">
                <span className="text-terminal-green">$</span>{" "}
                <span className="animate-pulse">█</span>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
              // capabilities
            </p>
            <h2 className="text-2xl font-bold tracking-tight mb-8">
              Everything your team needs
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-border/60 shadow-none h-full">
                    <CardContent className="p-6">
                      <div className="h-9 w-9 rounded-lg bg-terminal-green/10 flex items-center justify-center mb-3">
                        <feat.icon className="h-4.5 w-4.5 text-terminal-green" />
                      </div>
                      <h3 className="font-bold text-sm mb-1">{feat.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feat.desc}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
              // ready
            </p>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Start managing plans today
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
              Sign in to access your dashboard, record payments, and keep your
              team aligned.
            </p>
            <Button
              size="lg"
              className="gap-2 font-mono"
              onClick={() => navigate("/auth")}
            >
              Sign In to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-mono">
            Evangelist Funeral Services v1.0 · Pre-Need Deathcare Management
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Powered by{" "}
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              freebuff.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

