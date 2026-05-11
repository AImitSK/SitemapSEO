import { NextResponse } from "next/server";

import { getUrlWithSite } from "@/lib/urls/detail";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const data = await getUrlWithSite(id);
  if (!data) {
    return NextResponse.json({ error: "URL nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json(data);
}
