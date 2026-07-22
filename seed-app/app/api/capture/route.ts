import { NextRequest } from "next/server";
import { ingest } from "@/lib/ingest";

export const runtime = "nodejs";

// Chrome 拡張などの外部入口。CORS を許可(ローカル単人前提)。
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let text = "";
  let source = "import";
  try {
    const body = await req.json();
    text = String(body.text ?? "");
    if (body.source) source = String(body.source);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400, headers: CORS });
  }
  if (!text.trim()) return Response.json({ error: "empty" }, { status: 400, headers: CORS });

  const r = await ingest(text, { source });
  return Response.json(
    { ok: true, entryId: r?.entry.id, suggestedThread: r?.suggested ?? null },
    { headers: CORS },
  );
}
