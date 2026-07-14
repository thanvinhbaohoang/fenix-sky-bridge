import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Workspace } from "@/components/demo/Workspace";
import { SaveProjectNudge } from "@/components/SaveProjectNudge";
import {
  detectEvent,
  DOCKETABLE,
  SUPERSEDED_BY,
  TRANSACTION_DESCRIPTIONS,
  eventColor,
} from "@/components/demo/data";
import type { AppData, Transaction } from "@/components/demo/data";
import { CheckCircle2, ScanLine, Sparkles, ArrowRight } from "lucide-react";
import {
  fetchUsptoApplication,
  fetchUsptoDocuments,
  fetchUsptoTransactions,
} from "@/lib/uspto.functions";
import { toAppData } from "@/lib/uspto-mapping";

const searchSchema = z.object({
  app: z.string().optional(),
  template: z.string().optional(),
});

export const Route = createFileRoute("/project")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Project — FenixAI" },
      {
        name: "description",
        content:
          "Live USPTO prosecution workflow view. Auto-detects the current docketable event and surfaces the right tools.",
      },
      { property: "og:title", content: "Project — FenixAI" },
      {
        property: "og:description",
        content:
          "Live USPTO prosecution workflow view for a patent application.",
      },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/project" });
  const rawApp = (search.app ?? "").trim();
  const cleanApp = rawApp.replace(/\D/g, "");
  const template = search.template?.trim() || undefined;

  const appQuery = useQuery({
    queryKey: ["uspto-app", cleanApp],
    queryFn: () =>
      fetchUsptoApplication({ data: { applicationNumber: cleanApp } }),
    enabled: !!cleanApp,
    staleTime: 5 * 60_000,
  });

  const txQuery = useQuery({
    queryKey: ["uspto-tx", cleanApp],
    queryFn: () =>
      fetchUsptoTransactions({ data: { applicationNumber: cleanApp } }),
    enabled: !!cleanApp,
    staleTime: 5 * 60_000,
  });

  const docsQuery = useQuery({
    queryKey: ["uspto-docs", cleanApp],
    queryFn: () =>
      fetchUsptoDocuments({ data: { applicationNumber: cleanApp } }),
    enabled: !!cleanApp,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Phased reveal: 0 fetching -> 1 got app info -> 2 scanning tx ->
  // 3 detected event -> 4 ready -> 5 deliver to workspace after a 3s hold.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
  }, [cleanApp]);
  useEffect(() => {
    if (phase === 0 && appQuery.data) {
      const t = setTimeout(() => setPhase(1), 600);
      return () => clearTimeout(t);
    }
  }, [phase, appQuery.data]);
  useEffect(() => {
    if (phase === 1) {
      // Give the user time to read the fetched application details.
      const t = setTimeout(() => setPhase(2), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);
  useEffect(() => {
    if (phase === 2 && txQuery.data) {
      // Scanning prosecution history animation.
      const t = setTimeout(() => setPhase(3), 1600);
      return () => clearTimeout(t);
    }
  }, [phase, txQuery.data]);
  useEffect(() => {
    if (phase === 3) {
      // Let the detected docket event land and be read.
      const t = setTimeout(() => setPhase(4), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);
  useEffect(() => {
    if (phase === 4) {
      const t = setTimeout(() => setPhase(5), 900);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const goToApp = (nextApp: string) => {
    navigate({
      search: (prev: { app?: string; template?: string }) => ({
        ...prev,
        app: nextApp.trim() || undefined,
      }),
    });
  };

  if (!cleanApp) {
    return <AppNumberPrompt onSubmit={goToApp} />;
  }

  const err = appQuery.error || txQuery.error;
  if (err) {
    return (
      <ErrorState
        message={(err as Error | null)?.message ?? "Failed to load application."}
        onRetry={() => {
          appQuery.refetch();
          txQuery.refetch();
          setPhase(0);
        }}
        onChange={() => goToApp("")}
      />
    );
  }

  const partial = appQuery.data
    ? toAppData(appQuery.data, txQuery.data, rawApp, template, docsQuery.data)
    : null;

  if (phase < 6 || !appQuery.data) {
    return (
      <LoadingState
        appNumber={rawApp}
        phase={phase}
        app={partial}
        onContinue={() => setPhase(6)}
      />
    );
  }

  const appData = toAppData(
    appQuery.data,
    txQuery.data,
    rawApp,
    template,
    docsQuery.data,
  );

  return (
    <>
      <Workspace app={appData} onChangeApp={(next) => goToApp(next ?? "")} />
      <SaveProjectNudge
        applicationNumber={appData.appNumber || cleanApp}
        title={appData.title}
      />
    </>
  );
}

function AppNumberPrompt({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value);
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 space-y-4"
      >
        <div>
          <h1 className="text-lg font-semibold">Open a project</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enter a U.S. patent application number to load live USPTO data.
          </p>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 17/758,325"
          className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="h-9 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => onSubmit("17/758,325")}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            Use sample 17/758,325
          </button>
        </div>
      </form>
    </div>
  );
}

function LoadingState({
  appNumber,
  phase,
  app,
  onContinue,
}: {
  appNumber: string;
  phase: number;
  app: ReturnType<typeof toAppData> | null;
  onContinue: () => void;
}) {
  const detected = app ? detectEvent(app.transactions) : undefined;

  // 10-second countdown once everything is ready.
  const ready = phase >= 5;
  const [countdown, setCountdown] = useState(10);
  useEffect(() => {
    if (!ready) return;
    setCountdown(10);
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          onContinue();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [ready, onContinue]);

  // Build a small "docketable timeline" for the scan card, highlighting
  // the selected event and marking superseded / administrative rows.
  const timeline = buildDocketableTimeline(app?.transactions ?? [], detected?.code);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="h-14 border-b border-zinc-800 flex items-center px-4">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
          F
        </div>
        <span className="ml-2 font-semibold tracking-tight">FenixAI</span>
        <span className="ml-auto font-mono text-xs text-zinc-500">
          {ready ? `Ready · ${appNumber}` : `Loading ${appNumber}…`}
        </span>
      </div>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {/* Application header card */}
        <div
          className={
            "rounded-xl border p-5 transition-all duration-500 " +
            (phase >= 1
              ? "border-emerald-700/60 bg-emerald-950/30 animate-in fade-in slide-in-from-bottom-2"
              : "border-zinc-800 bg-zinc-900/40")
          }
        >
          {phase < 1 ? (
            <div className="flex items-center gap-3">
              <ScanLine className="h-4 w-4 text-zinc-400 animate-pulse" />
              <div className="text-sm text-zinc-300">
                Fetching application {appNumber || "—"}…
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-emerald-300 font-semibold text-[15px] truncate">
                    {app?.title || "Application found"}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-emerald-300/80 whitespace-nowrap">
                  {app?.appNumber}
                  {app?.assignee && app.assignee !== "—" ? ` · ${app.assignee}` : ""}
                  {app?.artUnit && app.artUnit !== "—" ? ` · Art Unit ${app.artUnit}` : ""}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-4 pl-8">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Examiner
                  </div>
                  <div className="text-sm text-zinc-100 mt-0.5">
                    {app?.examiner || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Filed
                  </div>
                  <div className="text-sm text-zinc-100 mt-0.5 font-mono">
                    {app?.filingDate || "—"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scanning prosecution history card */}
        {phase >= 2 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-zinc-800/80 flex items-center justify-center">
                <ScanLine
                  className={
                    "h-4 w-4 text-zinc-300 " +
                    (phase < 3 ? "animate-pulse" : "")
                  }
                />
              </div>
              <div className="text-[15px] font-semibold text-zinc-100">
                {phase < 3
                  ? "Scanning prosecution history…"
                  : "Scanning prosecution history"}
              </div>
              {phase >= 3 && detected && (
                <div className="ml-auto text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-950 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {detected.code} selected
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {phase < 3 && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}
              {phase >= 3 &&
                timeline.map((row, i) => (
                  <TimelineRow key={i} row={row} />
                ))}
              {phase >= 3 && timeline.length === 0 && (
                <div className="text-xs text-zinc-500 py-2">
                  No docketable events found in prosecution history.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preparing workspace card */}
        {phase >= 4 && (
          <div className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <Sparkles
                className={
                  "h-4 w-4 text-blue-300 " + (!ready ? "animate-pulse" : "")
                }
              />
              <div className="text-[15px] font-semibold text-blue-100">
                {ready
                  ? `Workspace prepared${
                      detected?.code ? ` for ${detected.code} response` : ""
                    }`
                  : "Preparing workspace…"}
              </div>
              {ready && (
                <button
                  onClick={onContinue}
                  className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors"
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {ready && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-blue-200/70">
                <span>
                  Opening workspace automatically in{" "}
                  <span className="font-mono text-blue-100">{countdown}s</span>
                </span>
                <div className="h-1 flex-1 mx-4 rounded-full bg-blue-950 overflow-hidden">
                  <div
                    className="h-full bg-blue-400 transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

type TimelineEntry = {
  code: string;
  date: string;
  description: string;
  status: "selected" | "superseded" | "admin";
};

function buildDocketableTimeline(
  txs: Transaction[],
  selectedCode: string | undefined,
): TimelineEntry[] {
  const supersededByMap: Record<string, string[]> = SUPERSEDED_BY;
  const rows: TimelineEntry[] = [];

  // Sort newest-first, take up to 4 recent transactions of interest
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const t of sorted) {
    if (rows.length >= 4) break;
    const isDocketable = DOCKETABLE.includes(t.code);
    const isAdmin = ["WIDS", "APP.FILE.REC", "NTC.PUB"].includes(t.code);
    if (!isDocketable && !isAdmin) continue;

    let status: TimelineEntry["status"] = "admin";
    if (t.code === selectedCode) status = "selected";
    else if (isDocketable && selectedCode) {
      const supersededList = supersededByMap[t.code] ?? [];
      if (supersededList.includes(selectedCode)) status = "superseded";
      else status = "superseded";
    }

    rows.push({
      code: t.code,
      date: t.date,
      description:
        TRANSACTION_DESCRIPTIONS[t.code] ?? t.description ?? t.code,
      status,
    });
  }

  return rows;
}

function TimelineRow({ row }: { row: TimelineEntry }) {
  const dotColor =
    row.status === "selected"
      ? "bg-emerald-400"
      : row.status === "superseded"
        ? "bg-blue-400"
        : "bg-zinc-600";

  const chipColor = eventColor(row.code).chip;
  const label =
    row.status === "selected"
      ? "Selected — most recent docketable"
      : row.status === "superseded"
        ? "Superseded by newer event"
        : "Administrative — skipped";
  const labelColor =
    row.status === "selected"
      ? "text-emerald-300"
      : row.status === "superseded"
        ? "text-zinc-400"
        : "text-zinc-500";

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={"h-2 w-2 rounded-full shrink-0 " + dotColor} />
      <div className="font-mono text-[11px] text-zinc-400 w-20 shrink-0">
        {row.date}
      </div>
      <div
        className={
          "font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border w-16 text-center shrink-0 " +
          chipColor
        }
      >
        {row.code}
      </div>
      <div className={"truncate " + labelColor}>{label}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-2 rounded-full bg-zinc-800" />
      <div className="h-3 w-20 rounded bg-zinc-800/70 animate-pulse" />
      <div className="h-4 w-14 rounded bg-zinc-800/70 animate-pulse" />
      <div className="h-3 flex-1 rounded bg-zinc-800/50 animate-pulse" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  onChange,
}: {
  message: string;
  onRetry: () => void;
  onChange: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-red-900/60 bg-red-950/30 p-6 space-y-3">
        <h1 className="text-base font-semibold text-red-200">
          Couldn't load application
        </h1>
        <p className="text-sm text-red-100/70 break-words">{message}</p>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onRetry}
            className="h-9 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
          >
            Retry
          </button>
          <button
            onClick={onChange}
            className="h-9 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Use a different number
          </button>
        </div>
      </div>
    </div>
  );
}