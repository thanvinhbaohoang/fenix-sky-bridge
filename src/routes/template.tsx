import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DOCKETABLE,
  EVENT_LABELS,
  EVENT_ICONS,
  FORMS_BY_EVENT,
  TASKS_BY_EVENT,
  eventColor,
  type Task,
} from "@/components/demo/data";

export const Route = createFileRoute("/template")({
  head: () => ({
    meta: [
      { title: "Templates — FenixAI" },
      {
        name: "description",
        content:
          "Edit the tasks, tools, and suggested forms tied to each docketable USPTO event.",
      },
    ],
  }),
  component: TemplatePage,
});

type Form = { name: string; ref: string };
type TemplateState = Record<
  string,
  { tasks: Task[]; forms: Form[] }
>;

const STORAGE_KEY = "fenixai.templates.v1";

function buildDefaults(): TemplateState {
  const out: TemplateState = {};
  for (const code of DOCKETABLE) {
    out[code] = {
      tasks: (TASKS_BY_EVENT[code] ?? []).map((t) => ({ ...t, tools: [...t.tools] })),
      forms: (FORMS_BY_EVENT[code] ?? []).map((f) => ({ ...f })),
    };
  }
  return out;
}

function TemplatePage() {
  const [state, setState] = useState<TemplateState>(() => buildDefaults());
  const [selected, setSelected] = useState<string>(DOCKETABLE[0]);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TemplateState;
        const defaults = buildDefaults();
        // Merge in case new events were added since save
        const merged: TemplateState = { ...defaults, ...parsed };
        setState(merged);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setDirty(false);
  };

  const resetAll = () => {
    if (!confirm("Reset all templates to defaults? This clears your edits.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(buildDefaults());
    setDirty(false);
  };

  const resetOne = () => {
    if (!confirm(`Reset ${selected} template to defaults?`)) return;
    const defaults = buildDefaults();
    setState((s) => ({ ...s, [selected]: defaults[selected] }));
    setDirty(true);
  };

  const bucket = state[selected] ?? { tasks: [], forms: [] };

  const patchBucket = (
    fn: (b: { tasks: Task[]; forms: Form[] }) => { tasks: Task[]; forms: Form[] },
  ) => {
    setState((s) => ({ ...s, [selected]: fn(s[selected]) }));
    setDirty(true);
  };

  const updateTask = (idx: number, patch: Partial<Task>) =>
    patchBucket((b) => {
      const tasks = b.tasks.map((t, i) => (i === idx ? { ...t, ...patch } : t));
      return { ...b, tasks };
    });

  const removeTask = (idx: number) =>
    patchBucket((b) => ({ ...b, tasks: b.tasks.filter((_, i) => i !== idx) }));

  const addTask = () =>
    patchBucket((b) => ({
      ...b,
      tasks: [
        ...b.tasks,
        {
          id: `t-${Date.now()}`,
          title: "New task",
          description: "",
          tag: "action",
          assignee: null,
          tools: [],
        },
      ],
    }));

  const moveTask = (idx: number, dir: -1 | 1) =>
    patchBucket((b) => {
      const next = [...b.tasks];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return b;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...b, tasks: next };
    });

  const updateForm = (idx: number, patch: Partial<Form>) =>
    patchBucket((b) => {
      const forms = b.forms.map((f, i) => (i === idx ? { ...f, ...patch } : f));
      return { ...b, forms };
    });

  const removeForm = (idx: number) =>
    patchBucket((b) => ({ ...b, forms: b.forms.filter((_, i) => i !== idx) }));

  const addForm = () =>
    patchBucket((b) => ({
      ...b,
      forms: [...b.forms, { name: "New form", ref: "" }],
    }));

  const color = eventColor(selected);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const k of DOCKETABLE) c[k] = state[k]?.tasks.length ?? 0;
    return c;
  }, [state]);

  if (!hydrated) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3">
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
          F
        </div>
        <span className="font-semibold tracking-tight">FenixAI</span>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Templates
        </span>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-300">Unsaved changes</span>
          )}
          <button
            onClick={resetAll}
            className="h-8 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Reset all
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className="h-8 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="w-[240px] border-r border-zinc-800 p-3 space-y-1 min-h-[calc(100vh-56px)]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 pb-2">
            Docketable events
          </div>
          {DOCKETABLE.map((code) => {
            const active = code === selected;
            return (
              <button
                key={code}
                onClick={() => setSelected(code)}
                className={`w-full text-left px-2 py-2 rounded flex items-center gap-2 text-sm transition ${
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className="w-5 text-center">{EVENT_ICONS[code] ?? "•"}</span>
                <span className="flex-1 truncate">
                  <span className="font-mono text-[11px] text-zinc-500 mr-1.5">
                    {code}
                  </span>
                  {EVENT_LABELS[code] ?? code}
                </span>
                <span className="text-[10px] text-zinc-500 tabular-nums">
                  {counts[code]}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 p-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded border text-xs ${color.chip}`}
            >
              <span>{EVENT_ICONS[selected]}</span>
              <span className="font-mono">{selected}</span>
            </div>
            <h1 className="text-lg font-semibold">
              {EVENT_LABELS[selected] ?? selected}
            </h1>
            <button
              onClick={resetOne}
              className="ml-auto text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              Reset this template
            </button>
          </div>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-200">Tasks</h2>
              <button
                onClick={addTask}
                className="h-8 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                + Add task
              </button>
            </div>
            <div className="space-y-3">
              {bucket.tasks.length === 0 && (
                <div className="text-xs text-zinc-500 border border-dashed border-zinc-800 rounded p-4">
                  No tasks yet.
                </div>
              )}
              {bucket.tasks.map((t, idx) => (
                <TaskEditor
                  key={t.id}
                  task={t}
                  onChange={(patch) => updateTask(idx, patch)}
                  onRemove={() => removeTask(idx)}
                  onUp={() => moveTask(idx, -1)}
                  onDown={() => moveTask(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === bucket.tasks.length - 1}
                />
              ))}
            </div>
          </section>

          <section className="mb-16">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Suggested forms
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Forms auto-suggested when a project opens for this event.
                </p>
              </div>
              <button
                onClick={addForm}
                className="h-8 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                + Add form
              </button>
            </div>
            <div className="space-y-2">
              {bucket.forms.length === 0 && (
                <div className="text-xs text-zinc-500 border border-dashed border-zinc-800 rounded p-4">
                  No forms yet.
                </div>
              )}
              {bucket.forms.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 border border-zinc-800 rounded-md p-2 bg-zinc-900/40"
                >
                  <input
                    value={f.name}
                    onChange={(e) => updateForm(idx, { name: e.target.value })}
                    placeholder="Form name"
                    className="flex-1 h-8 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
                  />
                  <input
                    value={f.ref}
                    onChange={(e) => updateForm(idx, { ref: e.target.value })}
                    placeholder="Reference (e.g. 37 CFR 1.111)"
                    className="w-64 h-8 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-zinc-600"
                  />
                  <button
                    onClick={() => removeForm(idx)}
                    className="h-8 px-2 rounded text-xs text-zinc-500 hover:text-red-300 hover:bg-red-950/30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  onChange,
  onRemove,
  onUp,
  onDown,
  isFirst,
  isLast,
}: {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [toolInput, setToolInput] = useState("");

  const addTool = () => {
    const v = toolInput.trim();
    if (!v) return;
    if (task.tools.includes(v)) {
      setToolInput("");
      return;
    }
    onChange({ tools: [...task.tools, v] });
    setToolInput("");
  };

  const removeTool = (t: string) =>
    onChange({ tools: task.tools.filter((x) => x !== t) });

  const tagColor =
    task.tag === "urgent"
      ? "bg-red-500/20 text-red-200 border-red-500/40"
      : task.tag === "action"
        ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
        : "bg-zinc-700/40 text-zinc-300 border-zinc-600";

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1">
          <button
            onClick={onUp}
            disabled={isFirst}
            className="h-5 w-5 text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
            title="Move up"
          >
            ▲
          </button>
          <button
            onClick={onDown}
            disabled={isLast}
            className="h-5 w-5 text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
            title="Move down"
          >
            ▼
          </button>
        </div>
        <input
          value={task.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Task title"
          className="flex-1 h-9 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm font-medium focus:outline-none focus:border-zinc-600"
        />
        <select
          value={task.tag}
          onChange={(e) => onChange({ tag: e.target.value as Task["tag"] })}
          className={`h-9 px-2 rounded text-xs font-medium border ${tagColor} focus:outline-none`}
        >
          <option value="urgent">urgent</option>
          <option value="action">action</option>
          <option value="optional">optional</option>
        </select>
        <button
          onClick={onRemove}
          className="h-9 px-2 rounded text-xs text-zinc-500 hover:text-red-300 hover:bg-red-950/30"
        >
          Delete
        </button>
      </div>

      <textarea
        value={task.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description"
        rows={2}
        className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 resize-y"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-zinc-500 space-y-1">
          Assignee
          <input
            value={task.assignee ?? ""}
            onChange={(e) =>
              onChange({ assignee: e.target.value.trim() || null })
            }
            placeholder="e.g. S. Reyes"
            className="w-full h-8 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
          />
        </label>
      </div>

      <div>
        <div className="text-xs text-zinc-500 mb-1.5">Suggested tools</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {task.tools.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-200"
            >
              {t}
              <button
                onClick={() => removeTool(t)}
                className="text-zinc-500 hover:text-red-300"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
          {task.tools.length === 0 && (
            <span className="text-xs text-zinc-600 italic">No tools</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={toolInput}
            onChange={(e) => setToolInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTool();
              }
            }}
            placeholder="Add tool (e.g. Email client)"
            className="flex-1 h-8 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={addTool}
            className="h-8 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}