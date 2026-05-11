import { NextResponse } from "next/server";

import { listUrls } from "@/lib/urls/queries";

export const runtime = "nodejs";

const VALID_STATUSES = [
  "pending",
  "optimized",
  "draft",
  "pushed",
  "error",
] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function asStatus(v: string | null): ValidStatus | null {
  if (!v) return null;
  return (VALID_STATUSES as readonly string[]).includes(v)
    ? (v as ValidStatus)
    : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }
  const result = await listUrls({
    siteId,
    language: url.searchParams.get("lang"),
    postType: url.searchParams.get("type"),
    status: asStatus(url.searchParams.get("status")),
    q: url.searchParams.get("q"),
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "50"),
  });
  return NextResponse.json(result);
}
