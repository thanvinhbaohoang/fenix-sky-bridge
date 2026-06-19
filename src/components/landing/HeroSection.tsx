import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZapIcon } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import TrustedCompanies from "./TrustedCompanies";

const HeroSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const navigate = useNavigate();

  return (
    <section
      ref={ref}
      className={`container mx-auto w-screen px-4 py-8 text-center transition-all duration-700 ${
        isVisible ? "animate-fade-in-up" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-screen mx-auto">
        <div className="relative rounded-3xl bg-surface border border-border p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, var(--muted-foreground) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            ></div>
          </div>
          <div className="relative z-10">
            <Badge className="mb-6 text-primary-foreground px-3 py-1 rounded-full inline-block">
              <ZapIcon className="inline-block mr-2 h-4 w-4" />
              AI-Powered Patent Workflows
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight tracking-tight">
              One Platform
              <br />
              <span className="text-muted-foreground">
                All Your Patent Tools Needs
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-12 mt-8 max-w-4xl mx-auto">
              Make AI your patent ally, not a replacement. Turn hours of Office Action review, forms, and citations into clear results — in just minutes.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                className="text-base px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg hover-scale"
                onClick={() => navigate({ to: "/app/office-action-analyzer" })}
              >
                Try the Demo
              </Button>
            </div>
          </div>
          <div className="mt-28">
            <TrustedCompanies />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;