import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Workspace } from "@/components/demo/Workspace";
import { SaveProjectNudge } from "@/components/SaveProjectNudge";
import {
  fetchUsptoApplication,
  fetchUsptoDocuments,
  fetchUsptoTransactions,
} from "@/lib/uspto.functions";
import { toAppData } from "@/lib/uspto-mapping";
import { DOCKETABLE, detectEvent, type AppData } from "@/components/demo/data";

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

  const goToApp = (nextApp: string) => {
    navigate({
      search: (prev: { app?: string; template?: string }) => ({
        ...prev,
        app: nextApp.trim() || undefined,
      }),
    });
  };

  const [scanDone, setScanDone] = useState(false);
  // Reset scan when the app number changes.
  useEffect(() => {
    setScanDone(false);
  }, [cleanApp]);

  if (!cleanApp) {
    return <AppNumberPrompt onSubmit={goToApp} />;
  }

  const err = appQuery.error || txQuery.error;
  if (err || !appQuery.data) {
    if (appQuery.isLoading || txQuery.isLoading) {
      return (
        <TerminalScan appNumber={rawApp} app={null} onDone={() => {}} />
      );
    }
    return (
      <ErrorState
        message={(err as Error | null)?.message ?? "Failed to load application."}
        onRetry={() => {
          appQuery.refetch();
          txQuery.refetch();
        }}
        onChange={() => goToApp("")}
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

  if (!scanDone) {
    return (
      <TerminalScan
        appNumber={rawApp}
        app={appData}
        onDone={() => setScanDone(true)}
      />
    );
  }

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

type ScanLine =
  | { kind: "info"; text: string }
  | { kind: "muted"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "hit"; text: string }
  | { kind: "miss"; text: string }
  | { kind: "star"; text: string }
  | { kind: "blank" };

function TerminalScan({
  appNumber,
  app,
  onDone,
}: {
  appNumber: string;
  app: AppData | null;
  onDone: () => void;
}) {
  const [lines, setLines] = useState<ScanLine[]>([]);
  const queueRef = useRef<ScanLine[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneFiredRef = useRef(false);
  const finalPushedRef = useRef(false);
  const bootedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const schedule = () => {
    if (timerRef.current) return;
    const tick = () => {
      timerRef.current = null;
      const next = queueRef.current.shift();
      if (!next) {
        if (finalPushedRef.current && !doneFiredRef.current) {
          doneFiredRef.current = true;
          // brief pause on the completed terminal before revealing workspace
          setTimeout(onDone, 550);
        }
        return;
      }
      setLines((prev) => [...prev, next]);
      // Pacing: blanks pause a touch, headers a bit longer, everything else fast.
      const delay =
        next.kind === "blank" ? 90 : next.kind === "info" ? 110 : 55;
      timerRef.current = setTimeout(tick, delay);
    };
    timerRef.current = setTimeout(tick, 60);
  };

  // Boot sequence: shown immediately while data is still fetching.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    queueRef.current.push(
      { kind: "muted", text: `$ fenix scan --application ${appNumber || "—"}` },
      { kind: "info", text: "→ Connecting to USPTO ODP…" },
      { kind: "ok", text: "connected  (patent-file-wrapper v1)" },
      { kind: "info", text: "→ Fetching application metadata…" },
      { kind: "info", text: "→ Fetching transaction history…" },
    );
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When data arrives, queue the detection sequence + final summary.
  useEffect(() => {
    if (!app || finalPushedRef.current) return;
    finalPushedRef.current = true;

    const winner = detectEvent(app.transactions);
    const dockHits = app.transactions.filter((t) =>
      DOCKETABLE.includes(t.code),
    );

    queueRef.current.push(
      { kind: "ok", text: `metadata received  (${app.transactions.length} transactions)` },
      { kind: "blank" },
      { kind: "info", text: "─── application ───" },
      { kind: "muted", text: `  app_no       ${app.appNumber}` },
      { kind: "muted", text: `  title        ${truncate(app.title, 68)}` },
      { kind: "muted", text: `  applicant    ${truncate(app.assignee, 68)}` },
      { kind: "muted", text: `  examiner     ${app.examiner}` },
      { kind: "muted", text: `  art_unit     ${app.artUnit}` },
      { kind: "muted", text: `  filed        ${app.filingDate || "—"}` },
      { kind: "muted", text: `  status       ${app.meta?.status ?? "—"}` },
      { kind: "blank" },
      {
        kind: "info",
        text: `→ Scanning ${app.transactions.length} transactions against ${DOCKETABLE.length} docketable codes…`,
      },
    );

    // Show a compact sample of the scan: recent transactions with hit/miss.
    const sample = app.transactions.slice(0, 8);
    for (const t of sample) {
      const isDock = DOCKETABLE.includes(t.code);
      const isWinner =
        !!winner && t.code === winner.code && t.date === winner.date;
      queueRef.current.push({
        kind: isWinner ? "star" : isDock ? "hit" : "miss",
        text: `${t.date}  [${t.code.padEnd(6)}]  ${truncate(t.description, 56)}`,
      });
    }
    if (app.transactions.length > sample.length) {
      queueRef.current.push({
        kind: "muted",
        text: `  … (${app.transactions.length - sample.length} more)`,
      });
    }

    queueRef.current.push(
      { kind: "blank" },
      {
        kind: "ok",
        text: `docketable events found: ${dockHits.length}`,
      },
    );

    if (winner) {
      queueRef.current.push({
        kind: "star",
        text: `most recent: ${winner.code} on ${winner.date} — ${truncate(winner.description, 46)}`,
      });
    } else {
      queueRef.current.push({
        kind: "muted",
        text: "no docketable event detected",
      });
    }

    queueRef.current.push(
      { kind: "blank" },
      { kind: "info", text: "→ Loading workspace…" },
    );

    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  // Autoscroll as lines print.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="h-14 border-b border-zinc-800 flex items-center px-4">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
          F
        </div>
        <span className="ml-2 font-semibold tracking-tight">FenixAI</span>
        <span className="ml-auto font-mono text-xs text-zinc-500">
          Scanning {appNumber}…
        </span>
      </div>
      <div className="flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl rounded-lg border border-zinc-800 bg-black shadow-lg overflow-hidden">
          <div className="h-8 border-b border-zinc-800 bg-zinc-900/70 flex items-center gap-2 px-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-2 font-mono text-[11px] text-zinc-500">
              fenix — scan
            </span>
          </div>
          <div
            ref={scrollRef}
            className="font-mono text-[12px] leading-6 p-4 h-[440px] overflow-y-auto"
          >
            {lines.map((l, i) => (
              <ScanLineView key={i} line={l} />
            ))}
            <span className="inline-block h-3 w-2 bg-zinc-300 align-middle animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScanLineView({ line }: { line: ScanLine }) {
  if (line.kind === "blank") return <div>&nbsp;</div>;
  const map: Record<Exclude<ScanLine["kind"], "blank">, { cls: string; prefix: string }> = {
    info: { cls: "text-zinc-200", prefix: "" },
    muted: { cls: "text-zinc-500", prefix: "" },
    ok: { cls: "text-emerald-400", prefix: "✓  " },
    hit: { cls: "text-zinc-300", prefix: "✓  " },
    miss: { cls: "text-zinc-600", prefix: "·  " },
    star: { cls: "text-emerald-400", prefix: "★  " },
  };
  const { cls, prefix } = map[line.kind];
  return (
    <div className={cls}>
      {prefix}
      {line.text}
    </div>
  );
}

function truncate(s: string, n: number) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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