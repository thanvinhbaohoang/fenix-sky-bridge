import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Calendar, User, Building, FileText, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface GeneralSectionProps {
  apiData?: any;
}

const NotAvailable = () => (
  <div className="flex items-center gap-1 text-muted-foreground">
    <Minus className="w-3 h-3" />
    <span className="text-sm">Not Available</span>
  </div>
);

export const GeneralSection = ({ apiData }: GeneralSectionProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const { toast } = useToast();

  const extractApiData = () => {
    if (!apiData?.patentFileWrapperDataBag?.[0]?.applicationMetaData) return null;
    const meta = apiData.patentFileWrapperDataBag[0].applicationMetaData;
    return {
      applicationNumberText: apiData.patentFileWrapperDataBag[0].applicationNumberText,
      applicationTypeLabelName: meta.applicationTypeLabelName,
      inventionTitle: meta.inventionTitle,
      confirmationNumber: meta.applicationConfirmationNumber,
      customerNumber: meta.customerNumber,
      examinerNameText: meta.examinerNameText,
      groupArtUnitNumber: meta.groupArtUnitNumber,
      docketNumber: meta.docketNumber,
      applicationStatusDate: meta.applicationStatusDate,
      applicationStatusDescriptionText: meta.applicationStatusDescriptionText,
      filingDate: meta.filingDate,
      firstApplicantName: meta.firstApplicantName,
      firstInventorName: meta.firstInventorName,
    };
  };

  const data = extractApiData();

  const fetchDocuments = async () => {
    if (!data?.applicationNumberText) return;
    setDocumentsLoading(true);
    try {
      const res = await fetch(
        `https://corsproxy.io/?url=https://obwb.fenix.ai/api/odp/applications/${data.applicationNumberText}/documents`,
      );
      const json = await res.json();
      setDocuments(json.documentBag || []);
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.applicationNumberText]);

  const formatDate = (s?: string) => {
    if (!s) return null;
    try {
      return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return s;
    }
  };

  const getDocumentCodeBadge = (code: string) => {
    switch (code) {
      case "CTNF":
      case "CTFR":
        return <Badge variant="destructive" className="text-xs">{code}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{code}</Badge>;
    }
  };

  const responseDueInfo = (() => {
    const rejections = documents.filter(
      (d) => d.documentCode === "CTNF" || d.documentCode === "CTFR",
    );
    if (rejections.length === 0) return null;
    const latest = rejections.reduce((a, b) =>
      new Date(b.officialDate) > new Date(a.officialDate) ? b : a,
    );
    const due = new Date(latest.officialDate);
    due.setDate(due.getDate() + 90);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    return {
      formattedDate: due.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      daysRemaining: days,
    };
  })();

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          General Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="border-b border-border pb-4">
            <div className="text-sm text-muted-foreground mb-2">
              Application #{data?.applicationNumberText || "N/A"} | {data?.applicationTypeLabelName || "N/A"}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {data?.inventionTitle || "Untitled"}
            </h3>
            <div className="text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                {data?.applicationStatusDescriptionText}
              </span>
              {data?.applicationStatusDate && (
                <span> ({formatDate(data.applicationStatusDate)})</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Building className="w-4 h-4" /> Application Details
              </div>
              {[
                ["Applicant", data?.firstApplicantName],
                ["Attorney Docket Number", data?.docketNumber],
                ["Confirmation Number", data?.confirmationNumber],
                ["Customer Number", data?.customerNumber],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-medium text-foreground">{value || <NotAvailable />}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <User className="w-4 h-4" /> Examiner Information
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Examiner</div>
                <div className="text-sm font-medium text-foreground">{data?.examinerNameText || <NotAvailable />}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Art Unit</div>
                <div className="text-sm font-medium text-foreground">{data?.groupArtUnitNumber || <NotAvailable />}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Calendar className="w-4 h-4" /> Important Dates
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Filing Date</div>
                <div className="text-sm font-medium text-foreground">
                  {data?.filingDate ? formatDate(data.filingDate) : <NotAvailable />}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Response Due</div>
                <div className="text-sm font-medium text-foreground">
                  {responseDueInfo ? responseDueInfo.formattedDate : <NotAvailable />}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4" /> Documents Retrieved
              </div>
              {documents.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllDocuments(!showAllDocuments)}
                >
                  {showAllDocuments ? "Show Less" : `See All (${documents.length})`}
                </Button>
              )}
            </div>
            {documentsLoading ? (
              <div className="text-sm text-muted-foreground">Loading documents...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(showAllDocuments ? documents : documents.slice(0, 2)).map((doc, i) => (
                  <div
                    key={doc.documentIdentifier || i}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border hover:bg-muted/80 cursor-pointer transition-all"
                    onClick={() => {
                      const url = doc.downloadOptionBag?.[0]?.downloadUrl;
                      if (!url) return;
                      toast({ title: "Download starting", description: doc.documentCodeDescriptionText });
                      window.open(
                        `https://obwb.fenix.ai/api/odp/download?url=${encodeURIComponent(url)}`,
                        "_blank",
                      );
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {doc.documentCodeDescriptionText}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.directionCategory} •{" "}
                          {doc.officialDate ? new Date(doc.officialDate).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                    </div>
                    {doc.documentCode && getDocumentCodeBadge(doc.documentCode)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};