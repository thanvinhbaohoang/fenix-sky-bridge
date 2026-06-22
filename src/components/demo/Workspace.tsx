import { useEffect, useMemo, useRef, useState } from "react";
import {
  APPS,
  AppData,
  DOCKETABLE,
  EVENT_ICONS,
  EVENT_LABELS,
  FORMS_BY_EVENT,
  Task,
  TASKS_BY_EVENT,
  TRANSACTION_DESCRIPTIONS,
  Transaction,
  detectEvent,
  emailTemplate,
  eventColor,
  statusBanner,
  Citation,
} from "./data";

type Tab =
  | "workflow"
  | "automation"
  | "project"
  | "citation"
  | "overview"
  | "history";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "workflow", label: "Workflow tasks", icon: "☑" },
  { id: "automation", label: "Automation & Forms", icon: "⚡" },
  { id: "project", label: "Project Management", icon: "📋" },
  { id: "citation", label: "Citation Tool", icon: "📚" },
  { id: "overview", label: "Application overview", icon: "📄" },
  { id: "history", label: "Transaction history", icon: "🕐" },
];

function CodeBadge({ code }: { code: string }) {
  const c = eventColor(code);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {code}
    </span>
  );
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return <span className="text-[11px] text-zinc-500 italic">unassigned</span>;
  const initials = name.split(/[ .]+/).map((s) => s[0]).slice(0, 2).join("");
  const color = name.startsWith("S") ? "bg-blue-700" : name.startsWith("M") ? "bg-teal-700" : "bg-amber-700";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold text-white ${color}`}>{initials}</span>
      <span className="text-xs text-zinc-300">{name}</span>
    </span>
  );
}

function TagBadge({ tag }: { tag: Task["tag"] }) {
  const map = {
    urgent: "bg-red-900/60 text-red-300 border-red-700/60",
    action: "bg-blue-900/60 text-blue-300 border-blue-700/60",
    optional: "bg-zinc-800 text-zinc-400 border-zinc-700",
  };
  return <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded border ${map[tag]}`}>{tag}</span>;
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700">
      {n}
    </span>
  );
}

