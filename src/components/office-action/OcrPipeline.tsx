import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ScanText, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { fetchUsptoDocuments } from "@/lib/uspto.functions";

interface OcrPipelineProps {
  applicationNumber: string;
  onComplete?: (text: string) => void;
}

export function OcrPipeline({ applicationNumber, onComplete }: OcrPipelineProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [extractedText, setExtractedText] = useState("");

  const run = async () => {
    if (!applicationNumber) return;
    setIsRunning(true);
    setExtractedText("");
    setProgress(0);
    setCurrentPage(0);
    setTotalPages(0);
    setStatus("Fetching documents...");

    try {
      const docs = await fetchUsptoDocuments({
        data: { applicationNumber },
      });
      const documentBag = docs.documentBag || [];
      const target =
        documentBag.find(
          (d: any) =>
            d.documentCode === "CTNF" || d.documentCode === "CTFR",
        ) || documentBag.find((d: any) => d.downloadOptionBag?.[0]?.downloadUrl);

      if (!target) {
        toast({
          title: "No document found",
          description: "No Office Action document available for OCR.",
          variant: "destructive",
        });
        return;
      }

      const downloadUrl = target.downloadOptionBag?.[0]?.downloadUrl;
      if (!downloadUrl) throw new Error("Document missing download URL");

      setStatus("Downloading PDF...");
      const pdfRes = await fetch(
        `/api/uspto-download?url=${encodeURIComponent(downloadUrl)}`,
      );
      if (!pdfRes.ok) throw new Error(`Failed to download PDF (${pdfRes.status})`);
      const pdfBuffer = await pdfRes.arrayBuffer();

      setStatus("Loading PDF...");
      // Dynamic import — browser-only
      const pdfjs: any = await import("pdfjs-dist");
      const workerSrc = (
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
      ).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

      const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
      setTotalPages(pdf.numPages);

      const Tesseract: any = (await import("tesseract.js")).default;

      let fullText = `PDF Extraction Results\nApplication: ${applicationNumber}\nDocument: ${target.documentCodeDescriptionText}\nTotal Pages: ${pdf.numPages}\n\n--- EXTRACTED TEXT ---\n`;

      for (let p = 1; p <= pdf.numPages; p++) {
        setCurrentPage(p);
        setProgress(Math.round(((p - 1) / pdf.numPages) * 100));
        setStatus(`Processing page ${p} of ${pdf.numPages}...`);

        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const items = (content.items ?? [])
          .map((it: any) => ("str" in it ? it.str : ""))
          .filter(Boolean);
        let pageText = items.join(" ").replace(/[ \t]+/g, " ").trim();

        if (pageText.length < 10) {
          setStatus(`OCR on page ${p} of ${pdf.numPages}...`);
          const viewport = page.getViewport({ scale: 1.75 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const { data } = await Tesseract.recognize(canvas, "eng");
            const ocrText = data.text?.trim() || "";
            if (ocrText.length) pageText = ocrText;
          }
        }

        fullText += `\n--- PAGE ${p} ---\n${pageText}\n`;
      }

      setProgress(100);
      setExtractedText(fullText);
      onComplete?.(fullText);
      toast({
        title: "Analysis complete",
        description: `Extracted text from ${pdf.numPages} page(s).`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "OCR failed",
        description: e.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setStatus("");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanText className="w-5 h-5" />
          Office Action OCR Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download the latest Office Action PDF and extract its text. Pages with
          no embedded text fall back to OCR via Tesseract.
        </p>
        <Button onClick={run} disabled={isRunning || !applicationNumber}>
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {status || "Working..."}
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Run OCR Pipeline
            </>
          )}
        </Button>

        {isRunning && totalPages > 0 && (
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}

        {extractedText && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Extracted Text
            </div>
            <pre className="max-h-96 overflow-auto text-xs p-3 bg-muted rounded border whitespace-pre-wrap">
              {extractedText}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}