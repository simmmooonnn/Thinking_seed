import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { challengeClaim, findContradictions, recommendReading } from "@/lib/ai";

export const runtime = "nodejs";

// 进程内锁: 防止多标签页/重挂载并发跑同一批(否则同一线程会生成重复挑战卡)。
let running = false;

// Active Seed 后台:每次调用处理【一条】还没挑战过的线程(联网找证据)+ 扫一次矛盾。
// 所有线程都挑战过后自然变安静(不会无限花钱)。
export async function POST() {
  if (running) return Response.json({ generated: 0, skipped: "busy" });
  running = true;
  try {
    return await run();
  } finally {
    running = false;
  }
}

async function run() {
  const user = await getCurrentUser();
  let generated = 0;

  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { not: "archived" }, claim: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, claim: true },
  });

  const withCh = new Set(
    (await prisma.challenge.findMany({ where: { dismissed: false, thread: { userId: user.id } }, select: { threadId: true } })).map((c) => c.threadId),
  );

  // 1) 一条未挑战线程 → 联网证据
  const target = threads.find((t) => !withCh.has(t.id));
  if (target) {
    const cards = await challengeClaim(target.title, target.claim ?? "");
    for (const k of cards) {
      await prisma.challenge.create({
        data: { threadId: target.id, stance: k.stance, text: k.text, sourceTitle: k.sourceTitle || null, url: k.url || null },
      });
      generated++;
    }
  }

  // 3) 一条未推荐线程 → 联网推荐阅读
  const withR = new Set(
    (await prisma.reading.findMany({ where: { dismissed: false, thread: { userId: user.id } }, select: { threadId: true } })).map((r) => r.threadId),
  );
  const readTarget = threads.find((t) => !withR.has(t.id));

  // 2) 矛盾扫描 —— 只在本轮确实有新工作(挑战或推荐)时才跑,否则一切都覆盖后彻底安静,不再每 30 分钟白烧 AI
  if (target || readTarget) {
    const pairs = await findContradictions(threads.map((t) => ({ title: t.title, claim: t.claim })));
    for (const p of pairs) {
      const A = threads[p.a], B = threads[p.b];
      if (!A || !B) continue;
      const text = `与「${B.title}」冲突:${p.reason}`;
      const dup = await prisma.challenge.findFirst({
        where: { threadId: A.id, stance: "contradiction", text: { contains: `与「${B.title}」冲突` }, thread: { userId: user.id } },
      });
      if (dup) continue;
      await prisma.challenge.create({ data: { threadId: A.id, stance: "contradiction", text } });
      generated++;
    }
  }

  if (readTarget) {
    const items = await recommendReading(readTarget.title, readTarget.claim ?? "");
    for (const k of items) {
      await prisma.reading.create({
        data: { threadId: readTarget.id, title: k.title, url: k.url || null, source: k.source || null, summary: k.summary || null },
      });
      generated++;
    }
  }

  if (generated) {
    revalidatePath("/");
    revalidatePath("/reading");
  }
  return Response.json({ generated });
}
