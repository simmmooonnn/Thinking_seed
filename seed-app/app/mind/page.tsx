import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTodayProfile } from "@/app/actions";
import GrowthCurve, { type Week } from "@/app/ui/GrowthCurve";
import MoreInsights from "@/app/ui/MoreInsights";
import RefreshProfile from "@/app/ui/RefreshProfile";
import { kindMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const HUMAN = ["observation", "judgment", "question", "hypothesis", "decision"];

// 今日画像: 零点击即见。当天首次访问生成并缓存;Suspense 流式送达,不卡住页面其余部分。
async function ProfileHero() {
  const { profile, basis } = await getTodayProfile();
  const empty = profile.strengths.length === 0 && profile.blindspots.length === 0;
  return (
    <section
      className="rounded-3xl border border-line bg-panel p-5"
      style={{ backgroundImage: "radial-gradient(500px 180px at 50% 0%, rgba(52,211,153,.08), transparent 70%)" }}
    >
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-[0.14em] text-grow">今日认知画像 · 你的思维指纹</span>
        <span className="ml-auto">
          <RefreshProfile />
        </span>
      </div>

      {empty ? (
        <p className="mt-2 text-sm text-muted2">{profile.fingerprint}</p>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-[clamp(17px,2.2vw,22px)] font-semibold leading-snug text-txt">“{profile.fingerprint}”</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mono mb-1.5 text-[11px] uppercase tracking-wider text-grow">长处</div>
              <ul className="space-y-1 text-[13.5px] leading-relaxed text-muted">
                {profile.strengths.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mono mb-1.5 text-[11px] uppercase tracking-wider text-amber">盲区</div>
              <ul className="space-y-1 text-[13.5px] leading-relaxed text-muted">
                {profile.blindspots.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
            </div>
          </div>
          {profile.nudge && (
            <div className="rounded-xl border border-ai/30 bg-ai/5 px-3.5 py-2.5 text-[13.5px] text-[#e6e6ee]">
              <span className="mono mr-2 text-[11px] uppercase tracking-wider text-ai">今天试试</span>
              {profile.nudge}
            </div>
          )}
          <p className="mono border-t border-line/60 pt-2.5 text-[10.5px] leading-relaxed text-muted2">
            依据:{basis.entries} 条记录 · {basis.threads} 条思想线 · 第一作者 {basis.authorPct}% ·{" "}
            {basis.unchallenged} 个判断无证据 · {basis.openHypotheses} 个假设未收口 · 收件箱 {basis.inbox} 条 ——
            画像只是索引,原始记录都在星图里。
          </p>
        </div>
      )}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <section className="rounded-3xl border border-line bg-panel p-5">
      <span className="mono text-xs uppercase tracking-[0.14em] text-grow">今日认知画像 · 你的思维指纹</span>
      <p className="mt-3 animate-pulse text-sm text-muted2">Seed 正在回看你的全部记录,画今天的思维指纹…</p>
    </section>
  );
}

export default async function MindPage() {
  const user = await getCurrentUser();
  const [entries, threads, links] = await Promise.all([
    prisma.entry.findMany({ where: { userId: user.id }, select: { kind: true, createdAt: true } }),
    prisma.thread.findMany({ where: { userId: user.id }, include: { entries: { select: { kind: true } } } }),
    prisma.threadLink.findMany({ where: { userId: user.id } }),
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
    <div className="space-y-5 reveal">
      <div>
        <h1 className="text-lg font-semibold">认知面板</h1>
        <p className="mt-1 text-sm text-muted">
          不是笔记数量,而是——你有没有在<strong className="text-txt">形成属于自己的问题与判断</strong>。
        </p>
      </div>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileHero />
      </Suspense>

      <MoreInsights />

      <GrowthCurve weeks={weeks} />

      {/* 作者占比 = 北极星 */}
      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="mono mb-2 text-[11px] uppercase tracking-wider text-muted2">
          第一作者占比 · 你的原创 vs 消费/外部
        </div>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold text-grow">{humanPct}%</span>
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

      {/* 还没被证据挑战的判断 */}
      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="mono mb-2 text-[11px] uppercase tracking-wider text-amber">
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
        <div className="mono mb-2 text-[11px] uppercase tracking-wider text-grow">
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
          <div className="mono mb-2 text-[11px] uppercase tracking-wider text-ai">反复出现的主线</div>
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
