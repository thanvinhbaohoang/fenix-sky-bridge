import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Workspace } from "@/components/demo/Workspace";
import { SaveProjectNudge } from "@/components/SaveProjectNudge";
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

  if (appQuery.isLoading || txQuery.isLoading) {
    return <LoadingState appNumber={rawApp} />;
  }

  const err = appQuery.error || txQuery.error;
  if (err || !appQuery.data) {
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

function LoadingState({ appNumber }: { appNumber: string }) {
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
      <div className="flex">
        <aside className="w-[220px] border-r border-zinc-800 p-3 space-y-3">
          <div className="h-4 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse" />
        </aside>
        <main className="flex-1 p-6 space-y-3">
          <div className="h-6 w-64 bg-zinc-800 rounded animate-pulse" />
          <div className="h-24 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
          <div className="h-24 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
          <div className="h-24 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
        </main>
      </div>
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