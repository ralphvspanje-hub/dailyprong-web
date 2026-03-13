import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen">
      <div className="container max-w-2xl py-12 px-4 space-y-12">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <article className="space-y-8">
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
            What is a Prong?
          </h1>

          <div className="space-y-6 text-foreground/90 leading-[1.9] font-serif text-lg">
            <p>
              Most career advice still talks about T-shaped people — deep in one domain, broad across others. Marc Andreessen and others argued that T-shaped was the model for a more stable era.
            </p>

            <p>
              Today, jobs merge. Domains collapse into each other. The engineer needs product sense. The product manager needs to understand systems. The leader needs to think like a technologist.
            </p>

            <p>
              The new shape isn't T. It's E. Or F. Or a fork — multiple deep tines growing from a shared foundation.
            </p>

            <p className="text-2xl font-semibold text-foreground">
              A Prong.
            </p>

            <p>
              DailyProng is built on that idea. Not one deep skill. Not shallow breadth. A deliberate set of growing tines — each one strategic, each one connected, each one built through focused daily practice.
            </p>

            <p>
              One section per session. One cycle at a time. Compounding over months into something that actually changes what you can do.
            </p>

            <p>
              You don't need to know everything. You need to know the right things — deeply — and keep adding tines.
            </p>
          </div>

          <div className="space-y-4 font-serif text-lg leading-[1.9]">
            <h2 className="text-2xl font-bold text-foreground">
              Don't be T-shaped. Be a prong.
            </h2>
            <p className="text-foreground/80">
              The T-shape is the past; multiple is the future. Broaden your horizons, but dig deep into two or three distinct fields. It's where these areas overlap that your greatest ambition becomes reality.
            </p>
            <p className="italic text-foreground/80">Sharpen your prongs.</p>
          </div>
        </article>

        <footer className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">Built by Ralph van Spanje</p>
        </footer>
      </div>
    </div>
  );
};

export default About;