export function Workspace({ app, onChangeApp }: { app: AppData; onChangeApp: () => void }) {
  const detected = useMemo(() => detectEvent(app.transactions), [app]);
  const code = detected?.code ?? "";
  const [tab, setTab] = useState<Tab>("workflow");
  const [tasks, setTasks] = useState<Task[]>(() => (TASKS_BY_EVENT[code] ?? []).map((t) => ({ ...t })));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ tool: string; task: Task } | null>(null);
  const [scanPlayed, setScanPlayed] = useState(false);

  // reset state on app change
  useEffect(() => {
    setTab("workflow");
    setTasks((TASKS_BY_EVENT[code] ?? []).map((t) => ({ ...t })));
    setExpanded(null);
    setPanel(null);
    setScanPlayed(false);
  }, [app.appNumber, code]);

  const c = eventColor(code);
  const banner = statusBanner(code, app);
  const done = tasks.filter((t) => t.done).length;

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Topbar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 gap-4 shrink-0">
        <button onClick={onChangeApp} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">F</div>
          <span className="font-semibold tracking-tight">FenixAI</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Demo</span>
        </button>
        <div className="flex-1 flex items-center gap-2 max-w-2xl mx-auto">
          <button
            onClick={onChangeApp}
            className="flex-1 text-left font-mono text-xs px-3 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 transition"
          >
            {app.appNumber}
          </button>
          <button onClick={onChangeApp} className="h-9 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white">
            Change application
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-500">{app.matter}</span>
          {detected && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
              <span>{EVENT_ICONS[code] ?? "●"}</span> {code}
            </span>
          )}
        </div>
      </header>

      {/* Status banner */}
      {detected && (
        <div className={`h-10 ${c.tint} border-b ${c.border} px-4 flex items-center gap-3 text-xs shrink-0`}>
          <span className="text-base leading-none">{EVENT_ICONS[code] ?? "●"}</span>
          <span className={`font-semibold ${c.text}`}>{banner.msg}</span>
          <span className="text-zinc-400">· {banner.sub}</span>
          <span className="ml-auto">
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${banner.chipUrgent ? "bg-red-500/20 text-red-200 border-red-500/40" : c.chip}`}>
              {banner.chip}
            </span>
          </span>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <div className="text-xs font-semibold leading-snug line-clamp-2">{app.title}</div>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                {EVENT_ICONS[code] ?? "●"} {code}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
              <div>🏢 {app.assignee}</div>
              <div>👤 {app.inventors}</div>
              <div>🔧 Art Unit {app.artUnit}</div>
              <div>🔍 {app.examiner}</div>
            </div>
          </div>
          <nav className="p-2 space-y-0.5">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition border-l-2 ${
                  tab === n.id
                    ? "bg-zinc-900 border-zinc-300 text-zinc-100"
                    : "border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                <span>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto p-3 border-t border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Recent transactions</div>
            <div className="space-y-1.5">
              {app.transactions.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <CodeBadge code={t.code} />
                  <div className="flex-1 truncate text-zinc-400">{t.description}</div>
                  <div className="font-mono text-zinc-500">{t.date.slice(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto relative">
          <div className="p-6 max-w-5xl">
            {tab === "workflow" && (
              <WorkflowTab
                code={code}
                tasks={tasks}
                done={done}
                expanded={expanded}
                setExpanded={setExpanded}
                toggleTask={toggleTask}
                openTool={(tool, task) => setPanel({ tool, task })}
              />
            )}
            {tab === "automation" && (
              <AutomationTab
                app={app}
                code={code}
                played={scanPlayed}
                onPlayed={() => setScanPlayed(true)}
              />
            )}
            {tab === "project" && <ProjectTab code={code} tasks={tasks} toggleTask={toggleTask} />}
            {tab === "citation" && <CitationTab initial={app.citations} />}
            {tab === "overview" && <OverviewTab app={app} />}
            {tab === "history" && <HistoryTab app={app} winnerDate={detected?.date} />}
          </div>
        </main>

        {/* Slide panel */}
        {panel && (
          <SlidePanel
            tool={panel.tool}
            app={app}
            code={code}
            initialCitations={app.citations}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  );
}

// --- Workflow tab ---
function WorkflowTab({
  code,
  tasks,
  done,
  expanded,
  setExpanded,
  toggleTask,
  openTool,
}: {
  code: string;
  tasks: Task[];
  done: number;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  toggleTask: (id: string) => void;
  openTool: (tool: string, t: Task) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold">Workflow — {code} response</h2>
        <span className="text-xs text-zinc-400 font-mono">
          {done} of {tasks.length} complete
        </span>
      </div>
      <div className="h-px bg-zinc-800 mb-1">
        <div
          className="h-px bg-teal-400 transition-all duration-500"
          style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }}
        />
      </div>
      <div className="mt-4 space-y-2">
        {tasks.map((t) => {
          const isExp = expanded === t.id;
          return (
            <div
              key={t.id}
              className={`rounded-lg border bg-zinc-900/50 transition ${
                isExp ? "border-l-2 border-l-blue-500 border-zinc-800" : "border-zinc-800"
              } ${t.done ? "opacity-60" : ""}`}
            >
              <div
                className="p-3 flex gap-3 items-start cursor-pointer"
                onClick={() => setExpanded(isExp ? null : t.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(t.id);
                  }}
                  className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                    t.done ? "bg-teal-500 border-teal-500 text-white" : "border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {t.done && <span className="text-[9px]">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-sm font-medium ${t.done ? "line-through text-zinc-500" : ""}`}>{t.title}</div>
                    <div className="flex items-center gap-2">
                      <TagBadge tag={t.tag} />
                      <span className="text-zinc-500 text-xs">{isExp ? "▴" : "▾"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{t.description}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar name={t.assignee} />
                    {!t.done && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-zinc-700 text-zinc-500">
                        + reassign
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isExp && t.tools.length > 0 && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-800 mt-1">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Tools for this step
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.tools.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => openTool(tool, t)}
                        className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600 transition"
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Automation tab ---
function AutomationTab({
  app,
  code,
  played,
  onPlayed,
}: {
  app: AppData;
  code: string;
  played: boolean;
  onPlayed: () => void;
}) {
  const [shown, setShown] = useState<number>(played ? app.transactions.length : 0);
  const [showSelected, setShowSelected] = useState<boolean>(played);
  const [showCard, setShowCard] = useState<boolean>(played);
  const [emailOpen, setEmailOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(played);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let i = 0;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < app.transactions.length) setTimeout(tick, 150);
      else {
        setTimeout(() => setShowSelected(true), 250);
        setTimeout(() => {
          setShowCard(true);
          onPlayed();
        }, 700);
      }
    };
    setTimeout(tick, 200);
  }, [app.transactions.length, onPlayed]);

  const c = eventColor(code);
  const winner = detectEvent(app.transactions);
  const template = emailTemplate(code, app);
  const forms = FORMS_BY_EVENT[code] ?? [];

  const copy = () => {
    navigator.clipboard?.writeText(`Subject: ${template.subject}\n\n${template.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Step 1 — Scan */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <StepNum n={1} />
          <h3 className="text-sm font-medium">Scanning prosecution history for docketable events</h3>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[12px] text-zinc-400 leading-6">
          <div className="text-zinc-500 mb-2">
            Checking {app.transactions.length} transactions against event list: {DOCKETABLE.join(", ")}
          </div>
          {app.transactions.slice(0, shown).map((t, i) => {
            const isDock = DOCKETABLE.includes(t.code);
            const isWinner = winner && t.code === winner.code && t.date === winner.date;
            return (
              <div
                key={i}
                className={
                  isWinner && showSelected
                    ? "text-emerald-400"
                    : isDock
                    ? "text-zinc-200"
                    : "text-zinc-600"
                }
              >
                {isWinner && showSelected ? "★" : isDock ? "✓" : "·"}{"  "}
                {t.date}  [{t.code}]  {t.description}
                {isWinner && showSelected && <span className="ml-2 text-emerald-500">← selected</span>}
              </div>
            );
          })}
          {showCard && winner && (
            <div className="mt-3 text-emerald-400">
              ✓ Most recent docketable event: {winner.code} on {winner.date}
            </div>
          )}
        </div>
      </section>

      {/* Step 2 — Detected event card */}
      {showCard && winner && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={2} />
            <h3 className="text-sm font-medium">Event identified — actions available</h3>
          </div>
          <div className={`rounded-lg border ${c.border} ${c.tint} p-4 flex items-start gap-4`}>
            <div className="text-3xl leading-none">{EVENT_ICONS[code] ?? "●"}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className={`font-semibold ${c.text}`}>
                  {code} — {EVENT_LABELS[code] ?? "Event"}
                </div>
                <span className="font-mono text-xs text-zinc-400">{winner.date}</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {statusBanner(code, app).sub}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setEmailOpen(true)}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                >
                  ✉️ Generate client email
                </button>
                <button
                  onClick={() => setFormsOpen(true)}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                >
                  📄 Auto-populate forms
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3 — Email */}
      {emailOpen && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={3} />
            <h3 className="text-sm font-medium">Generated client email</h3>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="text-xs border-b border-zinc-800 divide-y divide-zinc-800">
              <div className="px-4 py-2 flex gap-3"><span className="text-zinc-500 w-16">To:</span><span className="text-zinc-200">{app.assignee} &lt;ip@client.com&gt;</span></div>
              <div className="px-4 py-2 flex gap-3"><span className="text-zinc-500 w-16">From:</span><span className="text-zinc-200">IP Team at FenixAI Firm</span></div>
              <div className="px-4 py-2 flex gap-3"><span className="text-zinc-500 w-16">Subject:</span><span className="text-zinc-200">{template.subject}</span></div>
            </div>
            <pre className="px-4 py-3 text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-6">{template.body}</pre>
            <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
              <button onClick={copy} className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
              <button className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">✏️ Edit draft</button>
              <button className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">📤 Send Gmail</button>
            </div>
          </div>
        </section>
      )}

      {/* Step 4 — Forms */}
      {formsOpen && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={4} />
            <h3 className="text-sm font-medium">Suggested forms for {code}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {forms.map((f) => (
              <button
                key={f.name + f.ref}
                className="text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="font-mono text-[11px] text-zinc-500">{f.ref}</div>
                </div>
                <span className="text-zinc-500">→</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// --- Project Management (Kanban) ---
function ProjectTab({ code, tasks, toggleTask }: { code: string; tasks: Task[]; toggleTask: (id: string) => void }) {
  const incomplete = tasks.filter((t) => !t.done);
  const doneList = tasks.filter((t) => t.done);
  const inProgress = incomplete.slice(0, 1);
  const todo = incomplete.slice(1);
  const columns = [
    { id: "todo", label: "To do", dot: "bg-zinc-500", list: todo },
    { id: "inprogress", label: "In progress", dot: "bg-blue-500", list: inProgress },
    { id: "done", label: "Done", dot: "bg-emerald-500", list: doneList },
  ];

  return (
    <div>
      <p className="text-xs text-zinc-500 italic mb-4">
        Tasks auto-generated from {code} — {EVENT_LABELS[code] ?? "event"}. Assign to team members and track progress.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => (
          <div key={col.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                {col.label}
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">{col.list.length}</span>
            </div>
            <div className="space-y-2">
              {col.list.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-lg border bg-zinc-900/60 border-zinc-800 transition ${
                    t.done ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                        t.done ? "bg-teal-500 border-teal-500 text-white" : "border-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {t.done && <span className="text-[9px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-xs font-medium ${t.done ? "line-through text-zinc-500" : ""}`}>{t.title}</div>
                        <TagBadge tag={t.tag} />
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{t.description}</div>
                      <div className="mt-2"><Avatar name={t.assignee} /></div>
                    </div>
                  </div>
                </div>
              ))}
              {col.list.length === 0 && col.id === "done" && (
                <div className="text-[11px] text-zinc-600 border border-dashed border-zinc-800 rounded p-4 text-center">
                  No tasks completed yet
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Citation Tool ---
function SourceBadge({ s }: { s: Citation["source"] }) {
  const m = {
    IDS: "bg-blue-900/50 text-blue-300 border-blue-700/50",
    "892": "bg-purple-900/50 text-purple-300 border-purple-700/50",
    Manual: "bg-zinc-800 text-zinc-400 border-zinc-700",
  } as const;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${m[s]}`}>{s}</span>;
}

function CitationTab({ initial }: { initial: Citation[] }) {
  const [rows, setRows] = useState<(Citation & { isNew?: boolean })[]>(initial);
  const [newRef, setNewRef] = useState("");
  const [newType, setNewType] = useState<Citation["type"]>("US Patent");
  const [crossState, setCrossState] = useState<"idle" | "running" | "done">("idle");
  const [idsState, setIdsState] = useState<"idle" | "running" | "done">("idle");
  const [showFlags, setShowFlags] = useState(false);

  const add = () => {
    if (!newRef.trim()) return;
    setRows((r) => [
      ...r,
      { reference: newRef.trim(), type: newType, source: "Manual", pages: "—", isNew: true },
    ]);
    setNewRef("");
  };

  const runCross = () => {
    setCrossState("running");
    setTimeout(() => {
      setCrossState("done");
      setShowFlags(true);
    }, 1200);
  };

  const runIds = () => {
    setIdsState("running");
    setTimeout(() => setIdsState("done"), 900);
  };

  const issues = rows.filter((r) => r.crossCite || r.needsTranslation);
  const grouped = {
    us: rows.filter((r) => r.type === "US Patent" || r.type === "US Pub."),
    foreign: rows.filter((r) => r.type === "Foreign"),
    npl: rows.filter((r) => r.type === "NPL"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1"><SourceBadge s="IDS" /> IDS filed</span>
        <span className="flex items-center gap-1"><SourceBadge s="892" /> 892 art</span>
        <span className="flex items-center gap-1"><SourceBadge s="Manual" /> Manually added</span>
      </div>
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Reference</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-left px-3 py-2 font-medium">Pages</th>
              <th className="text-left px-3 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-zinc-900/40">
                <td className="px-3 py-2 font-mono">
                  {r.isNew && <span className="mr-2 text-[10px] px-1 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">new</span>}
                  {r.reference}
                </td>
                <td className="px-3 py-2 text-zinc-400">{r.type}</td>
                <td className="px-3 py-2"><SourceBadge s={r.source} /></td>
                <td className="px-3 py-2 font-mono text-zinc-500">{r.pages}</td>
                <td className="px-3 py-2 space-x-1">
                  {showFlags && r.crossCite && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60">cross-cite</span>
                  )}
                  {showFlags && r.needsTranslation && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300 border border-orange-700/60">transl.</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <input
          value={newRef}
          onChange={(e) => setNewRef(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add reference (e.g. US 10,123,456 or WO2021/012345)…"
          className="flex-1 font-mono text-xs px-3 h-9 rounded bg-zinc-900 border border-zinc-800 focus:border-zinc-600 outline-none"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as Citation["type"])}
          className="text-xs px-2 h-9 rounded bg-zinc-900 border border-zinc-800"
        >
          <option>US Patent</option>
          <option>US Pub.</option>
          <option>Foreign</option>
          <option>NPL</option>
        </select>
        <button onClick={add} className="text-xs px-3 h-9 rounded bg-zinc-100 text-zinc-950 font-semibold hover:bg-white">+ Add</button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={runCross}
          disabled={crossState === "running"}
          className={`text-xs px-3 py-2 rounded border transition ${
            crossState === "done"
              ? "bg-amber-950/50 border-amber-700/60 text-amber-200"
              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          }`}
        >
          {crossState === "running" ? "⏳ Checking…" : crossState === "done" ? "✓ Cross-check done" : "🔍 Check cross-cites"}
        </button>
        <button
          onClick={runIds}
          disabled={idsState === "running"}
          className={`text-xs px-3 py-2 rounded border transition ${
            idsState === "done"
              ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-200"
              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          }`}
        >
          {idsState === "running" ? "⏳ Generating…" : idsState === "done" ? "✓ IDS ready — download" : "📄 Generate IDS"}
        </button>
      </div>
      {crossState === "done" && (
        issues.length > 0 ? (
          <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-3 text-xs">
            <div className="font-semibold text-amber-200 mb-1">⚠ {issues.length} issue(s) detected</div>
            <ul className="list-disc list-inside text-amber-200/80 space-y-0.5">
              {issues.map((r, i) => (
                <li key={i}>
                  <span className="font-mono">{r.reference}</span>
                  {r.crossCite && " — also cited in related family member"}
                  {r.needsTranslation && " — foreign-language, English translation required"}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3 text-xs text-emerald-200">
            ✓ No cross-cite issues detected
          </div>
        )
      )}
      {idsState === "done" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 whitespace-pre">
{`PTO/SB/08A — INFORMATION DISCLOSURE STATEMENT

U.S. PATENT DOCUMENTS
${grouped.us.map((r, i) => `  ${i + 1}. ${r.reference.padEnd(28)} ${r.pages} pp.`).join("\n") || "  (none)"}

FOREIGN PATENT DOCUMENTS
${grouped.foreign.map((r, i) => `  ${i + 1}. ${r.reference.padEnd(28)} ${r.pages} pp.`).join("\n") || "  (none)"}

NON-PATENT LITERATURE
${grouped.npl.map((r, i) => `  ${i + 1}. ${r.reference.padEnd(28)} ${r.pages} pp.`).join("\n") || "  (none)"}
`}
          <div className="mt-3"><a className="text-blue-400 hover:underline" href="#">Download PDF →</a></div>
        </div>
      )}
    </div>
  );
}

// --- Overview ---
function OverviewTab({ app }: { app: AppData }) {
  const fields: [string, string, boolean?][] = [
    ["Application number", app.appNumber, true],
    ["Title", app.title],
    ["Assignee", app.assignee],
    ["Inventors", app.inventors],
    ["Art Unit", app.artUnit, true],
    ["Examiner", app.examiner],
    ["Status", "Pending"],
    ["Matter number", app.matter, true],
    ["Filing date", app.filingDate, true],
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(([label, val, mono]) => (
        <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
          <div className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""}`}>{val}</div>
        </div>
      ))}
    </div>
  );
}

