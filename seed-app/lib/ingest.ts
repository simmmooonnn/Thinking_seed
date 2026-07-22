import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { classifyKind, suggestThread } from "./ai";

// すべての捕获入口(文字/語音/画像/拡張)が通る共通パイプライン:
// 来源分类 + 候選線程の自動判定 + 保存。
export async function ingest(
  text: string,
  opts?: { audioUrl?: string; imageUrl?: string; source?: string; kind?: string },
) {
  const t = text.trim();
  if (!t) return null;

  const [kind, threads] = await Promise.all([
    opts?.kind ? Promise.resolve(opts.kind) : classifyKind(t),
    prisma.thread.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, title: true, claim: true },
    }),
  ]);
  const suggested = await suggestThread(t, threads);

  const entry = await prisma.entry.create({
    data: {
      text: t,
      kind,
      aiSuggested: true,
      threadId: suggested ?? null,
      linkSuggested: !!suggested,
      audioUrl: opts?.audioUrl ?? null,
      imageUrl: opts?.imageUrl ?? null,
      source: opts?.source ?? "text",
    },
  });

  // 归入某条线 → 该线视为刚活跃过(否则 updatedAt 冻结在最后一次改元信息时,休眠判定会误报)
  if (suggested) await prisma.thread.update({ where: { id: suggested }, data: { updatedAt: new Date() } });

  revalidatePath("/");
  if (suggested) revalidatePath(`/thread/${suggested}`);
  return { entry, suggested };
}
