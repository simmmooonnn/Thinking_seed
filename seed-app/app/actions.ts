"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  classifyKind,
  generateMemo,
  askOneQuestion,
  generateWeekly,
  explainLineage,
  findThreadRelations,
  extractKeyIdeas,
  reflectCognition,
  findMainlines,
  challengeClaim,
  findContradictions,
  recommendReading,
  dailyQuestion,
  draftArticle,
  thinkingProfile,
  evolutionStory,
  phraseNudge,
} from "@/lib/ai";
import { gatherQuestionSignals } from "@/lib/signals";
import { ingest } from "@/lib/ingest";
import type { Kind } from "@/lib/types";

// 捕获: テキスト。来源分类 + 候選線程の自動判定は ingest() が担う（内部で user を取り userId を付与）。
// 返回"回执":类别 + 归入哪条线(含该线的问题,帮助重建语境),供前端一步纠正。
export interface CaptureReceipt {
  id: string;
  kind: string;
  threadId: string | null;
  threadTitle: string | null;
  question: string | null;
}

export async function createEntry(formData: FormData): Promise<CaptureReceipt | null> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return null;
  const res = await ingest(text, { source: "text" });
  if (!res) return null;
  let threadTitle: string | null = null;
  let question: string | null = null;
  if (res.suggested) {
    const t = await prisma.thread.findUnique({
      where: { id: res.suggested },
      select: { title: true, question: true },
    });
    threadTitle = t?.title ?? null;
    question = t?.question ?? null;
  }
  return { id: res.entry.id, kind: res.entry.kind, threadId: res.suggested, threadTitle, question };
}

// AI が張った仮リンクを人が確定する。
export async function confirmLink(entryId: string) {
  const user = await getCurrentUser();
  await prisma.entry.updateMany({
    where: { id: entryId, userId: user.id },
    data: { linkSuggested: false },
  });
  revalidatePath("/");
}

// Thinking Pre-Commit / 先追问: 当前判断に対して一つだけ質問を返す。
export async function askQuestion(threadId: string): Promise<string> {
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({
    where: { id: threadId, userId: user.id },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!t) return "";
  return askOneQuestion({
    title: t.title,
    claim: t.claim,
    entries: t.entries.map((e) => ({ kind: e.kind, text: e.text })),
  });
}

// 来源を確定 / 変更する（人が第一作者: AI の提案を人が承認して初めて確定）。
export async function setKind(entryId: string, kind: Kind) {
  const user = await getCurrentUser();
  const e = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!e) return;
  await prisma.entry.update({
    where: { id: entryId },
    data: { kind, aiSuggested: false },
  });
  revalidatePath("/");
  if (e.threadId) revalidatePath(`/thread/${e.threadId}`);
}

export async function deleteEntry(entryId: string) {
  const user = await getCurrentUser();
  const e = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!e) return;
  await prisma.entry.delete({ where: { id: entryId } });
  revalidatePath("/");
  if (e.threadId) revalidatePath(`/thread/${e.threadId}`);
}

// 新しい Thread を作って空で開く。
export async function createThread(formData: FormData) {
  const user = await getCurrentUser();
  const title = String(formData.get("title") ?? "").trim() || "未命名的问题";
  const t = await prisma.thread.create({ data: { title, userId: user.id } });
  redirect(`/thread/${t.id}`);
}

// Inbox のエントリから Thread を起こし、そのエントリを移す。
export async function newThreadFromEntry(entryId: string) {
  const user = await getCurrentUser();
  const e = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!e) return;
  const title = e.text.length > 40 ? e.text.slice(0, 40) + "…" : e.text;
  const t = await prisma.thread.create({ data: { title, userId: user.id } });
  await prisma.entry.update({
    where: { id: entryId },
    data: { threadId: t.id, linkSuggested: false },
  });
  redirect(`/thread/${t.id}`);
}

export async function moveEntryToThread(entryId: string, threadId: string | null) {
  const user = await getCurrentUser();
  const e = await prisma.entry.findFirst({ where: { id: entryId, userId: user.id } });
  if (!e) return;
  if (threadId) {
    const t = await prisma.thread.findFirst({ where: { id: threadId, userId: user.id } });
    if (!t) return;
  }
  await prisma.entry.update({
    where: { id: entryId },
    data: { threadId, linkSuggested: false },
  });
  revalidatePath("/");
  if (threadId) revalidatePath(`/thread/${threadId}`);
}

