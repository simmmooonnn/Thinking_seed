import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { describeImage } from "@/lib/ai";
import { ingest } from "@/lib/ingest";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "没有图片" }, { status: 400 });

  const media = file.type in EXT ? file.type : "image/png";
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) {
    return Response.json({ error: "图片太大(>8MB)" }, { status: 200 });
  }

  const id = crypto.randomUUID();
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fname = `${id}.${EXT[media]}`;
  await writeFile(path.join(dir, fname), buf);

  const text = await describeImage(buf.toString("base64"), media);
  const r = await ingest(text, { imageUrl: `/uploads/${fname}`, source: "image" });
  return Response.json({ ok: true, text, entryId: r?.entry.id });
}
