import { decrypt } from "@/lib/crypto";
import type { Site } from "@/lib/db/schema";

function buildAuthHeader(username: string, encryptedPassword: string): string {
  const password = decrypt(encryptedPassword);
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
}

export type WpFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export async function wpFetch(
  site: Site,
  path: string,
  options: WpFetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 15_000, headers, ...rest } = options;
  const url = `${site.baseUrl}/wp-json${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...rest,
      headers: {
        ...(headers ?? {}),
        Authorization: buildAuthHeader(site.wpUsername, site.wpAppPassword),
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}
