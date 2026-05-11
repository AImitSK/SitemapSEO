import { NextResponse } from "next/server";

import { syncSiteFromWp } from "@/lib/wp/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await syncSiteFromWp(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
