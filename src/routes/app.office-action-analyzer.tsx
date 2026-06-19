import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GeneralSection } from "@/components/office-action/GeneralSection";
import { GeneralSectionSkeleton } from "@/components/ui/section-skeleton";
import { fetchUsptoApplication } from "@/lib/uspto.functions";
import { OcrPipeline } from "@/components/office-action/OcrPipeline";
import { ClientOnly } from "@tanstack/react-router";

const searchSchema = z.object({
  applicationNumber: z.string().optional(),
});

export const Route = createFileRoute("/app/office-action-analyzer")({
  validateSearch: searchSchema,
  component: OfficeActionAnalyzer,
});

function OfficeActionAnalyzer() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/office-action-analyzer" });
  const { toast } = useToast();
  const [applicationNumber, setApplicationNumber] = useState(search.applicationNumber ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiData, setApiData] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<any>(null);

  const runAnalysis = async (raw: string) => {
    const filtered = raw.replace(/\D/g, "");
    if (!filtered) return;
    setIsAnalyzing(true);
    try {
      const data = await fetchUsptoApplication({
        data: { applicationNumber: filtered },
      });
      setApiData(data);
      toast({ title: "Analysis Complete", description: "General information has been extracted." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-trigger from search param on mount
  useEffect(() => {
    if (search.applicationNumber && !apiData) {
      runAnalysis(search.applicationNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save handler — wires the "Save Project" header button
  useEffect(() => {
    const onSave = async () => {
      if (!apiData) {
        toast({ title: "Nothing to save", description: "Analyze an application first.", variant: "destructive" });
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: "Sign in required", description: "Please sign in to save.", variant: "destructive" });
        navigate({ to: "/auth" });
        return;
      }
      const payload = {
        user_id: userData.user.id,
        title:
          apiData?.patentFileWrapperDataBag?.[0]?.applicationMetaData?.inventionTitle ||
          `Application ${applicationNumber}`,
        application_number: applicationNumber,
        status: "general_complete",
        api_data: apiData,
        parsed_rejections: [],
        extracted_text: "",
      };

      if (currentProject?.id) {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", currentProject.id)
          .select()
          .single();
        if (error) {
          toast({ title: "Save failed", description: error.message, variant: "destructive" });
          return;
        }
        setCurrentProject(data);
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert([payload])
          .select()
          .single();
        if (error) {
          toast({ title: "Save failed", description: error.message, variant: "destructive" });
          return;
        }
        setCurrentProject(data);
        toast({ title: "Project saved" });
        navigate({ to: "/app/project/$id", params: { id: data.id } });
      }
    };
    window.addEventListener("saveProject", onSave);
    return () => window.removeEventListener("saveProject", onSave);
  }, [apiData, applicationNumber, currentProject, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Office Action Analyzer
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Experience how Fenix.AI transforms patent office action responses from hours of manual work into minutes of intelligent automation.
            </p>
          </div>

          <Card className="border-border mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="application-number" className="block text-sm font-medium text-foreground mb-2">
                    Application Number
                  </label>
                  <input
                    id="application-number"
                    type="text"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value)}
                    placeholder="Enter application number (e.g., 17/758,325)"
                    className="w-full px-3 py-2 border border-input-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => runAnalysis(applicationNumber)} disabled={isAnalyzing || !applicationNumber.trim()}>
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : "Analyze Office Action"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setApplicationNumber("17/758,325")}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Use test application (17/758,325)
                </button>
              </div>
            </CardContent>
          </Card>

          {isAnalyzing && (
            <div className="mb-8 animate-fade-in">
              <GeneralSectionSkeleton />
            </div>
          )}

          {apiData && (
            <div className="mb-8 animate-fade-in">
              <GeneralSection apiData={apiData} />
            </div>
          )}

          {apiData && (
            <Card className="border-border mb-8 animate-fade-in border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Office Action Detected
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      We've detected an active <span className="font-medium text-foreground">Non-Final Office Action</span> for this application. Save this project to keep the analysis, then continue to full rejection review.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button onClick={() => window.dispatchEvent(new CustomEvent("saveProject"))}>
                        <FileText className="w-4 h-4 mr-2" /> Save & Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {apiData && (
            <div className="mb-8 animate-fade-in">
              <ClientOnly fallback={null}>
                <OcrPipeline
                  applicationNumber={
                    apiData?.patentFileWrapperDataBag?.[0]?.applicationNumberText ||
                    applicationNumber
                  }
                />
              </ClientOnly>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}