import bcrypt from "bcryptjs";

export type AuthResult =
  | { ok: true; user: string }
  | { ok: false; reason: "missing" | "malformed" | "invalid" | "misconfigured" };

export function verifyBasicAuth(header: string | null): AuthResult {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!username || !passwordHash) {
    return { ok: false, reason: "misconfigured" };
  }
  if (!header) {
    return { ok: false, reason: "missing" };
  }

  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) {
    return { ok: false, reason: "malformed" };
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const sepIndex = decoded.indexOf(":");
  if (sepIndex < 0) {
    return { ok: false, reason: "malformed" };
  }
  const user = decoded.slice(0, sepIndex);
  const pass = decoded.slice(sepIndex + 1);

  if (user !== username) {
    return { ok: false, reason: "invalid" };
  }
  if (!bcrypt.compareSync(pass, passwordHash)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, user };
}

export function unauthorizedResponse(): Response {
  return new Response("Authentifizierung erforderlich", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SitemapSEO", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
