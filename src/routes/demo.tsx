import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { APPS, AppData } from "@/components/demo/data";
import { Workspace } from "@/components/demo/Workspace";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "FenixAI — Interactive Demo" },
      { name: "description", content: "Type a patent application number and watch FenixAI surface contextual automation." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [app, setApp] = useState<AppData | null>(null);
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 960);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-2xl mb-3">🖥️</div>
          <p>FenixAI is best experienced on a desktop browser. Please visit on a larger screen.</p>
        </div>
      </div>
    );
  }

  if (!app) return <LandingChooser onPick={setApp} />;
  return <Workspace app={app} onChangeApp={() => setApp(null)} />;
}

function LandingChooser({ onPick }: { onPick: (a: AppData) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (raw: string) => {
    setError(null);
    const v = raw.trim();
    const found = APPS[v];
    if (!found) {
      setError("Application not found in demo. Try 17/758,325, 17/123,456, or 16/987,654.");
      return;
    }
    setLoading(true);
    setStep(1);
    const seq = [400, 400, 400, 400, 400];
    let cumulative = 0;
    seq.forEach((delay, i) => {
      cumulative += delay;
      setTimeout(() => setStep(i + 2), cumulative);
    });
    setTimeout(() => {
      setLoading(false);
      onPick(found);
    }, cumulative + 200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">F</div>
        <span className="font-semibold tracking-tight">FenixAI</span>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Demo</span>
        <div className="flex-1 flex items-center gap-2 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(value)}
            placeholder="Application number… try 17/758,325"
            disabled={loading}
            className="flex-1 font-mono text-xs px-3 h-9 rounded-md bg-zinc-900 border border-zinc-800 focus:border-zinc-600 outline-none"
          />
          <button
            onClick={() => submit(value)}
            disabled={loading}
            className="h-9 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white disabled:opacity-50"
          >
            {loading ? "Loading…" : "Get Application"}
          </button>
        </div>
        <div className="w-[140px]" />
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        {loading ? (
          <div className="font-mono text-sm space-y-2 min-w-[420px]">
            <Line done={step > 1} active={step === 1} label="Connecting to USPTO ODP…" />
            <Line done={step > 2} active={step === 2} label="Fetching application data…" />
            <Line done={step > 3} active={step === 3} label="Reading prosecution history…" />
            <Line done={step > 4} active={step === 4} label="Scanning for docketable events…" />
            <Line done={step > 5} active={step === 5} label="Ready" />
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="text-3xl mb-3">🔍</div>
            <h1 className="text-lg font-semibold">Enter an application number to begin</h1>
            <p className="text-sm text-zinc-400 mt-2">
              FenixAI fetches USPTO ODP data and surfaces contextual automation.
            </p>
            {error && (
              <div className="mt-4 text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded px-3 py-2">{error}</div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {Object.keys(APPS).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setValue(k);
                    submit(k);
                  }}
                  className="font-mono text-xs px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 transition"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Line({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  if (!done && !active) return <div className="text-zinc-700">  {label}</div>;
  if (done)
    return (
      <div className="text-zinc-600 line-through">
        ✓ {label}
      </div>
    );
  return <div className="text-zinc-100">→ {label}</div>;
}