// Thread に直接エントリを追加（AI が種別を提案）。
export async function addEntryToThread(threadId: string, formData: FormData) {
  const user = await getCurrentUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const t = await prisma.thread.findFirst({ where: { id: threadId, userId: user.id } });
  if (!t) return;
  const kind = await classifyKind(text);
  await prisma.entry.create({ data: { text, kind, aiSuggested: true, threadId, userId: user.id } });
  await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
  revalidatePath(`/thread/${threadId}`);
}

export async function updateThread(
  threadId: string,
  data: { title?: string; question?: string; claim?: string; status?: string },
) {
  const user = await getCurrentUser();
  // 判断が実質変化したら谱系にスナップショット
  const cur = await prisma.thread.findFirst({
    where: { id: threadId, userId: user.id },
    select: { claim: true },
  });
  if (!cur) return;
  if (data.claim !== undefined && data.claim.trim()) {
    if (data.claim.trim() !== (cur.claim ?? "")) {
      await prisma.claimVersion.create({ data: { threadId, claim: data.claim.trim() } });
    }
  }
  await prisma.thread.update({ where: { id: threadId }, data });
  revalidatePath(`/thread/${threadId}`);
  revalidatePath("/");
}

// 谱系: 某个版本の"为什么改"を書く。
export async function setVersionReason(versionId: string, reason: string) {
  const user = await getCurrentUser();
  const v = await prisma.claimVersion.findFirst({
    where: { id: versionId, thread: { userId: user.id } },
  });
  if (!v) return;
  await prisma.claimVersion.update({
    where: { id: versionId },
    data: { reason },
  });
  revalidatePath(`/thread/${v.threadId}`);
}

// v3 Active Seed: 联网为该线程的判断找反方/支持证据,存成挑战卡。
export async function runChallenge(threadId: string): Promise<{ count: number }> {
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({
    where: { id: threadId, userId: user.id },
    select: { title: true, claim: true },
  });
  if (!t) return { count: 0 };
  const cards = await challengeClaim(t.title, t.claim ?? "");
  for (const k of cards) {
    await prisma.challenge.create({
      data: { threadId, stance: k.stance, text: k.text, sourceTitle: k.sourceTitle || null, url: k.url || null },
    });
  }
  revalidatePath(`/thread/${threadId}`);
  revalidatePath("/");
  return { count: cards.length };
}

// v3: 自分の線程間の矛盾を検出 → 挑战カード(contradiction)に。
export async function scanContradictions(): Promise<{ count: number }> {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { not: "archived" }, claim: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, claim: true },
  });
  const pairs = await findContradictions(threads.map((t) => ({ title: t.title, claim: t.claim })));
  let count = 0;
  for (const p of pairs) {
    const A = threads[p.a], B = threads[p.b];
    if (!A || !B) continue;
    const text = `与「${B.title}」冲突:${p.reason}`;
    // 按线程对去重(同一对矛盾只留一张,不随 reason 措辞变化重复生成)
    const dup = await prisma.challenge.findFirst({
      where: {
        threadId: A.id,
        stance: "contradiction",
        text: { contains: `与「${B.title}」冲突` },
        thread: { userId: user.id },
      },
    });
    if (dup) continue;
    await prisma.challenge.create({ data: { threadId: A.id, stance: "contradiction", text } });
    count++;
  }
  revalidatePath("/");
  return { count };
}

