import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dailyQuestion } from "@/lib/ai";
import { gatherQuestionSignals } from "@/lib/signals";
import RefreshQuestion from "@/app/ui/RefreshQuestion";

export const dynamic = "force-dynamic";

const HUMAN = ["observation", "judgment", "question", "hypothesis", "decision"];
const CN_DATE = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Role({
  icon,
  name,
  accent,
  children,
}: {
  icon: string;
  name: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5" style={{ borderTop: `2px solid ${accent}` }}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-[15px]">{icon}</span>
        <span className="mono text-[11px] uppercase tracking-[0.14em]" style={{ color: accent }}>{name}</span>
      </div>
      <div className="space-y-1.5 text-[13.5px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export default async function BriefPage() {
  const user = await getCurrentUser();
  const now = Date.now();
  const WEEK = 7 * 86400000;

  const [entries, threads, versions, challenges, activeThreads] = await Promise.all([
    prisma.entry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { kind: true, createdAt: true, threadId: true } }),
    prisma.thread.findMany({ where: { userId: user.id }, include: { _count: { select: { entries: true } } } }),
    prisma.claimVersion.findMany({ where: { thread: { userId: user.id } }, orderBy: { createdAt: "desc" }, take: 4, include: { thread: { select: { id: true, title: true } } } }),
    prisma.challenge.findMany({ where: { dismissed: false, thread: { userId: user.id } }, orderBy: { createdAt: "desc" }, take: 3, include: { thread: { select: { id: true, title: true } } } }),
    prisma.thread.findMany({ where: { userId: user.id, status: { in: ["seed", "developing"] } }, orderBy: { updatedAt: "desc" }, take: 20, select: { title: true, claim: true } }),
  ]);

  // 每日缓存: 今天的头条问题只生成一次
  const date = localDateKey();
  let brief = await prisma.dailyBrief.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (!brief) {
    const signals = await gatherQuestionSignals(user.id);
    const q = await dailyQuestion(activeThreads.map((t) => ({ title: t.title, claim: t.claim })), signals);
    // upsert 而非 create: 同一天并发首访不会撞 date 唯一约束报 500
    brief = await prisma.dailyBrief.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { date, question: q, userId: user.id },
      update: {},
    });
  }

  const recent = entries.filter((e) => now - e.createdAt.getTime() < WEEK);
  const inbox = entries.filter((e) => !e.threadId).length;
  const dormant = threads
    .filter((t) => (t.status === "seed" || t.status === "developing") && now - t.updatedAt.getTime() > 4 * 86400000 && t._count.entries > 0)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 2);
  const veryDormant = threads.filter((t) => now - t.updatedAt.getTime() > 10 * 86400000).length;

  return (
    <div className="reveal space-y-6">
      <div className="flex items-center justify-between">
        <span className="mono text-[11px] uppercase tracking-[0.2em] text-muted2">今日思想简报 · SEED DAILY</span>
        <span className="mono text-[11px] text-muted2">{CN_DATE.format(new Date())}</span>
      </div>

      {/* 头条: 今天的问题 */}
      <section className="rounded-3xl border border-line bg-panel px-6 py-10 text-center"
        style={{ backgroundImage: "radial-gradient(600px 200px at 50% 0%, rgba(192,132,252,.08), transparent 70%)" }}>
        <div className="mono mb-4 text-[11px] uppercase tracking-[0.2em] text-ai">❓ 今天值得想一小时</div>
        <p className="mx-auto max-w-2xl font-semibold leading-snug text-txt" style={{ fontSize: "clamp(22px,3.4vw,33px)" }}>
          {brief.question}
        </p>
        <div className="mt-5">
          <RefreshQuestion />
        </div>
      </section>

      {/* 四个角色 · 极简 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Role icon="🎧" name="Listener" accent="#34d399">
          <p>
            近七日记下 <span className="font-semibold text-grow">{recent.length}</span> 条。
          </p>
          {inbox > 0 ? (
            <p className="text-muted2">有些散念还飘着——不急,想安置的时候去星图看看。</p>
          ) : (
            <p className="text-muted2">捕获都归好位了。</p>
          )}
        </Role>

        <Role icon="📜" name="Historian" accent="#60a5fa">
          {versions.length > 0 ? (
            versions.slice(0, 2).map((v) => (
              <p key={v.id} className="truncate">
                <Link href={`/thread/${v.thread.id}`} className="text-evi hover:underline">{v.thread.title}</Link> 的判断更新了。
              </p>
            ))
          ) : (
            <p className="text-muted2">还没有判断的版本变化。</p>
          )}
          {dormant.length > 0 && <p className="text-muted2">🌙 该重想:{dormant.map((t) => t.title).join("、")}。</p>}
        </Role>

        <Role icon="⚔️" name="Critic" accent="#f87171">
          {challenges.length > 0 ? (
            challenges.map((ch) => (
              <p key={ch.id}>
                <span className="text-[#f87171]">[{ch.stance === "contradiction" ? "自相矛盾" : ch.stance === "support" ? "佐证" : "反例"}]</span>{" "}
                <Link href={`/thread/${ch.thread.id}`} className="hover:text-txt">{ch.text.length > 34 ? ch.text.slice(0, 34) + "…" : ch.text}</Link>
              </p>
            ))
          ) : (
            <p className="text-muted2">暂无挑战。后台会陆续替你搜集。</p>
          )}
        </Role>

        <Role icon="🌱" name="Gardener" accent="#a78bfa">
          {veryDormant > 0 && <p>· 有几条旧线在沉睡——把一条连到今天的想法,比整理十条更有用。</p>}
          <p>· 去<Link href="/mind" className="text-grow hover:underline">「认知」</Link>看你的长期主线。</p>
        </Role>
      </div>

      <p className="mono pt-2 text-center text-[11px] text-muted2">每天自然更新一次 · 由你自己的思想生成</p>
    </div>
  );
}
