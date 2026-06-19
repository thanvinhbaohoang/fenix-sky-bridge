import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AnimatedSectionProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedSection = ({
  children,
  skeleton,
  className,
  delay = 800,
}: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollAnimation(0.1);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => setShowContent(true), delay);
      return () => clearTimeout(t);
    }
  }, [isVisible, delay]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
    >
      {showContent ? <div className="animate-fade-in">{children}</div> : skeleton}
    </div>
  );
};