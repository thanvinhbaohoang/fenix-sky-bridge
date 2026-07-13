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
      const t = setTimeout(() => setPhase(1), 200);
      return () => clearTimeout(t);
    }
  }, [phase, appQuery.data]);
  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 500);
      return () => clearTimeout(t);
    }
  }, [phase]);
  useEffect(() => {
    if (phase === 2 && txQuery.data) {
      const t = setTimeout(() => setPhase(3), 500);
      return () => clearTimeout(t);
    }
  }, [phase, txQuery.data]);
  useEffect(() => {
    if (phase === 3) {
      const t = setTimeout(() => setPhase(4), 400);
      return () => clearTimeout(t);
    }
  }, [phase]);
  useEffect(() => {
    if (phase === 4) {
      const t = setTimeout(() => setPhase(5), 600);
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

  if (phase < 5 || !appQuery.data) {
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
}: {
  appNumber: string;
  phase: number;
  app: ReturnType<typeof toAppData> | null;
}) {
  const detected = app ? detectEvent(app.transactions) : undefined;
  const steps = [
    { label: "Fetching application data…", done: phase >= 1 },
    { label: "Loading application details…", done: phase >= 2 },
    { label: "Scanning prosecution history…", done: phase >= 3 },
    { label: "Detecting docketable event…", done: phase >= 4 },
    { label: "Opening workspace…", done: phase >= 5 },
  ];
  const currentIdx = steps.findIndex((s) => !s.done);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="h-14 border-b border-zinc-800 flex items-center px-4">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
          F
        </div>
        <span className="ml-2 font-semibold tracking-tight">FenixAI</span>
        <span className="ml-auto font-mono text-xs text-zinc-500">
          Loading {appNumber}…
        </span>
      </div>
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[12px] leading-6">
          <div className="text-zinc-500 mb-2">
            Application {appNumber || "—"}
          </div>
          {steps.map((s, i) => {
            const isCurrent = i === currentIdx;
            const isDone = s.done;
            return (
              <div
                key={i}
                className={
                  isDone
                    ? "text-emerald-400"
                    : isCurrent
                      ? "text-zinc-200"
                      : "text-zinc-600"
                }
              >
                {isDone ? "✓" : isCurrent ? (
                  <span className="inline-block animate-pulse">▸</span>
                ) : "·"}
                {"  "}
                {s.label}
              </div>
            );
          })}
        </div>

        {phase >= 1 && app && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
              Application details
            </div>
            <div className="text-sm font-semibold text-zinc-100 mb-2">
              {app.title}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-zinc-500">App No.</dt>
              <dd className="font-mono text-zinc-200">{app.appNumber}</dd>
              <dt className="text-zinc-500">Filed</dt>
              <dd className="text-zinc-200">{app.filingDate || "—"}</dd>
              <dt className="text-zinc-500">Applicant</dt>
              <dd className="text-zinc-200 truncate">{app.assignee}</dd>
              <dt className="text-zinc-500">Examiner</dt>
              <dd className="text-zinc-200 truncate">{app.examiner}</dd>
              <dt className="text-zinc-500">Art Unit</dt>
              <dd className="text-zinc-200">{app.artUnit}</dd>
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-zinc-200 truncate">{app.meta?.status ?? "—"}</dd>
            </dl>
          </div>
        )}

        {phase >= 3 && app && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
              Prosecution scan
            </div>
            <div className="text-xs text-zinc-400 mb-2">
              Scanned{" "}
              <span className="text-zinc-200 font-mono">
                {app.transactions.length}
              </span>{" "}
              transactions.
            </div>
            {detected ? (
              <div className="text-xs">
                <div className="text-emerald-400">
                  ✓ Detected docketable event
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
                    {detected.code}
                  </span>
                  <span className="text-zinc-300">
                    {TRANSACTION_DESCRIPTIONS[detected.code] ??
                      detected.description}
                  </span>
                  <span className="ml-auto font-mono text-zinc-500">
                    {detected.date}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">
                No active docketable event detected.
              </div>
            )}
          </div>
        )}
      </main>
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