// --- History ---
function HistoryTab({ app, winnerDate }: { app: AppData; winnerDate?: string }) {
  const sorted = [...app.transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div>
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {sorted.map((t, i) => {
            const isWinner = winnerDate === t.date && DOCKETABLE.includes(t.code);
            const c = eventColor(t.code);
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs ${isWinner ? c.tint : ""}`}
              >
                <CodeBadge code={t.code} />
                <span className="flex-1 text-zinc-300">{t.description}</span>
                {isWinner && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${c.bg} ${c.text} ${c.border}`}>
                    latest docketable
                  </span>
                )}
                <span className="font-mono text-zinc-500">{t.date}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-[11px] text-zinc-400">
        <span className="text-zinc-500">Monitored docketable codes: </span>
        <span className="font-mono">{DOCKETABLE.join(", ")}</span>
      </div>
    </div>
  );
}

// --- Slide panel ---
function SlidePanel({
  tool,
  app,
  code,
  initialCitations,
  onClose,
}: {
  tool: string;
  app: AppData;
  code: string;
  initialCitations: Citation[];
  onClose: () => void;
}) {
  const template = emailTemplate(code, app);
  const [alertSet, setAlertSet] = useState(false);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed top-14 right-0 bottom-0 w-[320px] border-l border-zinc-800 bg-zinc-950 z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="h-12 border-b border-zinc-800 px-3 flex items-center justify-between shrink-0">
          <div className="text-sm font-medium">{tool}</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {tool === "Email client" && (
            <>
              <div className="space-y-2">
                <Field label="To" value={`${app.assignee} <ip@client.com>`} />
                <Field label="From" value="IP Team at FenixAI Firm" />
                <Field label="Subject" value={template.subject} />
              </div>
              <textarea
                className="w-full h-64 text-xs p-2 rounded bg-zinc-900 border border-zinc-800 font-sans leading-5"
                defaultValue={template.body}
              />
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">📋 Copy</button>
                <button className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">✏️ Edit</button>
                <button className="text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800">📤 Send Gmail</button>
              </div>
            </>
          )}
          {tool === "Citation tool" && <CitationTab initial={initialCitations} />}
          {tool === "Generate IDS" && (
            <>
              <div className="text-zinc-400">References to include:</div>
              {initialCitations.map((r, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="accent-teal-500" />
                  <span className="font-mono">{r.reference}</span>
                  <SourceBadge s={r.source} />
                </label>
              ))}
              <input
                placeholder="Add reference…"
                className="w-full font-mono text-xs px-2 h-8 rounded bg-zinc-900 border border-zinc-800"
              />
              <button className="w-full text-xs px-3 h-9 rounded bg-zinc-100 text-zinc-950 font-semibold">Generate PDF</button>
            </>
          )}
          {(tool === "Set deadline alert" || tool === "Set OA alert") && (
            <>
              <Field label="Date" value="2026-09-18" />
              <textarea
                className="w-full h-24 text-xs p-2 rounded bg-zinc-900 border border-zinc-800"
                placeholder="Note…"
                defaultValue={`${code} deadline for ${app.appNumber}`}
              />
              <button
                onClick={() => setAlertSet(true)}
                className={`w-full text-xs px-3 h-9 rounded font-semibold ${
                  alertSet ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-950"
                }`}
              >
                {alertSet ? "✓ Alert set" : "Set alert"}
              </button>
            </>
          )}
          {tool === "Prior art search" && (
            <>
              <input
                placeholder="Describe the technology…"
                className="w-full text-xs px-2 h-9 rounded bg-zinc-900 border border-zinc-800"
              />
              <button className="w-full text-xs px-3 h-9 rounded bg-zinc-100 text-zinc-950 font-semibold">Search</button>
              <div className="rounded border border-dashed border-zinc-800 p-4 text-center text-zinc-600">
                No results yet
              </div>
            </>
          )}
          {["Request interview", "Claim analysis", "Office action tool", "Generate letter"].includes(tool) && (
            <div className="text-center py-8 text-zinc-500">
              <div className="text-3xl mb-2">🛠️</div>
              <div>Coming soon in production</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-xs text-zinc-200 mt-0.5">{value}</div>
    </div>
  );
}