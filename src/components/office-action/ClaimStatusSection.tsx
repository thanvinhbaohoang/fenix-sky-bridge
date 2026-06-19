import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface RejectionData {
  id: string;
  claims: string;
  claimNumbers: string[];
  type: string;
  section: string;
  description: string;
  referenceCount: number;
  status: string;
}

interface ClaimStatusSectionProps {
  parsedRejections?: RejectionData[];
}

export const ClaimStatusSection = ({ parsedRejections = [] }: ClaimStatusSectionProps) => {
  const totalClaims = parsedRejections.reduce(
    (sum, r) => sum + r.claimNumbers.length,
    0,
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          Claim Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {parsedRejections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No rejections parsed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {parsedRejections.map((rejection) => (
              <div
                key={rejection.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <div className="font-medium text-foreground">
                      Claims {rejection.claims}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rejection.description}
                    </div>
                  </div>
                </div>
                <Badge variant="destructive">{rejection.section}</Badge>
              </div>
            ))}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-2">Summary</div>
              <div className="flex justify-between text-sm">
                <span>Total Rejections</span>
                <Badge variant="secondary">{parsedRejections.length}</Badge>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Claims Affected</span>
                <Badge variant="secondary">{totalClaims}</Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};