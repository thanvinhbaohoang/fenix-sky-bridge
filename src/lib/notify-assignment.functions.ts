import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  to: z.string().email(),
  toName: z.string().min(1),
  origin: z.string().url(),
  task: z.object({
    title: z.string(),
    description: z.string().default(""),
    tag: z.enum(["urgent", "action", "optional"]),
    tools: z.array(z.string()).default([]),
  }),
  app: z.object({
    appNumber: z.string(),
    title: z.string(),
    assignee: z.string(),
  }),
  event: z
    .object({
      code: z.string(),
      label: z.string(),
      date: z.string(),
    })
    .nullable(),
});

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(data: z.infer<typeof inputSchema>) {
  const { task, app, event, origin, toName } = data;
  const link = `${origin.replace(/\/$/, "")}/project?app=${encodeURIComponent(app.appNumber)}`;
  const tagColor =
    task.tag === "urgent"
      ? "#fca5a5"
      : task.tag === "action"
        ? "#fcd34d"
        : "#a1a1aa";

  const eventLine = event
    ? `<div style="margin:0 0 16px;color:#a1a1aa;font-size:13px">
         Event: <strong style="color:#e4e4e7;font-family:ui-monospace,Menlo,monospace">${esc(event.code)}</strong> — ${esc(event.label)} · ${esc(event.date)}
       </div>`
    : "";

  const toolsList =
    task.tools.length > 0
      ? `<div style="margin-top:16px">
           <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#71717a;margin-bottom:6px">Suggested tools</div>
           <ul style="margin:0;padding-left:18px;color:#d4d4d8;font-size:14px">
             ${task.tools.map((t) => `<li>${esc(t)}</li>`).join("")}
           </ul>
         </div>`
      : "";

  const html = `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#e4e4e7">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <div style="width:32px;height:32px;border-radius:8px;background:#f4f4f5;color:#0a0a0a;display:inline-flex;align-items:center;justify-content:center;font-weight:700">F</div>
      <span style="font-weight:600;letter-spacing:-.01em">FenixAI</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 8px;color:#fafafa">Hi ${esc(toName)}, you've been assigned a task</h1>
    <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px">
      On <strong style="color:#e4e4e7">${esc(app.title)}</strong>
      (<span style="font-family:ui-monospace,Menlo,monospace">${esc(app.appNumber)}</span>)
    </p>
    ${eventLine}
    <div style="border:1px solid #27272a;border-radius:12px;padding:20px;background:#111113">
      <div style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:${tagColor};border:1px solid ${tagColor}44;background:${tagColor}18;margin-bottom:10px">${esc(task.tag)}</div>
      <div style="font-size:16px;font-weight:600;color:#fafafa;margin-bottom:6px">${esc(task.title)}</div>
      <div style="font-size:14px;color:#a1a1aa;line-height:1.5">${esc(task.description || "")}</div>
      ${toolsList}
    </div>
    <div style="margin-top:24px">
      <a href="${esc(link)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#fafafa;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600">Open in FenixAI →</a>
    </div>
    <p style="margin-top:32px;color:#52525b;font-size:12px">
      Sent by FenixAI on behalf of ${esc(app.assignee)}.
    </p>
  </div>
</body></html>`;

  const text = [
    `Hi ${toName}, you've been assigned a task on ${app.title} (${app.appNumber}).`,
    event ? `Event: ${event.code} — ${event.label} · ${event.date}` : "",
    "",
    `[${task.tag.toUpperCase()}] ${task.title}`,
    task.description,
    task.tools.length ? `Suggested tools: ${task.tools.join(", ")}` : "",
    "",
    `Open in FenixAI: ${link}`,
    "",
    `— Sent on behalf of ${app.assignee}`,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `[${app.appNumber}] ${task.title} — assigned to you`;
  return { subject, html, text };
}

export const notifyAssignment = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    const from = process.env.RESEND_FROM || "FenixAI <onboarding@resend.dev>";

    const { subject, html, text } = renderEmail(data);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [data.toName ? `${data.toName} <${data.to}>` : data.to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend error ${res.status}: ${body.slice(0, 300)}`);
    }

    return (await res.json()) as { id: string };
  });