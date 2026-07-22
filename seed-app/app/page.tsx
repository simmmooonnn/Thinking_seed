import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Cloud, { type GNode, type GLink } from "./ui/Cloud";
import CaptureBar from "./ui/CaptureBar";
import AutoSeed from "./ui/AutoSeed";
import MessengerCard from "./ui/MessengerCard";
import { resurfaceReason, type MsgChallenge, type MsgResurface } from "@/lib/messenger";
import { kindMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  seed: "#8b8b96",
  developing: "#34d399",
  decided: "#fbbf24",
  archived: "#3f3f46",
};

const DORMANT_DAYS = 4;

export default async function Home() {
  const user = await getCurrentUser();
  const [threads, entries, threadLinks] = await Promise.all([
    prisma.thread.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { entries: true } },
        versions: { orderBy: { createdAt: "asc" }, select: { claim: true } },
      },
    }),
    prisma.entry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.threadLink.findMany({ where: { userId: user.id } }),
  ]);

  const challenges = await prisma.challenge.findMany({
    where: { dismissed: false, thread: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: { thread: { select: { id: true, title: true } } },
  });
  const challengedSet = new Set(challenges.map((c) => c.threadId));
  const alertItems: MsgChallenge[] = challenges.slice(0, 6).map((c) => ({
    id: c.id,
    threadId: c.threadId,
    threadTitle: c.thread.title,
    stance: c.stance,
    text: c.text,
  }));

  const now = Date.now();
  const daysSince = (d: Date) => Math.floor((now - d.getTime()) / 86400000);

  // 重新浮现的"理由":休眠线若与一条【仍活跃】的线相连,浮现时说清为什么(而非冰冷倒计时)
  const activeTitles = new Map(
    threads.filter((t) => daysSince(t.updatedAt) < DORMANT_DAYS).map((t) => [t.id, t.title]),
  );

  const nodes: GNode[] = [
    { id: "root", type: "root", label: "思想", color: "#34d399", r: 5 },
  ];
  const links: GLink[] = [];
  const resurface: MsgResurface[] = [];

  for (const t of threads) {
    const days = daysSince(t.updatedAt);
    const dormant =
      days >= DORMANT_DAYS &&
      (t.status === "seed" || t.status === "developing") &&
      t._count.entries > 0;
    if (dormant) {
      resurface.push({
        id: t.id,
        title: t.title,
        days,
        question: t.question,
        reason: resurfaceReason(t.id, threadLinks, activeTitles),
      });
    }
    nodes.push({
      id: `t:${t.id}`,
      rid: t.id,
      type: "thread",
      label: t.title,
      color: STATUS_COLOR[t.status] ?? "#8b8b96",
      r: Math.min(4 + t._count.entries * 0.7, 11),
      dormant,
      challenged: challengedSet.has(t.id),
      claim: t.claim ?? undefined,
      versions: t.versions.map((v) => v.claim),
    });
    links.push({ source: `t:${t.id}`, target: "root", kind: "root" });
  }

  for (const e of entries) {
    const meta = kindMeta(e.kind);
    nodes.push({
      id: `e:${e.id}`,
      rid: e.id,
      type: "entry",
      label: e.text.length > 14 ? e.text.slice(0, 14) + "…" : e.text,
      full: e.text,
      kind: e.kind,
      color: meta.dot,
      r: 2.6,
      aiSuggested: e.aiSuggested,
      linkSuggested: e.linkSuggested,
      threadId: e.threadId,
      audioUrl: e.audioUrl,
      imageUrl: e.imageUrl,
    });
    links.push({
      source: `e:${e.id}`,
      target: e.threadId ? `t:${e.threadId}` : "root",
      kind: e.threadId ? "thread" : "root",
      suggested: e.threadId ? e.linkSuggested : false,
    });
  }

  // 跨线程主线(相关的线程星之间连线)
  const threadIds = new Set(threads.map((t) => t.id));
  for (const l of threadLinks) {
    if (threadIds.has(l.aId) && threadIds.has(l.bId)) {
      links.push({ source: `t:${l.aId}`, target: `t:${l.bId}`, kind: "rel" });
    }
  }

  const threadOpts = threads.map((t) => ({ id: t.id, title: t.title }));
  const empty = entries.length === 0 && threads.length === 0;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 overflow-hidden bg-[#08080a]">
      {/* 动态背景: 画布后面(画布已设为透明,不会拖影) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="nebula" />
        <div className="starfield" />
      </div>

      <Cloud data={{ nodes, links }} threads={threadOpts} />

      {/* 信使:三类环境提醒合一,一次只说一件事(抗提醒疲劳) */}
      <MessengerCard
        challenges={alertItems}
        resurface={[...resurface].sort((a, b) => Number(!!b.reason) - Number(!!a.reason)).slice(0, 5)}
      />

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg text-txt">记下第一个想法,看它变成一颗星。</p>
          <p className="mono text-xs text-muted2">
            绿=你的观察/判断 · 紫=AI建议 · 蓝=外部证据 · 琥珀=决定
          </p>
        </div>
      )}
      <CaptureBar />
      <AutoSeed />
    </div>
  );
}
