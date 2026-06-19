import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const teamMembers = [
  { name: "Mike Carrey", role: "CEO & Founder", initials: "MC" },
  { name: "Chase Wright", role: "Co-Founder", initials: "CW" },
  { name: "Jeff Woodworth", role: "CTO", initials: "JW" },
  { name: "Harold Than", role: "Software Engineer", initials: "HT" },
  { name: "Daniel Ha", role: "Software Engineer", initials: "DH" },
];

const Footer = () => {
  const navigate = useNavigate();
  return (
    <>
      <section className="py-20 bg-background border-t border-border">
        <div className="container flex justify-between mx-auto px-4 text-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-start text-foreground mb-6">
              Experience the power of
            </h2>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-start">
              <span className="text-foreground">AI Patent Management</span> today
            </h2>
          </div>
          <div className="flex flex-col gap-4 items-center justify-center">
            <Button
              size="lg"
              className="text-lg px-8 py-3 w-full text-center"
              onClick={() => navigate({ to: "/app" })}
            >
              ✨ Try Fenix.AI
            </Button>
            <p className="text-sm text-muted-foreground">
              Transform your patent workflow in under 5 minutes. Yes, really.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-start">
            <div className="flex flex-col mb-6 md:mb-0">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Fenix<span className="text-gray-600">.AI</span>
              </h3>
              <div className="text-sm text-muted-foreground">
                © 2025 Fenix.AI. All rights reserved.
              </div>
            </div>
            <TooltipProvider>
              <div className="flex items-center space-x-2">
                {teamMembers.map((member) => (
                  <Tooltip delayDuration={0} key={member.name}>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-105">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs font-medium">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;