import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeneralSection } from "@/components/office-action/GeneralSection";
import { ClaimStatusSection } from "@/components/office-action/ClaimStatusSection";
import { ReferencesSection } from "@/components/office-action/ReferencesSection";
import { AmendmentSection } from "@/components/office-action/AmendmentSection";

interface Project {
  id: string;
  title: string;
  application_number: string;
  status: string;
  api_data: any;
  parsed_rejections: any;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export const Route = createFileRoute("/app/project/$id")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        toast({ title: "Error loading project", description: error.message, variant: "destructive" });
        navigate({ to: "/app" });
        return;
      }
      setProject(data as Project);
      setLoading(false);
    })();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!project) return null;

  const rejections = Array.isArray(project.parsed_rejections) ? project.parsed_rejections : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Application: {project.application_number}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Created: {new Date(project.created_at).toLocaleDateString()}
            </div>
            <Badge variant={project.status === "completed" ? "default" : "secondary"}>
              {project.status}
            </Badge>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        {project.api_data && <GeneralSection apiData={project.api_data} />}
        {rejections.length > 0 && (
          <>
            <ClaimStatusSection parsedRejections={rejections} />
            <ReferencesSection parsedRejections={rejections} />
            <AmendmentSection />
          </>
        )}
      </div>
    </div>
  );
}