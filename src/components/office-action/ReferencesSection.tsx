import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";

interface Reference {
  raw: string;
  type: "publication" | "patent";
  number: string;
  kind?: string | null;
  odpId: string;
}

interface RejectionData {
  id: string;
  claims: string;
  structuredData: { references: Reference[] };
}

interface ReferencesSectionProps {
  parsedRejections?: RejectionData[];
}

export const ReferencesSection = ({ parsedRejections = [] }: ReferencesSectionProps) => {
  const uniqueReferences: (Reference & { claimsUsedAgainst: string })[] = [];
  const seen = new Set<string>();
  for (const rejection of parsedRejections) {
    for (const ref of rejection.structuredData?.references || []) {
      if (seen.has(ref.odpId)) continue;
      seen.add(ref.odpId);
      const claimsUsedAgainst = parsedRejections
        .filter((r) => r.structuredData?.references.some((x) => x.odpId === ref.odpId))
        .map((r) => r.claims)
        .join(", ");
      uniqueReferences.push({ ...ref, claimsUsedAgainst });
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Referenced Prior Art
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueReferences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No prior art references found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueReferences.map((ref, i) => (
              <div key={`${ref.odpId}-${i}`} className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={ref.type === "publication" ? "secondary" : "outline"}>
                      {ref.type === "publication" ? "Publication" : "Patent"}
                    </Badge>
                    {ref.kind && <Badge variant="outline" className="text-xs">{ref.kind}</Badge>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://image-ppubs.uspto.gov/dirsearch-public/searches?query=${encodeURIComponent(ref.odpId)}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <div className="font-medium text-lg font-mono text-primary">{ref.odpId}</div>
                <div className="text-sm mt-2">
                  <span className="font-medium text-muted-foreground">Used against claims: </span>
                  <span className="text-foreground">{ref.claimsUsedAgainst}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};