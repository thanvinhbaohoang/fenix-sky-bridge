import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/uspto-download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        if (!target) {
          return new Response("Missing url param", { status: 400 });
        }
        // Only allow proxying USPTO download URLs
        try {
          const parsed = new URL(target);
          if (!parsed.hostname.endsWith("uspto.gov")) {
            return new Response("Forbidden host", { status: 403 });
          }
        } catch {
          return new Response("Invalid url", { status: 400 });
        }

        const apiKey = process.env.USPTO_API_KEY;
        if (!apiKey) {
          return new Response("USPTO_API_KEY not configured", { status: 500 });
        }

        const upstream = await fetch(target, {
          headers: { "X-API-KEY": apiKey, accept: "application/pdf" },
        });

        if (!upstream.ok || !upstream.body) {
          const body = await upstream.text().catch(() => "");
          return new Response(`Upstream error ${upstream.status}: ${body.slice(0, 200)}`, {
            status: upstream.status || 502,
          });
        }

        const headers = new Headers();
        const ct = upstream.headers.get("content-type") ?? "application/pdf";
        headers.set("content-type", ct);
        const cd = upstream.headers.get("content-disposition");
        if (cd) headers.set("content-disposition", cd);

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});