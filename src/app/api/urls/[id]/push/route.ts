import { NextResponse } from "next/server";
import { z } from "zod";

import { pushUrlToWp } from "@/lib/wp/push";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  draftId: z.string().uuid(),
});

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "draftId erforderlich" },
      { status: 422 },
    );
  }

  const result = await pushUrlToWp({ urlId: id, draftId: parsed.data.draftId });
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
