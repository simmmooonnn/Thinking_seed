import { prisma } from "@/lib/db";

export interface QuestionSignals {
  unchallengedClaims: string[];
  openHypotheses: string[];
  dormant: string[];
  recentTurn?: string;
}

/**
 * v4 自适应引导: 从用户的认知状态里提取盲区信号,给 dailyQuestion 出题用。
 * — 有判断没证据 / 提了假设没决定 / 线搁置太久 / 最近改了主意。
 */
export async function gatherQuestionSignals(userId: string): Promise<QuestionSignals> {
  const now = Date.now(), DAY = 86400000;
  const [threads, lastVersion] = await Promise.all([
    prisma.thread.findMany({
      where: { userId, status: { in: ["seed", "developing"] } },
      include: {
        entries: { select: { kind: true } },
        challenges: { where: { dismissed: false }, select: { id: true } },
        _count: { select: { entries: true } },
      },
    }),
    // 最近一次判断翻转: 取最新版本,再取同线程的上一版本作为"改之前"
    prisma.claimVersion.findFirst({
      where: { thread: { userId } },
      orderBy: { createdAt: "desc" },
      include: {
        thread: {
          select: {
            title: true,
            claim: true,
            versions: { orderBy: { createdAt: "desc" }, take: 2, select: { claim: true } },
          },
        },
      },
    }),
  ]);

  // "没证据"= 既没有 evidence 类 Entry,也没有 AutoSeed 联网找到的 Challenge(否则联网证据进来了却仍误报)
  const unchallengedClaims = threads
    .filter(
      (t) =>
        t.claim &&
        t.entries.some((e) => e.kind === "judgment" || e.kind === "hypothesis") &&
        !t.entries.some((e) => e.kind === "evidence") &&
        t.challenges.length === 0,
    )
    .map((t) => `${t.title}${t.claim ? `(${t.claim})` : ""}`);

  const openHypotheses = threads
    .filter((t) => t.entries.some((e) => e.kind === "hypothesis") && !t.entries.some((e) => e.kind === "decision"))
    .map((t) => t.title);

  const dormant = threads
    .filter((t) => t._count.entries > 0 && now - t.updatedAt.getTime() > 6 * DAY)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((t) => t.title);

  // versions[0]=最新(=当前 claim),versions[1]=改之前。需要有前一版本才算"翻转"
  const prev = lastVersion?.thread.versions?.[1]?.claim;
  const recentTurn =
    lastVersion && lastVersion.thread.claim && prev && prev !== lastVersion.thread.claim && now - lastVersion.createdAt.getTime() < 21 * DAY
      ? `「${lastVersion.thread.title}」从『${prev}』改成了『${lastVersion.thread.claim}』`
      : undefined;

  return { unchallengedClaims, openHypotheses, dormant, recentTurn };
}
