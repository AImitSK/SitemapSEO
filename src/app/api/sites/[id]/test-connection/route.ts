import { NextResponse } from "next/server";

import { getSiteWithSecret } from "@/lib/sites/queries";
import { wpFetch } from "@/lib/wp/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type TestConnectionResult = {
  ok: boolean;
  user?: { id: number; name: string; slug: string };
  muPluginInstalled: boolean | null;
  yoastFieldsExposed: boolean | null;
  error?: string;
};

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const site = await getSiteWithSecret(id);
  if (!site) {
    return NextResponse.json(
      { error: "Site nicht gefunden" } satisfies { error: string },
      { status: 404 },
    );
  }

  const result: TestConnectionResult = {
    ok: false,
    muPluginInstalled: null,
    yoastFieldsExposed: null,
  };

  try {
    const meRes = await wpFetch(site, "/wp/v2/users/me?context=edit");
    if (!meRes.ok) {
      const body = await meRes.text().catch(() => "");
      result.error = `Auth fehlgeschlagen (${meRes.status}): ${body.slice(0, 200)}`;
      return NextResponse.json(result, { status: 200 });
    }
    const me = (await meRes.json()) as {
      id: number;
      name: string;
      slug: string;
    };
    result.user = { id: me.id, name: me.name, slug: me.slug };
  } catch (err) {
    result.error = `Verbindungsfehler: ${(err as Error).message}`;
    return NextResponse.json(result, { status: 200 });
  }

  try {
    const pagesRes = await wpFetch(
      site,
      "/wp/v2/pages?per_page=1&context=edit&_fields=id,meta",
    );
    if (pagesRes.ok) {
      const data = (await pagesRes.json()) as Array<{
        id: number;
        meta?: Record<string, unknown>;
      }>;
      if (Array.isArray(data) && data.length > 0) {
        const meta = data[0]?.meta ?? {};
        const exposed = "_yoast_wpseo_title" in meta;
        result.muPluginInstalled = exposed;
        result.yoastFieldsExposed = exposed;
      } else {
        result.muPluginInstalled = null;
        result.yoastFieldsExposed = null;
      }
    } else {
      result.muPluginInstalled = false;
      result.yoastFieldsExposed = false;
    }
  } catch {
    result.muPluginInstalled = null;
    result.yoastFieldsExposed = null;
  }

  result.ok = true;
  return NextResponse.json(result);
}