// Create: 把一条线程写成 文章/演讲提纲/研究proposal/推文串。
export async function makeArticle(threadId: string, format: string = "essay"): Promise<string> {
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({
    where: { id: threadId, userId: user.id },
    include: {
      entries: { orderBy: { createdAt: "asc" } },
      challenges: { where: { dismissed: false } },
      readings: { where: { dismissed: false } },
    },
  });
  if (!t) return "# 未找到该线程";
  return draftArticle(
    {
      title: t.title,
      claim: t.claim,
      entries: t.entries.map((e) => ({ kind: e.kind, text: e.text })),
      challenges: t.challenges.map((c) => ({ stance: c.stance, text: c.text })),
      readings: t.readings.map((r) => ({ title: r.title })),
    },
    format,
  );
}

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Questioner: 手动重新生成今天的头条问题。
export async function refreshDailyQuestion(): Promise<string> {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { in: ["seed", "developing"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { title: true, claim: true },
  });
  const signals = await gatherQuestionSignals(user.id);
  const q = await dailyQuestion(threads.map((t) => ({ title: t.title, claim: t.claim })), signals);
  const date = localDateKey();
  await prisma.dailyBrief.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { date, question: q, userId: user.id },
    update: { question: q },
  });
  revalidatePath("/brief");
  return q;
}

// v3: 为一条(下一条还没推荐的)线程联网找推荐阅读。
export async function runReading(threadId?: string): Promise<{ count: number; title: string | null }> {
  const user = await getCurrentUser();
  let t;
  if (threadId) {
    t = await prisma.thread.findFirst({
      where: { id: threadId, userId: user.id },
      select: { id: true, title: true, claim: true },
    });
  } else {
    const withR = new Set(
      (
        await prisma.reading.findMany({
          where: { dismissed: false, thread: { userId: user.id } },
          select: { threadId: true },
        })
      ).map((r) => r.threadId),
    );
    const threads = await prisma.thread.findMany({
      where: { userId: user.id, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, claim: true },
    });
    t = threads.find((x) => !withR.has(x.id)) ?? null;
  }
  if (!t) return { count: 0, title: null };
  const items = await recommendReading(t.title, t.claim ?? "");
  for (const k of items) {
    await prisma.reading.create({
      data: { threadId: t.id, title: k.title, url: k.url || null, source: k.source || null, summary: k.summary || null },
    });
  }
  revalidatePath("/reading");
  return { count: items.length, title: t.title };
}

export async function dismissReading(id: string) {
  const user = await getCurrentUser();
  const r = await prisma.reading.findFirst({ where: { id, thread: { userId: user.id } } });
  if (!r) return;
  await prisma.reading.update({ where: { id }, data: { dismissed: true } });
  revalidatePath("/reading");
}

export async function dismissChallenge(id: string) {
  const user = await getCurrentUser();
  const ch = await prisma.challenge.findFirst({ where: { id, thread: { userId: user.id } } });
  if (!ch) return;
  await prisma.challenge.update({ where: { id }, data: { dismissed: true } });
  revalidatePath(`/thread/${ch.threadId}`);
}

// Pre-Commit: 依据(理由)を書いて決定として記録し、線程を decided に。
export async function commitDecision(threadId: string, rationale: string) {
  const r = rationale.trim();
  if (!r) return;
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({ where: { id: threadId, userId: user.id } });
  if (!t) return;
  await prisma.entry.create({
    data: { threadId, text: `【决定依据】${r}`, kind: "decision", aiSuggested: false, source: "text", userId: user.id },
  });
  await prisma.thread.update({ where: { id: threadId }, data: { status: "decided" } });
  revalidatePath(`/thread/${threadId}`);
  revalidatePath("/");
}

