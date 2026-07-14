import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { TaskDetailPanel } from "./TaskDetailPanel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  getMailDate,
  getTasksForEvent,
  getFormsForEvent,
} from "./data";
import { useToast } from "@/hooks/use-toast";
import { guessNameFromEmail } from "@/lib/name-from-email";
import { notifyAssignment } from "@/lib/notify-assignment.functions";
import { useGoogleContacts } from "@/hooks/use-google-contacts";
import { useOrgSuggestions } from "@/hooks/use-org-suggestions";
import { UserMenu } from "@/components/UserMenu";
import {
  CheckSquare,
  Zap,
  ClipboardList,
  BookOpen,
  Building2,
  User as UserIcon,
  Wrench,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileText,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

type Tab =
  | "workflow"
  | "automation"
  | "project"
  | "citation"
  | "overview"
  | "history";

const NAV: {
  id: Tab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "workflow", label: "Workflow tasks", Icon: CheckSquare },
  { id: "automation", label: "Automation & Forms", Icon: Zap },
  { id: "project", label: "Project Management", Icon: ClipboardList },
  { id: "citation", label: "Citation Tool", Icon: BookOpen },
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

export type Contact = { name: string; email: string };

const CONTACTS_KEY = "fenixai.contacts.v1";
const PROJECTS_KEY = "fenixai.projects.v1";

type ProjectStore = Record<
  string, // appNumber
  Record<string, { doneIds: string[]; updatedAt: string }> // eventKey → done state
>;

function readProjectStore(): ProjectStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as ProjectStore) : {};
  } catch {
    return {};
  }
}

function loadProjectDone(appNumber: string, eventKey: string): string[] {
  if (!eventKey) return [];
  const store = readProjectStore();
  return store[appNumber]?.[eventKey]?.doneIds ?? [];
}

function saveProjectDone(
  appNumber: string,
  eventKey: string,
  doneIds: string[],
) {
  if (typeof window === "undefined" || !eventKey) return;
  try {
    const store = readProjectStore();
    const appStore = store[appNumber] ?? {};
    appStore[eventKey] = { doneIds, updatedAt: new Date().toISOString() };
    store[appNumber] = appStore;
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(store));
  } catch {}
}

// --- Docket events sidebar --------------------------------------------------

type DocketEvent = {
  key: string;
  code: string;
  date: string;
  label: string;
  badge: string;
};

const EVENT_SHORT_LABEL: Record<string, string> = {
  "APP.FILE.REC": "Application filed",
  CTNF: "Non-Final",
  CTFR: "Final rejection",
  CTAV: "Advisory",
  CTRS: "Restriction",
  RCEX: "RCE",
  NOA: "Notice of allowance",
  "ISSUE.NTF": "Issue notice",
  "NTC.PUB": "Publication",
  ABN: "Abandonment",
};

const EVENT_SHORT_BADGE: Record<string, string> = {
  "APP.FILE.REC": "FILE",
  "ISSUE.NTF": "ISSU",
  "NTC.PUB": "PUB",
};

function buildDocketEvents(txs: Transaction[]): DocketEvent[] {
  const asc = txs
    .filter((t) => DOCKETABLE.includes(t.code))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const counts: Record<string, number> = {};
  return asc.map((t) => {
    counts[t.code] = (counts[t.code] ?? 0) + 1;
    const base = EVENT_SHORT_LABEL[t.code] ?? EVENT_LABELS[t.code] ?? t.code;
    // Application filed / abandonment are typically one-shot; drop the "#N".
    const singleShot = t.code === "APP.FILE.REC";
    const label = singleShot ? base : `${base} #${counts[t.code]}`;
    const badge = EVENT_SHORT_BADGE[t.code] ?? t.code;
    return { key: `${t.code}|${t.date}`, code: t.code, date: t.date, label, badge };
  });
}

