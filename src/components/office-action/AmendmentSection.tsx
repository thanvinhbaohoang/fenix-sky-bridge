import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Save, Undo } from "lucide-react";
import { useState } from "react";

const sampleRejections = [
  {
    id: "1",
    claimNumbers: "1-10",
    section: "35 U.S.C. § 103",
    reason: "Claims 1-10 are rejected as being unpatentable over Johnson in view of Smith.",
    originalText: "A method for data processing comprising: receiving data input; processing the data; and outputting results.",
    amendedText: "A method for data processing comprising: receiving data input; processing the data using machine learning optimization algorithms with adaptive parameter tuning; and outputting processed results with confidence scores.",
  },
  {
    id: "2",
    claimNumbers: "11-15",
    section: "35 U.S.C. § 112(b)",
    reason: "Claims 11-15 are rejected as being indefinite for failing to particularly point out and distinctly claim the subject matter.",
    originalText: "The system of claim 10, wherein the processing module operates efficiently.",
    amendedText: "The system of claim 10, wherein the processing module operates with a response time of less than 100 milliseconds for data inputs up to 1GB in size.",
  },
];

export const AmendmentSection = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amendments, setAmendments] = useState<Record<string, string>>({});

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5" /> Amendment Section
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {sampleRejections.map((rejection) => (
            <div key={rejection.id} className="border border-border rounded-lg p-6 bg-muted/30">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline">Claims {rejection.claimNumbers}</Badge>
                <Badge variant="destructive">{rejection.section}</Badge>
              </div>
              <div className="mb-6">
                <div className="text-sm font-medium text-muted-foreground mb-2">Rejection Reason</div>
                <div className="text-sm text-foreground p-3 bg-muted border border-border rounded">
                  {rejection.reason}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Original Claim Text</div>
                  <div className="text-sm p-3 bg-background border border-border rounded">
                    <span className="line-through text-muted-foreground">{rejection.originalText}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Amended Claim Text</div>
                  {editingId === rejection.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={amendments[rejection.id] ?? rejection.amendedText}
                        onChange={(e) =>
                          setAmendments((p) => ({ ...p, [rejection.id]: e.target.value }))
                        }
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditingId(null)}>
                          <Save className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          <Undo className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="text-sm p-3 bg-muted border border-border rounded">
                        {amendments[rejection.id] ?? rejection.amendedText}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setEditingId(rejection.id)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};