// 谱系: 演化叙事(語義 diff)を返す。
export async function explainThreadLineage(threadId: string): Promise<string> {
  const user = await getCurrentUser();
  const [t, vs] = await Promise.all([
    prisma.thread.findFirst({ where: { id: threadId, userId: user.id }, select: { title: true } }),
    prisma.claimVersion.findMany({
      where: { threadId, thread: { userId: user.id } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return explainLineage({
    title: t?.title ?? "",
    versions: vs.map((v) => ({
      claim: v.claim,
      reason: v.reason,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}

// 导入: 粘贴的对话/长文。整段存一条,或让 AI 拆成多条要点。
export async function importText(text: string, split: boolean): Promise<{ count: number }> {
  const t = text.trim();
  if (!t) return { count: 0 };
  if (!split) {
    await ingest(t, { source: "import" });
    return { count: 1 };
  }
  const ideas = await extractKeyIdeas(t);
  for (const idea of ideas) {
    await ingest(idea.text, { source: "import", kind: idea.kind });
  }
  return { count: ideas.length };
}

// 认知面板: 找出长期主线(反复出现的母题)。
export async function mainlines(): Promise<{ name: string; why: string; titles: string[] }[]> {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { not: "archived" } },
    orderBy: { createdAt: "asc" },
    select: { title: true, claim: true },
  });
  const lines = await findMainlines(threads.map((t) => ({ title: t.title, claim: t.claim })));
  return lines.map((l) => ({
    name: l.name,
    why: l.why,
    titles: l.threads.map((i) => threads[i]?.title).filter(Boolean) as string[],
  }));
}

// v4: 认知画像(思维指纹)。
export async function computeProfile() {
  const user = await getCurrentUser();
  const HUMAN = ["observation", "judgment", "question", "hypothesis", "decision"];
  const [entries, threads] = await Promise.all([
    prisma.entry.findMany({ where: { userId: user.id }, select: { kind: true, createdAt: true, threadId: true } }),
    prisma.thread.findMany({
      where: { userId: user.id },
      include: { entries: { select: { kind: true } }, challenges: { where: { dismissed: false }, select: { id: true } } },
    }),
  ]);
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  const human = HUMAN.reduce((s, k) => s + (counts[k] ?? 0), 0);
  const total = entries.length || 1;
  const authorPct = Math.round((human / total) * 100);
  const unchallenged = threads.filter((t) => t.entries.some((e) => e.kind === "hypothesis" || e.kind === "judgment") && !t.entries.some((e) => e.kind === "evidence") && t.challenges.length === 0).length;
  const openHypotheses = threads.filter((t) => t.entries.some((e) => e.kind === "hypothesis") && !t.entries.some((e) => e.kind === "decision")).length;

  const now = Date.now(), WEEK = 7 * 86400000;
  const weeklyOriginal = Array.from({ length: 8 }, (_, i) => {
    const w = 7 - i;
    return entries.filter((e) => {
      const wa = Math.floor((now - e.createdAt.getTime()) / WEEK);
      return wa === w && HUMAN.includes(e.kind);
    }).length;
  });

  const inbox = entries.filter((e) => !e.threadId).length;
  const profile = await thinkingProfile({
    authorPct,
    counts,
    unchallenged,
    openHypotheses,
    weeklyOriginal,
    inbox,
    topThreads: threads.map((t) => t.title),
  });
  // 证据链: 画像的结论必须可回溯到这些真实数字(AI 输出只是索引,不是替代品)
  return {
    profile,
    basis: { entries: entries.length, threads: threads.length, authorPct, unchallenged, openHypotheses, inbox },
  };
}

// v4 主动越界提醒: 检测一个此刻最值得提的模式,写成一句轻声提醒。
// 纯规则挑候选(便宜),只对选中的一条调一次 AI 润色。返回 null 表示没啥好说的。
export async function getNudge(): Promise<{ id: string; text: string; threadId?: string } | null> {
  const user = await getCurrentUser();
  const now = Date.now(), DAY = 86400000;
  const [entries, threads] = await Promise.all([
    prisma.entry.findMany({ where: { userId: user.id }, select: { threadId: true, kind: true, createdAt: true } }),
    prisma.thread.findMany({
      where: { userId: user.id, status: { in: ["seed", "developing"] } },
      include: {
        entries: { select: { kind: true, createdAt: true } },
        challenges: { where: { dismissed: false }, select: { id: true } },
        _count: { select: { entries: true } },
      },
    }),
  ]);

  type Cand = { id: string; priority: number; cue: string; threadId?: string };
  const cands: Cand[] = [];

  // 1) 本周反复回到同一条线(>=3 次新增)
  for (const t of threads) {
    const thisWeek = t.entries.filter((e) => now - e.createdAt.getTime() < 7 * DAY).length;
    if (thisWeek >= 3)
      cands.push({ id: `hot:${t.id}`, priority: 90 + thisWeek, threadId: t.id, cue: `这周你已经第 ${thisWeek} 次回到「${t.title}」这条线了` });
  }

  // 2) 悬着最久的假设(提了没做决定)
  const openHyp = threads
    .filter((t) => t.entries.some((e) => e.kind === "hypothesis") && !t.entries.some((e) => e.kind === "decision"))
    .map((t) => {
      const h = t.entries.filter((e) => e.kind === "hypothesis").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      return { t, days: Math.floor((now - h.createdAt.getTime()) / DAY) };
    })
    .sort((a, b) => b.days - a.days)[0];
  if (openHyp && openHyp.days >= 5)
    cands.push({ id: `hyp:${openHyp.t.id}`, priority: 80 + Math.min(openHyp.days, 20), threadId: openHyp.t.id, cue: `「${openHyp.t.title}」的假设你提了 ${openHyp.days} 天,还没收口成一个决定` });

  // 3) 有判断却一直没找证据(既无 evidence Entry 也无联网 Challenge),且已放置一段时间
  const unch = threads
    .filter(
      (t) =>
        t.claim &&
        t.entries.some((e) => e.kind === "judgment") &&
        !t.entries.some((e) => e.kind === "evidence") &&
        t.challenges.length === 0,
    )
    .map((t) => ({ t, days: Math.floor((now - t.updatedAt.getTime()) / DAY) }))
    .filter((x) => x.days >= 7)
    .sort((a, b) => b.days - a.days)[0];
  if (unch)
    cands.push({ id: `unch:${unch.t.id}`, priority: 60, threadId: unch.t.id, cue: `「${unch.t.title}」是个判断,但你一直没给它找过证据` });

  // 4) inbox 散念堆积(未归入任何线)
  const inbox = entries.filter((e) => !e.threadId).length;
  if (inbox >= 8)
    cands.push({ id: `inbox:${inbox}`, priority: 50, cue: `你有 ${inbox} 条散念还飘在外面,没归进任何一条思想线` });

  if (cands.length === 0) return null;
  const pick = cands.sort((a, b) => b.priority - a.priority)[0];
  const text = await phraseNudge(pick.cue);
  return { id: pick.id, text, threadId: pick.threadId };
}

// v4 思想编年史: 读 claim 版本演变 + 线程生灭,讲成纵向故事。
export async function computeEvolution() {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id },
    include: {
      versions: { orderBy: { createdAt: "asc" } },
      entries: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const now = Date.now(), DAY = 86400000;

  // 改变了主意的地方: 有历史版本的线程(旧 claim → 现 claim)
  const turns = threads
    .filter((t) => t.versions.length > 0 && t.claim)
    .map((t) => ({
      topic: t.title,
      from: t.versions[0].claim,
      to: t.claim as string,
      reason: t.versions[t.versions.length - 1].reason ?? "",
    }))
    .filter((t) => t.from !== t.to);

  // 一直坚持: 有判断、只设过一次从没翻转(初次设 claim 也会留一个版本,故 <=1)、且已存在一段时间
  const steadfast = threads
    .filter((t) => t.claim && t.versions.length <= 1 && now - t.createdAt.getTime() > 10 * DAY)
    .map((t) => t.title);

  // 新萌发: 近两周才建立的线程
  const emerging = threads
    .filter((t) => now - t.createdAt.getTime() <= 14 * DAY)
    .map((t) => t.title);

  // 休眠: 最后一条 entry 距今 > 6 天(且非新线程)
  const dormant = threads
    .filter((t) => {
      const last = t.entries[0]?.createdAt.getTime() ?? t.createdAt.getTime();
      return now - last > 6 * DAY && now - t.createdAt.getTime() > 14 * DAY;
    })
    .map((t) => t.title);

  const firstEntry = await prisma.entry.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const weeks = firstEntry ? Math.max(1, Math.round((now - firstEntry.createdAt.getTime()) / (7 * DAY))) : 1;
  const span = `约 ${weeks} 周,${threads.length} 条思想线`;

  const story = await evolutionStory({ turns, steadfast, emerging, dormant, span });
  // 证据链: 章节里提到的思想线名 → 线程 id,前端渲染成可跳转的 chip
  const titleToId: Record<string, string> = {};
  for (const t of threads) titleToId[t.title] = t.id;
  return { story, titleToId };
}

// 认知面板: AI 诚实反思(提问 vs 消费)。
export async function reflect(): Promise<string> {
  const user = await getCurrentUser();
  const entries = await prisma.entry.findMany({ where: { userId: user.id }, select: { kind: true } });
  const cnt = (k: string) => entries.filter((e) => e.kind === k).length;
  const human =
    cnt("observation") + cnt("judgment") + cnt("question") + cnt("hypothesis") + cnt("decision");
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, claim: { not: null } },
    include: { entries: { select: { kind: true } } },
  });
  const unchallenged = threads.filter(
    (t) => t.claim && !t.entries.some((e) => e.kind === "evidence"),
  ).length;
  return reflectCognition({
    human,
    ai: cnt("ai_suggestion"),
    external: cnt("evidence"),
    questions: cnt("question"),
    observations: cnt("observation"),
    decisions: cnt("decision"),
    hypotheses: cnt("hypothesis"),
    unchallenged,
  });
}

// 每周回顾(交互 5 问): 用户亲自答,答案落成星图里的条目。
export async function saveReview(a: {
  q1: string;
  q2: string;
  q4: string;
  q5: string;
}): Promise<{ count: number }> {
  const user = await getCurrentUser();
  let count = 0;
  const mk = async (text: string, kind: string) => {
    const t = text.trim();
    if (!t) return;
    await prisma.entry.create({ data: { text: t, kind, aiSuggested: false, source: "review", userId: user.id } });
    count++;
  };
  for (const line of a.q1.split("\n")) await mk(line, "observation");
  await mk(a.q2, "judgment");
  await mk(a.q4, "hypothesis");
  await mk(a.q5, "question");
  revalidatePath("/");
  return { count };
}

// 产出: 本周思想回顾(跨所有线程)。
export async function makeWeekly(): Promise<string> {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  return generateWeekly({
    threads: threads.map((t) => ({
      title: t.title,
      claim: t.claim,
      entries: t.entries.map((e) => ({ kind: e.kind, text: e.text })),
    })),
  });
}

export async function deleteThread(threadId: string) {
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({ where: { id: threadId, userId: user.id } });
  if (!t) return;
  await prisma.entry.updateMany({ where: { threadId, userId: user.id }, data: { threadId: null } });
  await prisma.threadLink.deleteMany({
    where: { userId: user.id, OR: [{ aId: threadId }, { bId: threadId }] },
  });
  await prisma.thread.delete({ where: { id: threadId } });
  redirect("/");
}

// 跨线程主线を発見して星图に連線を張る。
export async function discoverThreadLinks(): Promise<{ count: number }> {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, status: { not: "archived" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, claim: true },
  });
  const pairs = await findThreadRelations(
    threads.map((t) => ({ title: t.title, claim: t.claim })),
  );
  let count = 0;
  for (const p of pairs) {
    const a = threads[p.a]?.id;
    const b = threads[p.b]?.id;
    if (!a || !b || a === b) continue;
    const [aId, bId] = a < b ? [a, b] : [b, a];
    await prisma.threadLink.upsert({
      where: { aId_bId: { aId, bId } },
      create: { aId, bId, reason: p.reason, userId: user.id },
      update: { reason: p.reason },
    });
    count++;
  }
  revalidatePath("/");
  return { count };
}

// Thread → 決策 Memo（Markdown 文字列を返す）。
export async function makeMemo(threadId: string): Promise<string> {
  const user = await getCurrentUser();
  const t = await prisma.thread.findFirst({
    where: { id: threadId, userId: user.id },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });
  if (!t) return "# 未找到该 Thread";
  return generateMemo({
    title: t.title,
    entries: t.entries.map((e) => ({ kind: e.kind, text: e.text })),
  });
}

// 全データを JSON でエクスポート（隐私: 完全导出 —— 含谱系/挑战/阅读/连线/简报,不丢任何一张表）。
export async function exportAll(): Promise<string> {
  const user = await getCurrentUser();
  const [threads, inbox, versions, challenges, readings, links, briefs] = await Promise.all([
    prisma.thread.findMany({ where: { userId: user.id }, include: { entries: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    prisma.entry.findMany({ where: { userId: user.id, threadId: null }, orderBy: { createdAt: "asc" } }),
    prisma.claimVersion.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.challenge.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.reading.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.threadLink.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.dailyBrief.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
  ]);
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), threads, inbox, versions, challenges, readings, links, briefs },
    null,
    2,
  );
}
