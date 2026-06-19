import { createFileRoute } from "@tanstack/react-router";
import Navigation from "@/components/landing/Navigation";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FAQSection from "@/components/landing/FAQSection";
import BlogSection from "@/components/landing/BlogSection";
import Footer from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fenix.AI — AI-Powered Patent Workflows" },
      { name: "description", content: "Turn hours of Office Action review, USPTO forms, and citations into clear results in minutes." },
      { property: "og:title", content: "Fenix.AI — AI-Powered Patent Workflows" },
      { property: "og:description", content: "Turn hours of Office Action review, USPTO forms, and citations into clear results in minutes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16">
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <FAQSection />
        <BlogSection />
        <Footer />
      </div>
    </div>
  );
}
