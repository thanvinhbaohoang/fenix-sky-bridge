import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-semibold text-foreground hover:cursor-pointer">
            FenixAI
          </Link>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/auth" className="text-sm font-medium text-foreground hover:text-gray-600 transition-colors">
            Sign in
          </Link>
        </div>
        <Button
          variant="default"
          size="sm"
          className="font-medium"
          onClick={() => navigate({ to: "/app/office-action-analyzer" })}
        >
          Launch →
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;