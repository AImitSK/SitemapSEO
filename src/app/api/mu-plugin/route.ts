import {
  MU_PLUGIN_FILENAME,
  MU_PLUGIN_SOURCE,
} from "@/lib/wp/mu-plugin-source";

export const runtime = "nodejs";

export function GET() {
  return new Response(MU_PLUGIN_SOURCE, {
    headers: {
      "Content-Type": "application/x-httpd-php; charset=utf-8",
      "Content-Disposition": `attachment; filename="${MU_PLUGIN_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
