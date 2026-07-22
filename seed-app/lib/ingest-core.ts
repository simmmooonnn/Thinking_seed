import { prisma } from "./db";
import { classifyKind, suggestThread } from "./ai";

export interface IngestOpts {
  audioUrl?: string;
  imageUrl?: string;
  source?: string;
  kind?: string;
}

// 纯捕获管线: 网页(经 ingest.ts 包装)与 bot 进程共用。按 userId 隔离,不做 revalidate。
export async function ingestCore(userId: string, text: string, opts?: IngestOpts) {
  const t = text.trim();
  if (!t) return null;

  const [kind, threads] = await Promise.all([
    opts?.kind ? Promise.resolve(opts.kind) : classifyKind(t),
    prisma.thread.findMany({
      where: { userId, status: { not: "archived" } },
      select: { id: true, title: true, claim: true },
    }),
  ]);
  const suggested = await suggestThread(t, threads);

  const entry = await prisma.entry.create({
    data: {
      text: t,
      kind,
      aiSuggested: true,
      userId,
      threadId: suggested ?? null,
      linkSuggested: !!suggested,
      audioUrl: opts?.audioUrl ?? null,
      imageUrl: opts?.imageUrl ?? null,
      source: opts?.source ?? "text",
    },
  });

  if (suggested) {
    await prisma.thread.update({ where: { id: suggested }, data: { updatedAt: new Date() } });
  }
  return { entry, suggested };
}
