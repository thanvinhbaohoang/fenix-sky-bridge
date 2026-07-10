import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  TASKS_BY_EVENT,
  EVENT_LABELS,
  EVENT_ICONS,
  eventColor,
  type Task,
} from "@/components/demo/data";
import {
  MessageSquare,
  Paperclip,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
  RotateCcw,
  Clock,
  ArrowLeft,
  Loader2,
  Download,
  Pencil,
  User as UserIcon,
} from "lucide-react";

const searchSchema = z.object({
  app: z.string().optional(),
  event: z.string().optional(),
});

export const Route = createFileRoute("/task/$id")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Task — FenixAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TaskDetailPage,
});

type ActivityKind =
  | "opened"
  | "reopened"
  | "closed"
  | "commented"
  | "status_changed"
  | "deadline_changed"
  | "assignee_changed"
  | "attachment_added"
  | "link_added"
  | "edited";

type Activity = {
  id: string;
  user_id: string;
  task_key: string;
  kind: ActivityKind;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { name: string | null; email: string | null; avatar: string | null };
};

type ResolvedTask = Task & { event?: string };

function loadTaskFromTemplates(event: string, taskId: string): ResolvedTask | null {
  const base = TASKS_BY_EVENT[event]?.find((t) => t.id === taskId);
  if (!base) return null;
  const clone: ResolvedTask = { ...base, tools: [...base.tools], event };
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("fenixai.templates.v1");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { tasks: Task[] }>;
        const override = parsed?.[event]?.tasks?.find((t) => t.id === taskId);
        if (override) Object.assign(clone, override, { event });
      }
    }
  } catch {}
  return clone;
}

function findEventForTask(taskId: string): string | undefined {
  for (const [ev, list] of Object.entries(TASKS_BY_EVENT)) {
    if (list.some((t) => t.id === taskId)) return ev;
  }
  return undefined;
}

function TaskDetailPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/task/$id" });
  const resolvedEvent = search.event ?? findEventForTask(id);
  const app = search.app;
  const taskKey = `${app ?? "_"}:${resolvedEvent ?? "_"}:${id}`;

  const task = useMemo(
    () => (resolvedEvent ? loadTaskFromTemplates(resolvedEvent, id) : null),
    [resolvedEvent, id],
  );

  const [session, setSession] = useState<{
    userId: string;
    email: string | null;
  } | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profileCache, setProfileCache] = useState<
    Record<string, { name: string | null; email: string | null; avatar: string | null }>
  >({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({
          userId: data.session.user.id,
          email: data.session.user.email ?? null,
        });
      } else {
        setSession(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setSession({ userId: s.user.id, email: s.user.email ?? null });
      else setSession(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadActivity = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_activity")
      .select("*")
      .eq("task_key", taskKey)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setActivity([]);
    } else {
      const rows = (data ?? []) as Activity[];
      setActivity(rows);
      const status = rows
        .filter((r) => r.kind === "opened" || r.kind === "closed" || r.kind === "reopened")
        .pop();
      setStatus(status?.kind === "closed" ? "closed" : "open");
      // fetch profiles for actors
      const missing = Array.from(
        new Set(rows.map((r) => r.user_id).filter((uid) => !profileCache[uid])),
      );
      if (missing.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", missing);
        if (profs) {
          setProfileCache((prev) => {
            const next = { ...prev };
            for (const p of profs) {
              next[p.id] = {
                name: p.full_name,
                email: p.email,
                avatar: p.avatar_url,
              };
            }
            return next;
          });
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, taskKey]);

  // Ensure "opened" event exists (first visitor logs the open)
  useEffect(() => {
    if (!session || loading) return;
    if (activity.length === 0 && task) {
      supabase
        .from("task_activity")
        .insert({
          user_id: session.userId,
          task_key: taskKey,
          kind: "opened",
          body: null,
          metadata: {
            title: task.title,
            event: resolvedEvent,
            app,
          },
        })
        .then(() => loadActivity());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, activity.length, task]);

  const requireAuth = () => {
    if (!session) {
      alert("Please sign in to comment or upload files.");
      return false;
    }
    return true;
  };

  const insertActivity = async (
    kind: ActivityKind,
    body: string | null,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!session) return;
    const { error } = await supabase.from("task_activity").insert({
      user_id: session.userId,
      task_key: taskKey,
      kind,
      body,
      metadata,
    });
    if (error) alert(error.message);
    else loadActivity();
  };

  const postComment = async () => {
    if (!requireAuth() || !comment.trim()) return;
    setSubmitting(true);
    await insertActivity("commented", comment.trim());
    setComment("");
    setSubmitting(false);
  };

  const toggleStatus = async () => {
    if (!requireAuth()) return;
    const next = status === "open" ? "closed" : "reopened";
    await insertActivity(next, null, { previous: status });
    setStatus(next === "closed" ? "closed" : "open");
  };

  const addLink = async () => {
    if (!requireAuth() || !linkUrl.trim()) return;
    try {
      new URL(linkUrl);
    } catch {
      alert("Invalid URL");
      return;
    }
    await insertActivity("link_added", linkLabel.trim() || null, {
      url: linkUrl.trim(),
      label: linkLabel.trim() || linkUrl.trim(),
    });
    setLinkUrl("");
    setLinkLabel("");
  };

  const uploadFile = async (file: File) => {
    if (!requireAuth() || !session) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("File too large (max 20 MB).");
      return;
    }
    setUploading(true);
    const path = `${session.userId}/${taskKey.replace(/[^a-zA-Z0-9-_./]/g, "_")}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("task-attachments")
      .upload(path, file, { upsert: false });
    if (error) {
      alert(error.message);
    } else {
      await insertActivity("attachment_added", file.name, {
        path,
        size: file.size,
        type: file.type,
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadAttachment = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(path, 60);
    if (error || !data) {
      alert(error?.message ?? "Could not open file");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const color = resolvedEvent ? eventColor(resolvedEvent) : eventColor("");
  const backHref = app
    ? `/project?app=${encodeURIComponent(app)}`
    : "/project";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3">
        <Link
          to="/project"
          search={app ? { app } : undefined}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-zinc-800" />
        <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
          F
        </div>
        <span className="font-semibold tracking-tight">FenixAI</span>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Task
        </span>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {!task ? (
          <div className="border border-zinc-800 rounded-lg p-6 bg-zinc-900/40 text-sm text-zinc-400">
            Task <span className="font-mono text-zinc-200">{id}</span> not found in the template library.
            <div className="mt-2 text-xs">
              Open it from a workflow to load its context, or return{" "}
              <Link to={backHref as any} className="underline text-zinc-200">
                to the project
              </Link>
              .
            </div>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="border border-zinc-800 rounded-xl bg-zinc-900/50 p-5">
              <div className="flex items-start gap-3">
                <button
                  onClick={toggleStatus}
                  disabled={!session}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                    status === "closed"
                      ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
                      : "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                  } ${!session ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"}`}
                  title={session ? "Toggle status" : "Sign in to change"}
                >
                  {status === "closed" ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5" /> Open
                    </>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold leading-snug">
                    {task.title}
                  </h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    {task.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {resolvedEvent && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${color.chip}`}
                      >
                        <span>{EVENT_ICONS[resolvedEvent] ?? "•"}</span>
                        <span className="font-mono">{resolvedEvent}</span>
                        <span className="opacity-70">
                          — {EVENT_LABELS[resolvedEvent] ?? resolvedEvent}
                        </span>
                      </span>
                    )}
                    {app && (
                      <span className="font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                        {app}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3" /> {task.assignee}
                      </span>
                    )}
                    {task.deadline && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.deadline.basis === "creation"
                          ? `Mail + ${task.deadline.days}d`
                          : `Hard deadline − ${task.deadline.days}d`}
                      </span>
                    )}
                  </div>
                  {task.tools.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {task.tools.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">
                Activity
              </h2>
              {loading ? (
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : activity.length === 0 ? (
                <div className="text-xs text-zinc-500 border border-dashed border-zinc-800 rounded p-4">
                  No activity yet.
                </div>
              ) : (
                <ol className="relative border-l border-zinc-800 ml-3 space-y-4 pl-6">
                  {activity.map((a) => (
                    <ActivityItem
                      key={a.id}
                      activity={a}
                      actor={profileCache[a.user_id]}
                      onDownload={downloadAttachment}
                    />
                  ))}
                </ol>
              )}
            </section>

            {/* Composer */}
            {session ? (
              <section className="space-y-4">
                <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400">
                    <MessageSquare className="h-3.5 w-3.5" /> Add a comment
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment…"
                    rows={3}
                    maxLength={2000}
                    className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 resize-y"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={postComment}
                      disabled={submitting || !comment.trim()}
                      className="h-8 px-3 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-white disabled:opacity-50"
                    >
                      {submitting ? "Posting…" : "Comment"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400">
                      <LinkIcon className="h-3.5 w-3.5" /> Attach link
                    </div>
                    <input
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Label (optional)"
                      maxLength={200}
                      className="w-full h-8 mb-2 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600"
                    />
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://…"
                      maxLength={500}
                      className="w-full h-8 mb-2 px-2 rounded bg-zinc-950 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      onClick={addLink}
                      disabled={!linkUrl.trim()}
                      className="h-8 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Add link
                    </button>
                  </div>

                  <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400">
                      <Paperclip className="h-3.5 w-3.5" /> Attach file
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                      }}
                      disabled={uploading}
                      className="text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-zinc-200 file:text-xs hover:file:bg-zinc-700"
                    />
                    {uploading && (
                      <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-2">
                      Max 20 MB. Visible to teammates in your email domain.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40 text-sm text-zinc-400">
                <Link to="/auth" className="text-zinc-100 underline">
                  Sign in
                </Link>{" "}
                to comment, attach files, or update this task.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ActivityItem({
  activity,
  actor,
  onDownload,
}: {
  activity: Activity;
  actor?: { name: string | null; email: string | null; avatar: string | null };
  onDownload: (path: string, filename: string) => void;
}) {
  const name = actor?.name ?? actor?.email ?? "Someone";
  const when = new Date(activity.created_at).toLocaleString();
  const dot = kindDot(activity.kind);

  const header = (
    <span className="text-sm text-zinc-300">
      <span className="font-medium text-zinc-100">{name}</span>{" "}
      {kindVerb(activity.kind)}
      <span className="text-zinc-500"> · {when}</span>
    </span>
  );

  return (
    <li className="relative">
      <span
        className={`absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border ${dot.ring} ${dot.bg}`}
      >
        <dot.Icon className={`h-2.5 w-2.5 ${dot.icon}`} />
      </span>
      {activity.kind === "commented" ? (
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/60">
            {header}
          </div>
          <div className="px-3 py-2 text-sm text-zinc-200 whitespace-pre-wrap">
            {activity.body}
          </div>
        </div>
      ) : activity.kind === "link_added" ? (
        <div>
          {header}
          <div className="mt-1">
            <a
              href={String(activity.metadata.url ?? "#")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-blue-300 hover:bg-zinc-800 break-all"
            >
              <LinkIcon className="h-3 w-3" />
              {String(activity.metadata.label ?? activity.metadata.url ?? "")}
            </a>
          </div>
        </div>
      ) : activity.kind === "attachment_added" ? (
        <div>
          {header}
          <div className="mt-1">
            <button
              onClick={() =>
                onDownload(
                  String(activity.metadata.path ?? ""),
                  activity.body ?? "file",
                )
              }
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              <Paperclip className="h-3 w-3" />
              {activity.body}
              <Download className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </div>
      ) : (
        header
      )}
    </li>
  );
}

function kindVerb(kind: ActivityKind): string {
  switch (kind) {
    case "opened":
      return "opened this task";
    case "reopened":
      return "reopened this task";
    case "closed":
      return "closed this task";
    case "commented":
      return "commented";
    case "status_changed":
      return "changed the status";
    case "deadline_changed":
      return "updated the deadline";
    case "assignee_changed":
      return "changed the assignee";
    case "attachment_added":
      return "attached a file";
    case "link_added":
      return "added a link";
    case "edited":
      return "edited the task";
  }
}

function kindDot(kind: ActivityKind) {
  if (kind === "closed")
    return {
      Icon: CheckCircle2,
      bg: "bg-purple-500/20",
      ring: "border-purple-500/50",
      icon: "text-purple-200",
    };
  if (kind === "reopened" || kind === "opened")
    return {
      Icon: Circle,
      bg: "bg-emerald-500/20",
      ring: "border-emerald-500/50",
      icon: "text-emerald-200",
    };
  if (kind === "commented")
    return {
      Icon: MessageSquare,
      bg: "bg-blue-500/20",
      ring: "border-blue-500/50",
      icon: "text-blue-200",
    };
  if (kind === "link_added")
    return {
      Icon: LinkIcon,
      bg: "bg-zinc-800",
      ring: "border-zinc-700",
      icon: "text-zinc-300",
    };
  if (kind === "attachment_added")
    return {
      Icon: Paperclip,
      bg: "bg-zinc-800",
      ring: "border-zinc-700",
      icon: "text-zinc-300",
    };
  if (kind === "deadline_changed")
    return {
      Icon: Clock,
      bg: "bg-amber-500/20",
      ring: "border-amber-500/50",
      icon: "text-amber-200",
    };
  return {
    Icon: Pencil,
    bg: "bg-zinc-800",
    ring: "border-zinc-700",
    icon: "text-zinc-300",
  };
}

// Silence unused import warning (RotateCcw kept for future "reopened" icon swap)
void RotateCcw;