import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { transcribe } from "@/lib/transcribe";
import { ingest } from "@/lib/ingest";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) return Response.json({ error: "没有音频" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const text = await transcribe(buf, "audio.webm");
  if (!text) {
    return Response.json(
      { error: "转写为空(可能没说话,或未配置 OpenAI key)。再说一次?" },
      { status: 200 },
    );
  }

  const id = crypto.randomUUID();
  const dir = path.join(process.cwd(), "public", "audio");
  await mkdir(dir, { recursive: true });
  const fname = `${id}.webm`;
  await writeFile(path.join(dir, fname), buf);

  const r = await ingest(text, { audioUrl: `/audio/${fname}`, source: "voice" });
  // 回执: 类别 + 归入哪条线(供前端展示与一步纠正)
  let threadTitle: string | null = null;
  let question: string | null = null;
  if (r?.suggested) {
    const t = await prisma.thread.findUnique({
      where: { id: r.suggested },
      select: { title: true, question: true },
    });
    threadTitle = t?.title ?? null;
    question = t?.question ?? null;
  }
  return Response.json({
    ok: true,
    text,
    entryId: r?.entry.id,
    kind: r?.entry.kind ?? null,
    threadId: r?.suggested ?? null,
    threadTitle,
    question,
  });
}
