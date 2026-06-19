import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Clock, Users, TrendingUp, Zap, FileText, Shield, Target, Rocket, Cog, CheckCircle } from "lucide-react";

const features = [
  {
    title: "Project Management",
    description:
      "Comprehensive project management tailored to individual law firms, providing visibility and intelligence into your unique client projects, tasks, and employee activities.",
    points: [
      { icon: Clock, text: "Automated project initiation and tracking" },
      { icon: Users, text: "Attorney availability tracking" },
      { icon: TrendingUp, text: "Project progress visualization" },
      { icon: Zap, text: "Integration with docketing and billing systems" },
    ],
  },
  {
    title: "Document Management",
    description:
      "Centralized document management with version control, automated organization, and seamless integration with your existing workflow.",
    points: [
      { icon: FileText, text: "Automated document categorization" },
      { icon: Shield, text: "Version control and audit trails" },
      { icon: Target, text: "Smart search and retrieval" },
      { icon: Zap, text: "Seamless collaboration tools" },
    ],
  },
  {
    title: "Patent Shells",
    description:
      "Pre-built patent application templates and shells that can be customized for different industries and invention types, accelerating drafting.",
    points: [
      { icon: Rocket, text: "Industry-specific templates" },
      { icon: Cog, text: "Customizable boilerplate language" },
      { icon: Clock, text: "Accelerated drafting process" },
      { icon: CheckCircle, text: "Compliance with USPTO requirements" },
    ],
  },
  {
    title: "Office Action Packages",
    description:
      "Comprehensive Office Action response automation that accepts USPTO PDF documents and generates sophisticated response templates tailored to your firm.",
    points: [
      { icon: FileText, text: "Automated PDF processing from USPTO" },
      { icon: Zap, text: "Sophisticated response template generation" },
      { icon: Cog, text: "Customizable templates for firm-specific needs" },
      { icon: Target, text: "Intelligent claim analysis and recommendations" },
    ],
  },
  {
    title: "USPTO Forms",
    description:
      "Automated USPTO form generation and management that ensures compliance and reduces manual errors in patent prosecution.",
    points: [
      { icon: FileText, text: "Automated form population" },
      { icon: CheckCircle, text: "USPTO compliance validation" },
      { icon: Clock, text: "Deadline tracking and reminders" },
      { icon: Shield, text: "Error detection and prevention" },
    ],
  },
];

const FeaturesSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className={`container mx-auto w-screen px-4 py-24 transition-all duration-700 ${
        isVisible ? "animate-fade-in-up" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-screen mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-6 text-sm px-3 py-1">Our Services</Badge>
          <h2 className="text-3xl font-bold mb-6 max-w-2xl mx-auto leading-tight">
            Comprehensive Patent Management Solutions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to streamline your patent workflow and increase productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {features.map((feature, idx) => (
            <Card key={feature.title} className="bg-surface border-border">
              <CardContent className="p-10 md:p-20">
                <div className={`grid md:grid-cols-2 gap-12 md:gap-24 items-center ${idx % 2 === 1 ? "md:[&>:first-child]:order-2" : ""}`}>
                  <div>
                    <h3 className="text-3xl md:text-5xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground mb-6">{feature.description}</p>
                    <div className="space-y-3 mb-6">
                      {feature.points.map((p) => (
                        <div key={p.text} className="flex items-center gap-3">
                          <p.icon className="w-5 h-5 text-foreground" />
                          <span className="text-sm">{p.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-4 border min-h-[200px] flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Live preview</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;