import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface Transaction {
  eventCode?: string;
  eventDescriptionText?: string;
  eventDate?: string;
  recordedDate?: string;
}

export function TransactionsTimeline({ data }: { data: any }) {
  const bag: Transaction[] =
    data?.eventDataBag ||
    data?.patentFileWrapperDataBag?.[0]?.eventDataBag ||
    data?.transactionsBag ||
    [];

  const items = [...bag].sort((a, b) => {
    const da = new Date(a.eventDate || a.recordedDate || 0).getTime();
    const db = new Date(b.eventDate || b.recordedDate || 0).getTime();
    return db - da;
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Application Timeline
          <span className="text-sm text-muted-foreground font-normal">
            ({items.length} events)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions found.</p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-4">
            {items.map((t, i) => {
              const date = t.eventDate || t.recordedDate;
              return (
                <li key={i} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <time className="text-xs font-mono text-muted-foreground">
                      {date ? new Date(date).toLocaleDateString() : "—"}
                    </time>
                    {t.eventCode && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                        {t.eventCode}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    {t.eventDescriptionText || "—"}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}