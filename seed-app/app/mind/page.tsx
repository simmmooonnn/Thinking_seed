import Link from "next/link";
import { prisma } from "@/lib/db";
import ReflectButton from "@/app/ui/ReflectButton";
import MainlinesButton from "@/app/ui/MainlinesButton";
import ContradictionsButton from "@/app/ui/ContradictionsButton";
import GrowthCurve, { type Week } from "@/app/ui/GrowthCurve";
import ProfileCard from "@/app/ui/ProfileCard";
import EvolutionCard from "@/app/ui/EvolutionCard";
import { kindMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const HUMAN = ["observation", "judgment", "question", "hypothesis", "decision"];

export default async function MindPage() {
  const [entries, threads, links] = await Promise.all([
    prisma.entry.findMany({ select: { kind: true, createdAt: true } }),
    prisma.thread.findMany({ include: { entries: { select: { kind: true } } } }),
    prisma.threadLink.findMany(),
  ]);

  // 近 8 周の週次バケット
  const WEEKS = 8;
  const now = Date.now();
  const weeks: Week[] = Array.from({ length: WEEKS }, (_, i) => ({
    label: WEEKS - 1 - i === 0 ? "本周" : `${WEEKS - 1 - i}周前`,
    original: 0,
    total: 0,
    pct: 0,
  }));
  for (const e of entries) {
    const weeksAgo = Math.floor((now - e.createdAt.getTime()) / (7 * 86400000));
    if (weeksAgo < 0 || weeksAgo >= WEEKS) continue;
    const idx = WEEKS - 1 - weeksAgo;
    weeks[idx].total++;
    if (HUMAN.includes(e.kind)) weeks[idx].original++;
  }
  for (const w of weeks) w.pct = w.total ? Math.round((w.original / w.total) * 100) : 0;

  const cnt = (k: string) => entries.filter((e) => e.kind === k).length;
  const human = HUMAN.reduce((s, k) => s + cnt(k), 0);
  const ai = cnt("ai_suggestion");
  const external = cnt("evidence");
  const total = human + ai + external || 1;
  const humanPct = Math.round((human / total) * 100);

  const unchallenged = threads.filter(
    (t) => t.claim && !t.entries.some((e) => e.kind === "evidence"),
  );
  const ripe = threads.filter((t) => t.entries.some((e) => e.kind === "hypothesis"));

  const tile = (k: string) => ({ label: kindMeta(k).label, n: cnt(k), c: kindMeta(k).dot });
  const tiles = ["observation", "judgment", "question", "hypothesis", "decision", "ai_suggestion", "evidence"].map(tile);

  return (
    <div className="space-y-6 reveal">
      <div>
        <h1 className="text-lg font-semibold">认知面板</h1>
        <p className="mt-1 text-sm text-muted">
          不是笔记数量,而是——你有没有在<strong className="text-txt">形成属于自己的问题与判断</strong>。
        </p>
      </div>

      <ProfileCard />

      <EvolutionCard />

      <GrowthCurve weeks={weeks} />

      {/* 作者占比 = 北极星 */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <div className="mono mb-2 text-xs uppercase tracking-wider text-muted">
          第一作者占比 · 你的原创 vs 消费/外部
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-grow">{humanPct}%</span>
          <span className="mb-1 text-sm text-muted">是你自己的观察 / 判断 / 问题 / 假设 / 决定</span>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-panel2">
          <div style={{ width: `${(human / total) * 100}%`, background: "var(--grow)" }} />
          <div style={{ width: `${(ai / total) * 100}%`, background: "var(--ai)" }} />
          <div style={{ width: `${(external / total) * 100}%`, background: "var(--evi)" }} />
        </div>
        <div className="mono mt-2 flex gap-4 text-[11px] text-muted2">
          <span>🟢 你的 {human}</span>
          <span>🟣 AI建议 {ai}</span>
          <span>🔵 外部 {external}</span>
        </div>
      </section>

      {/* 分类计数 */}
      <section className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-panel p-3">
            <div className="text-2xl font-semibold" style={{ color: t.c }}>{t.n}</div>
            <div className="mono mt-0.5 text-[11px] text-muted2">{t.label}</div>
          </div>
        ))}
      </section>

      <ReflectButton />

      <MainlinesButton />

      <ContradictionsButton />

      {/* 还没被证据挑战的判断 */}
      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="mono mb-2 text-xs uppercase tracking-wider text-amber">
          还没被证据挑战的判断 ({unchallenged.length})
        </div>
        {unchallenged.length === 0 ? (
          <p className="text-sm text-muted2">你的判断都有证据支撑 —— 不错。</p>
        ) : (
          <div className="space-y-1.5">
            {unchallenged.map((t) => (
              <Link key={t.id} href={`/thread/${t.id}`} className="block rounded-lg border border-line bg-panel2 px-3 py-2 text-sm hover:border-amber/40">
                {t.title}
                {t.claim && <span className="mt-0.5 block truncate text-[12px] text-muted">↳ {t.claim}</span>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 该验证的假设 */}
      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="mono mb-2 text-xs uppercase tracking-wider text-grow">
          手上待验证的假设 ({ripe.length})
        </div>
        {ripe.length === 0 ? (
          <p className="text-sm text-muted2">还没有可验证的假设。</p>
        ) : (
          <div className="space-y-1.5">
            {ripe.map((t) => (
              <Link key={t.id} href={`/thread/${t.id}`} className="block rounded-lg border border-line bg-panel2 px-3 py-2 text-sm hover:border-grow/40">
                {t.title}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 反复出现的主线 */}
      {links.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="mono mb-2 text-xs uppercase tracking-wider text-ai">反复出现的主线</div>
          <ul className="space-y-1 text-sm text-muted">
            {links.map((l) => (
              <li key={l.id}>· {l.reason ?? "两个线程相关"}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
