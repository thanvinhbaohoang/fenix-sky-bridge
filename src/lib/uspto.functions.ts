import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function usptoFetch(url: string): Promise<Response> {
  const apiKey = process.env.USPTO_API_KEY as string;
  if (!apiKey) throw new Error("USPTO_API_KEY is not configured");
  return fetch(url, {
    method: "GET",
    headers: { accept: "application/json", "X-API-KEY": apiKey },
  });
}

export const fetchUsptoApplication = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ applicationNumber: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const cleanApplicationNum = data.applicationNumber.replace(/\D/g, "");
    if (!cleanApplicationNum) {
      throw new Error("Invalid application number");
    }

    const url = `https://api.uspto.gov/api/v1/patent/applications/${cleanApplicationNum}`;
    const maxRetries = 3;
    let lastErr: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await usptoFetch(url);

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(
            `USPTO API error ${response.status}: ${body.slice(0, 200)}`,
          );
        }

        return await response.json();
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error("Failed to fetch USPTO application");
  });

export const fetchUsptoDocuments = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ applicationNumber: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const clean = data.applicationNumber.replace(/\D/g, "");
    if (!clean) throw new Error("Invalid application number");
    const url = `https://api.uspto.gov/api/v1/patent/applications/${clean}/documents`;
    const response = await usptoFetch(url);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `USPTO documents error ${response.status}: ${body.slice(0, 200)}`,
      );
    }
    return await response.json();
  });