function DocketEventsCard({
  events,
  appNumber,
  activeKey,
  onSelect,
}: {
  events: DocketEvent[];
  appNumber: string;
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Read persisted done state so the sidebar reflects progress in real time.
  // We deliberately re-read on every render — the store is tiny and this
  // avoids stale status right after a checkbox toggle.
  const statusFor = (key: string, code: string) => {
    const doneIds = loadProjectDone(appNumber, key);
    const total = (TASKS_BY_EVENT[code] ?? []).length;
    if (!total) {
      return { text: "No tasks defined", tone: "muted" as const, ratio: null };
    }
    const done = doneIds.length;
    if (done === 0) return { text: "No project yet", tone: "idle" as const, ratio: null };
    if (done >= total)
      return { text: "Project complete", tone: "done" as const, ratio: null };
    return {
      text: `Project open · ${done}/${total}`,
      tone: "open" as const,
      ratio: done / total,
    };
  };

  const activeEvent = events.find((ev) => ev.key === activeKey) ?? events[events.length - 1];
  const hasMore = events.length > 1;

  const renderEvent = (ev: DocketEvent, isActive: boolean) => {
    const status = statusFor(ev.key, ev.code);
    const dot =
      status.tone === "done"
        ? "bg-emerald-400"
        : status.tone === "open"
          ? "bg-blue-400"
          : status.tone === "idle"
            ? "bg-zinc-500"
            : "bg-zinc-600";
    return (
      <button
        key={ev.key}
        onClick={() => onSelect(ev.key)}
        className={`group w-full text-left rounded-lg border p-2 flex items-start gap-2.5 transition ${
          isActive
            ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40"
            : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
        }`}
      >
        <span
          className={`mt-0.5 inline-flex items-center justify-center w-12 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0 ${eventColor(ev.code).bg} ${eventColor(ev.code).text} ${eventColor(ev.code).border}`}
        >
          {ev.badge}
        </span>
        <span className="flex-1 min-w-0 leading-tight">
          <div className={`text-[11px] font-semibold truncate ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>
            {ev.label}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            {ev.date}
            {isActive && <span className="ml-1 text-blue-300">· active</span>}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
            <span
              className={`text-[10px] ${
                status.tone === "done"
                  ? "text-emerald-300"
                  : status.tone === "open"
                    ? "text-blue-300"
                    : "text-zinc-500"
              }`}
            >
              {status.text}
            </span>
          </div>
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-zinc-100 px-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
            Docket events
          </h3>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition"
            aria-expanded={expanded}
          >
            {expanded ? "View less" : "View more"}
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {events.length === 0 && (
          <p className="text-[11px] text-zinc-500 px-1">
            No docket events yet.
          </p>
        )}

        {activeEvent && renderEvent(activeEvent, true)}

        {hasMore && (
          <motion.div
            initial={false}
            animate={{
              height: expanded ? "auto" : 0,
              opacity: expanded ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin pr-0.5 space-y-1.5 pt-1.5">
              {events
                .filter((ev) => ev.key !== activeEvent?.key)
                .map((ev) => renderEvent(ev, false))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function loadContacts(clientName: string): Contact[] {
  const defaults: Contact[] = [
    { name: "S. Reyes", email: "s.reyes@fenixai.law" },
    { name: "M. Kim", email: "m.kim@fenixai.law" },
    { name: "J. Lee", email: "j.lee@fenixai.law" },
    { name: `${clientName} IP Team`, email: "ip@client.com" },
  ];
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Contact[];
    // merge with defaults by name
    const map = new Map(defaults.map((c) => [c.name, c] as const));
    for (const c of parsed) map.set(c.name, c);
    return Array.from(map.values());
  } catch {
    return defaults;
  }
}

function saveContacts(list: Contact[]) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(list));
  } catch {}
}

function ReassignPicker({
  current,
  contacts,
  onPick,
  onAdd,
  onClose,
  align = "left",
}: {
  current: string | null;
  contacts: Contact[];
  onPick: (name: string | null) => void;
  onAdd: (c: Contact) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase()),
  );

  const submitAdd = (e: FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;
    const name = (newName.trim() || guessNameFromEmail(email)).trim();
    if (!name) return;
    onAdd({ name, email });
    onPick(name);
  };

  const handleEmailChange = (v: string) => {
    setNewEmail(v);
    if (!nameTouched) setNewName(guessNameFromEmail(v));
  };

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-30 top-full mt-1 ${align === "right" ? "right-0" : "left-0"} w-72 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl`}
    >
      <div className="p-2 border-b border-zinc-800">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Email contacts…"
          className="w-full h-8 px-2 rounded bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-zinc-600"
        />
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {filtered.map((c) => {
          const active = c.name === current;
          return (
            <button
              key={c.name + c.email}
              onClick={() => onPick(c.name)}
              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 ${active ? "bg-zinc-800/60" : ""}`}
            >
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold text-white bg-zinc-700">
                {c.name.split(/[ .]+/).map((s) => s[0]).slice(0, 2).join("")}
              </span>
              <span className="flex-1 min-w-0">
                <div className="text-xs text-zinc-200 truncate">{c.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{c.email}</div>
              </span>
              {active && <span className="text-teal-400 text-xs">✓</span>}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-zinc-500 text-center">
            No matching contacts
          </div>
        )}
        {current && (
          <button
            onClick={() => onPick(null)}
            className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-500 hover:text-red-300 hover:bg-red-950/30"
          >
            Unassign
          </button>
        )}
      </div>
      <div className="border-t border-zinc-800 p-2">
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full text-xs text-zinc-300 hover:text-white text-left px-1"
          >
            + Add contact from Email
          </button>
        ) : (
          <form onSubmit={submitAdd} className="space-y-1.5">
            <input
              autoFocus
              value={newEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Email address"
              type="email"
              className="w-full h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono focus:outline-none focus:border-zinc-600"
            />
            {newEmail.includes("@") && (
              <div>
                <div className="text-[10px] text-zinc-500 mb-0.5">
                  Suggested name (editable)
                </div>
                <input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNameTouched(true);
                  }}
                  placeholder="Name"
                  className="w-full h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
            )}
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="h-7 px-2 rounded bg-zinc-100 text-zinc-950 text-[11px] font-semibold hover:bg-white"
              >
                Add & assign
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="h-7 px-2 rounded border border-zinc-700 text-[11px] text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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

export function Workspace({ app, onChangeApp }: { app: AppData; onChangeApp: (next?: string) => void }) {
  const autoDetected = useMemo(() => detectEvent(app.transactions), [app]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [appInput, setAppInput] = useState(app.appNumber);

  useEffect(() => {
    setAppInput(app.appNumber);
  }, [app.appNumber]);

  // Reset the pinned event whenever the application changes.
  useEffect(() => {
    setSelectedKey(null);
  }, [app.appNumber]);

  const detected = useMemo(() => {
    if (!selectedKey) return autoDetected;
    const [c, d] = selectedKey.split("|");
    return (
      app.transactions.find((t) => t.code === c && t.date === d) ?? autoDetected
    );
  }, [selectedKey, autoDetected, app.transactions]);
  const code = detected?.code ?? "";
  const activeKey = detected ? `${detected.code}|${detected.date}` : "";
  const [tab, setTab] = useState<Tab>("workflow");
  const [tasks, setTasks] = useState<Task[]>(() => (TASKS_BY_EVENT[code] ?? []).map((t) => ({ ...t })));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ tool: string; task: Task } | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const { toast } = useToast();
  const { contacts: googleContacts, directory: googleDirectory } =
    useGoogleContacts();
  const { profiles: orgProfiles } = useOrgSuggestions();

  useEffect(() => {
    setContacts(loadContacts(app.assignee));
  }, [app.assignee]);

  // Merge all assignee sources, deduped by lowercased email. Later sources
  // fill in gaps but never overwrite an existing entry (which is more likely
  // to have a real display name from the user or Workspace directory).
  const mergedContacts = useMemo(() => {
    const byEmail = new Map<string, Contact>();
    const add = (list: Contact[]) => {
      for (const c of list) {
        const key = c.email.toLowerCase();
        if (!byEmail.has(key)) byEmail.set(key, c);
      }
    };
    add(contacts);
    add(googleDirectory); // coworkers from Google Workspace
    add(orgProfiles); // coworkers who signed into this app
    add(googleContacts); // personal Google contacts
    return Array.from(byEmail.values());
  }, [contacts, googleContacts, googleDirectory, orgProfiles]);

  const addContact = (c: Contact) => {
    setContacts((prev) => {
      const next = prev.some((p) => p.name === c.name) ? prev : [...prev, c];
      saveContacts(next);
      return next;
    });
  };

  const reassign = (id: string, name: string | null) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, assignee: name } : t)));
    setReassigning(null);
    if (!name) return;
    const task = tasks.find((t) => t.id === id);
    const contact = mergedContacts.find((c) => c.name === name);
    if (!task || !contact) return;
    const eventPayload = detected
      ? {
          code: detected.code,
          label: EVENT_LABELS[detected.code] ?? detected.code,
          date: detected.date,
        }
      : null;
    toast({
      title: `Notifying ${name}…`,
      description: contact.email,
    });
    notifyAssignment({
      data: {
        to: contact.email,
        toName: contact.name,
        origin:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://fenixai.app",
        task: {
          title: task.title,
          description: task.description,
          tag: task.tag,
          tools: task.tools,
        },
        app: {
          appNumber: app.appNumber,
          title: app.title,
          assignee: app.assignee,
        },
        event: eventPayload,
      },
    })
      .then((r) =>
        toast({
          title: "Email sent",
          description: `Notified ${name} at ${contact.email}`,
        }),
      )
      .catch((err: Error) =>
        toast({
          title: "Email failed",
          description: err.message,
          variant: "destructive",
        }),
      );
  };

  // reset state on app change
  useEffect(() => {
    setTab("workflow");
    const base = (TASKS_BY_EVENT[code] ?? []).map((t) => ({ ...t }));
    // Merge deadline overrides saved from /template
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("fenixai.templates.v1");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<
            string,
            { tasks: Task[] }
          >;
          const overrideTasks = parsed?.[code]?.tasks;
          if (Array.isArray(overrideTasks)) {
            const byId = new Map(overrideTasks.map((t) => [t.id, t]));
            for (const t of base) {
              const o = byId.get(t.id);
              if (o?.deadline) t.deadline = o.deadline;
            }
          }
        }
      }
    } catch {}
    // Merge persisted "done" state for this (app, docket event)
    try {
      const doneIds = loadProjectDone(app.appNumber, activeKey);
      if (doneIds.length) {
        const doneSet = new Set(doneIds);
        for (const t of base) t.done = doneSet.has(t.id);
      }
    } catch {}
    setTasks(base);
    setExpanded(null);
    setPanel(null);
  }, [app.appNumber, code, activeKey]);

  // Persist "done" state per (app, docket event) so status shows in the sidebar.
  useEffect(() => {
    if (!activeKey) return;
    const doneIds = tasks.filter((t) => t.done).map((t) => t.id);
    saveProjectDone(app.appNumber, activeKey, doneIds);
  }, [tasks, app.appNumber, activeKey]);

  const docketEvents = useMemo(
    () => buildDocketEvents(app.transactions),
    [app.transactions],
  );

  const anchorDate = useMemo(
    () => (detected ? getMailDate(detected, app.transactions) : undefined),
    [detected, app.transactions],
  );
  const hardDeadline = useMemo(() => {
    if (!anchorDate) return undefined;
    const months = code === "NOA" || code === "ISSUE.NTF" ? 3 : 6;
    const d = new Date(anchorDate);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }, [anchorDate, code]);

  const c = eventColor(code);
  const banner = statusBanner(code, app);
  const done = tasks.filter((t) => t.done).length;

  const toggleTask = (id: string) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <SidebarProvider className="bg-zinc-950">
      <div className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => onChangeApp("")} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">F</div>
            <span className="font-semibold tracking-tight">FenixAI</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Demo</span>
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = appInput.trim();
              if (v && v !== app.appNumber) onChangeApp(v);
            }}
            className="flex-1 flex items-center gap-2 max-w-2xl mx-auto"
          >
            <input
              value={appInput}
              onChange={(e) => setAppInput(e.target.value)}
              placeholder="Enter application number"
              className="flex-1 font-mono text-xs px-3 h-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white"
            >
              Open
            </button>
          </form>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-zinc-500">{app.matter}</span>
            {detected && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                <span>{EVENT_ICONS[code] ?? "●"}</span> {code}
              </span>
            )}
            <UserMenu />
          </div>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <Sidebar collapsible="none" className="h-full w-[260px] shrink-0 border-r border-zinc-800 bg-zinc-950 text-zinc-100">
            <SidebarHeader className="p-3 border-b border-zinc-800">
              <Card
                onClick={() => setTab("overview")}
                className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-100 p-3 hover:border-zinc-600 hover:bg-zinc-900/60 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-zinc-100">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold">Application info</h3>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition" />
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="text-xs font-semibold leading-snug line-clamp-2">{app.title}</div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                      {EVENT_ICONS[code] ?? "●"} {code}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{app.assignee}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{app.inventors}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">Art Unit {app.artUnit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{app.examiner}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition">
                  View more <ChevronRight className="h-3 w-3" />
                </div>
              </Card>
            </SidebarHeader>

            <SidebarContent className="p-2">
              <SidebarMenu>
                {NAV.map(({ id, label, Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      onClick={() => setTab(id)}
                      isActive={tab === id}
                      className={`h-9 text-xs rounded-md border-l-2 transition ${
                        tab === id
                          ? "bg-zinc-900 border-zinc-300 text-zinc-100"
                          : "border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-3 border-t border-zinc-800">
              <DocketEventsCard
                events={docketEvents}
                appNumber={app.appNumber}
                activeKey={activeKey}
                onSelect={(key) => {
                  setSelectedKey(key);
                  setTab("workflow");
                }}
              />
            </SidebarFooter>
          </Sidebar>

          {/* Main */}
          <main className="flex-1 min-w-0 overflow-y-auto relative bg-zinc-950">
            <div className="p-6 w-full">
              {detected && (
                <Card
                  className={`mb-5 rounded-xl border ${c.border} ${c.tint} p-4 flex items-start gap-3`}
                >
                  <RefreshCw className={`h-4 w-4 mt-0.5 shrink-0 ${c.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${c.text}`}>
                      {banner.msg}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {banner.sub}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[11px] font-medium shrink-0 ${
                      banner.chipUrgent
                        ? "bg-red-500/20 text-red-200 border-red-500/40"
                        : `${c.chip}`
                    }`}
                  >
                    {banner.chip}
                  </Badge>
                </Card>
              )}
              {(tab === "overview" || tab === "history") && (
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTab("workflow")}
                    className="text-zinc-400 hover:text-zinc-100 -ml-2"
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90 mr-1" /> Back to workflow
                  </Button>
                </div>
              )}
              {tab === "workflow" && (
                <WorkflowTab
                  code={code}
                  tasks={tasks}
                  done={done}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  toggleTask={toggleTask}
                  openTool={(tool, task) => setPanel({ tool, task })}
                  contacts={mergedContacts}
                  reassigning={reassigning}
                  setReassigning={setReassigning}
                  onReassign={reassign}
                  onAddContact={addContact}
                  anchorDate={anchorDate}
                  hardDeadline={hardDeadline}
                  appNumber={app.appNumber}
                />
              )}
              {tab === "automation" && (
                <AutomationTab app={app} code={code} />
              )}
              {tab === "project" && (
                <ProjectTab
                  code={code}
                  tasks={tasks}
                  toggleTask={toggleTask}
                  contacts={mergedContacts}
                  reassigning={reassigning}
                  setReassigning={setReassigning}
                  onReassign={reassign}
                  onAddContact={addContact}
                />
              )}
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
    </SidebarProvider>
  );
}

// --- Workflow tab ---
function computeDeadline(
  task: Task,
  anchorDate?: string,
  hardDeadline?: string,
): { date: string; formula: string } | null {
  if (!task.deadline) return null;
  const { basis, days } = task.deadline;
  const anchor = basis === "creation" ? anchorDate : hardDeadline;
  if (!anchor) return null;
  const d = new Date(anchor);
  d.setDate(d.getDate() + (basis === "creation" ? days : -days));
  const iso = d.toISOString().slice(0, 10);
  const formula =
    basis === "creation"
      ? `Mail date + ${days}d`
      : `Hard deadline − ${days}d`;
  return { date: iso, formula };
}

function DeadlineBadge({
  task,
  anchorDate,
  hardDeadline,
}: {
  task: Task;
  anchorDate?: string;
  hardDeadline?: string;
}) {
  if (!task.deadline) return null;
  const computed = computeDeadline(task, anchorDate, hardDeadline);
  const label = computed
    ? computed.date
    : task.deadline.basis === "creation"
      ? `+${task.deadline.days}d`
      : `−${task.deadline.days}d`;
  const tooltip = computed
    ? computed.formula
    : task.deadline.basis === "creation"
      ? `Creation date + ${task.deadline.days} days`
      : `Hard deadline − ${task.deadline.days} days`;
  const overdue =
    computed && new Date(computed.date).getTime() < Date.now();
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
        overdue
          ? "border-red-500/50 bg-red-500/15 text-red-200"
          : "border-zinc-700 bg-zinc-800/60 text-zinc-300"
      }`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

function WorkflowTab({
  code,
  tasks,
  done,
  expanded,
  setExpanded,
  toggleTask,
  openTool,
  contacts,
  reassigning,
  setReassigning,
  onReassign,
  onAddContact,
  anchorDate,
  hardDeadline,
  appNumber,
}: {
  code: string;
  tasks: Task[];
  done: number;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  toggleTask: (id: string) => void;
  openTool: (tool: string, t: Task) => void;
  contacts: Contact[];
  reassigning: string | null;
  setReassigning: (id: string | null) => void;
  onReassign: (id: string, name: string | null) => void;
  onAddContact: (c: Contact) => void;
  anchorDate?: string;
  hardDeadline?: string;
  appNumber?: string;
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
        {tasks.map((t, i) => {
          const isExp = expanded === t.id;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card
                className={`rounded-xl border bg-zinc-900/50 text-zinc-100 transition-colors ${
                  isExp
                    ? "border-blue-500 ring-1 ring-blue-500/40"
                    : "border-zinc-800"
                } ${t.done ? "opacity-60" : ""}`}
              >
                <div
                  className="p-3 flex gap-3 items-start cursor-pointer"
                  onClick={() => setExpanded(isExp ? null : t.id)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(t.id);
                    }}
                    className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                      t.done
                        ? "bg-teal-500 border-teal-500 text-white"
                        : "border-zinc-600 hover:border-zinc-400 bg-transparent"
                    }`}
                    aria-pressed={t.done}
                  >
                    {t.done && <span className="text-[9px] leading-none">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`text-sm font-medium ${
                          t.done ? "line-through text-zinc-500" : ""
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <DeadlineBadge
                          task={t}
                          anchorDate={anchorDate}
                          hardDeadline={hardDeadline}
                        />
                        <TagBadge tag={t.tag} />
                        <motion.span
                          animate={{ rotate: isExp ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-zinc-500 inline-flex"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {t.description}
                    </div>
                    <div
                      className="mt-2 flex items-center gap-2 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassigning(reassigning === t.id ? null : t.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full hover:bg-zinc-800/60 px-1 py-0.5 transition"
                      >
                        <Avatar name={t.assignee} />
                        {!t.done && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
                            {t.assignee ? "reassign" : "+ assign"}
                          </span>
                        )}
                      </button>
                      {reassigning === t.id && (
                        <ReassignPicker
                          current={t.assignee}
                          contacts={contacts}
                          onPick={(name) => onReassign(t.id, name)}
                          onAdd={onAddContact}
                          onClose={() => setReassigning(null)}
                        />
                      )}
                      <Sheet>
                        <SheetTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 inline-flex items-center gap-1"
                          >
                            Open details →
                          </button>
                        </SheetTrigger>
                        <SheetContent
                          side="right"
                          className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SheetHeader>
                            <SheetTitle className="text-zinc-100 text-base">
                              Task details
                            </SheetTitle>
                          </SheetHeader>
                          <div className="mt-4">
                            <TaskDetailPanel
                              taskId={t.id}
                              app={appNumber}
                              event={code}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {isExp && t.tools.length > 0 && (
                    <motion.div
                      key="tools"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-2 border-t border-zinc-800">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                          Tools for this step
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {t.tools.map((tool) => (
                            <Button
                              key={tool}
                              variant="outline"
                              size="sm"
                              onClick={() => openTool(tool, t)}
                              className="h-7 rounded-md border-zinc-700 bg-zinc-900 text-xs hover:bg-zinc-800 hover:border-zinc-600"
                            >
                              {tool}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
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
}: {
  app: AppData;
  code: string;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
      {/* Step 1 — Detected event card */}
      {winner && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={1} />
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

      {/* Step 2 — Email */}
      {emailOpen && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={2} />
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

      {/* Step 3 — Forms */}
      {formsOpen && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-3">
            <StepNum n={3} />
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
function ProjectTab({
  code,
  tasks,
  toggleTask,
  contacts,
  reassigning,
  setReassigning,
  onReassign,
  onAddContact,
}: {
  code: string;
  tasks: Task[];
  toggleTask: (id: string) => void;
  contacts: Contact[];
  reassigning: string | null;
  setReassigning: (id: string | null) => void;
  onReassign: (id: string, name: string | null) => void;
  onAddContact: (c: Contact) => void;
}) {
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
                      <div className="mt-2 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReassigning(reassigning === t.id ? null : t.id);
                          }}
                          className="inline-flex items-center rounded-full hover:bg-zinc-800/60 px-1 py-0.5 transition"
                        >
                          <Avatar name={t.assignee} />
                        </button>
                        {reassigning === t.id && (
                          <ReassignPicker
                            current={t.assignee}
                            contacts={contacts}
                            onPick={(name) => onReassign(t.id, name)}
                            onAdd={onAddContact}
                            onClose={() => setReassigning(null)}
                          />
                        )}
                      </div>
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
  const m = app.meta ?? {};
  const str = (v: unknown) =>
    v === null || v === undefined || v === "" ? undefined : String(v);

  const fields: [string, string | undefined, boolean?][] = [
    ["Application number", app.appNumber, true],
    ["Confirmation #", str(m.confirmationNumber), true],
    ["Title", app.title],
    ["Status", str(m.status) ?? "—"],
    ["Status date", str(m.statusDate), true],
    ["Application type", str(m.applicationType)],
    ["Assignee / Applicant", app.assignee],
    ["Inventors", app.inventors],
    ["Examiner", app.examiner],
    ["Art Unit", app.artUnit, true],
    ["Class / Subclass", [str(m.class), str(m.subclass)].filter(Boolean).join(" / ") || undefined, true],
    ["Entity status", str(m.entityStatus)],
    ["Customer #", str(m.customer), true],
    ["Matter number", app.matter, true],
    ["Filing date", app.filingDate, true],
    ["Publication #", str(m.publicationNumber), true],
    ["Publication date", str(m.publicationDate), true],
    ["Patent #", str(m.patentNumber), true],
    ["Grant date", str(m.grantDate), true],
  ];

  const docs = app.documents ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Application details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {fields
            .filter(([, v]) => v !== undefined)
            .map(([label, val, mono]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {label}
                </div>
                <div
                  className={`mt-1 text-sm font-medium text-zinc-100 break-words ${
                    mono ? "font-mono" : ""
                  }`}
                >
                  {val}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500">
            Documents{docs.length ? ` (${docs.length})` : ""}
          </h3>
          <span className="text-[10px] text-zinc-600">
            Live from USPTO ODP — click to open PDF
          </span>
        </div>
        {docs.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
            No documents available for this application.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {docs.map((d) => {
                const href = d.downloadUrl
                  ? `/api/uspto-download?url=${encodeURIComponent(d.downloadUrl)}`
                  : undefined;
                const Row = (
                  <div className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-zinc-900/60 transition">
                    <span className="inline-flex items-center justify-center w-14 py-0.5 rounded text-[10px] font-mono font-semibold border border-zinc-700 bg-zinc-900 text-zinc-300 shrink-0">
                      {d.documentCode || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-200 truncate">{d.description}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {d.officialDate}
                        {d.direction ? ` · ${d.direction}` : ""}
                        {d.pageCount ? ` · ${d.pageCount} pp.` : ""}
                      </div>
                    </div>
                    <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  </div>
                );
                return href ? (
                  <a
                    key={d.documentIdentifier || `${d.documentCode}-${d.officialDate}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    {Row}
                  </a>
                ) : (
                  <div
                    key={d.documentIdentifier || `${d.documentCode}-${d.officialDate}`}
                    className="opacity-70"
                  >
                    {Row}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Transactions ({app.transactions.length})
        </h3>
        {app.transactions.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
            No transactions available for this application.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {[...app.transactions]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((t) => {
                  const c = eventColor(t.code);
                  return (
                    <div
                      key={`${t.code}-${t.date}`}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-zinc-900/40 transition"
                    >
                      <CodeBadge code={t.code} />
                      <span className="flex-1 text-zinc-300 truncate">
                        {t.description}
                      </span>
                      <span className="font-mono text-zinc-500 shrink-0">{t.date}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </section>
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