import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addEntryToThread } from "@/app/actions";
import CaptureBox from "@/app/ui/CaptureBox";
import EntryCard from "@/app/ui/EntryCard";
import ThreadMeta from "@/app/ui/ThreadMeta";
import PreCommit from "@/app/ui/PreCommit";
import ChallengePanel from "@/app/ui/ChallengePanel";
import LineagePanel from "@/app/ui/LineagePanel";
import MemoPanel from "@/app/ui/MemoPanel";
import ArticlePanel from "@/app/ui/ArticlePanel";
import Collapsible from "@/app/ui/Collapsible";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const thread = await prisma.thread.findFirst({
    where: { id, userId: user.id },
    include: {
      entries: { orderBy: { createdAt: "asc" } },
      versions: { orderBy: { createdAt: "asc" } },
      challenges: { where: { dismissed: false }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!thread) notFound();

  const add = addEntryToThread.bind(null, thread.id);

  return (
    <div className="space-y-6 reveal">
      <Link href="/" className="mono text-xs text-muted hover:text-txt">
        ← 返回星图
      </Link>

      <ThreadMeta
        id={thread.id}
        title={thread.title}
        question={thread.question ?? ""}
        claim={thread.claim ?? ""}
        status={thread.status}
      />

      <section>
        <div className="mono mb-2 text-xs uppercase tracking-wider text-muted">
          推理时间线 ({thread.entries.length})
        </div>
        <div className="space-y-2.5">
          {thread.entries.map((e) => (
            <EntryCard
              key={e.id}
              entry={{
                id: e.id,
                text: e.text,
                kind: e.kind,
                aiSuggested: e.aiSuggested,
                threadId: e.threadId,
                audioUrl: e.audioUrl,
                imageUrl: e.imageUrl,
              }}
            />
          ))}
          {thread.entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted2">
              还没有条目。在下面加入你的观察、假设、证据或决定。
            </p>
          )}
        </div>
        <div className="mt-3">
          <CaptureBox action={add} placeholder="加入一条观察 / 假设 / 证据 / 决定…" cta="加入" />
        </div>
      </section>

      {/* 只展开"此刻有意义的": 空面板收成一行,想用随时点开 */}
      <Collapsible label="⚡ 提交前检查 · 下结论之前拦你一下" defaultOpen={!!thread.claim}>
        <PreCommit
          threadId={thread.id}
          claim={thread.claim ?? ""}
          comp={{
            observation: thread.entries.filter((e) => e.kind === "observation").length,
            evidence: thread.entries.filter((e) => e.kind === "evidence").length,
            ai_suggestion: thread.entries.filter((e) => e.kind === "ai_suggestion").length,
            hypothesis: thread.entries.filter((e) => e.kind === "hypothesis").length,
            decision: thread.entries.filter((e) => e.kind === "decision").length,
          }}
          versions={thread.versions.length}
          prevClaim={thread.versions.length > 1 ? thread.versions[thread.versions.length - 2].claim : null}
        />
      </Collapsible>

      <Collapsible label="⚔️ Active Seed · 让 AI 上网找反例/证据" defaultOpen={thread.challenges.length > 0}>
        <ChallengePanel
          threadId={thread.id}
          cards={thread.challenges.map((c) => ({
            id: c.id,
            stance: c.stance,
            text: c.text,
            sourceTitle: c.sourceTitle,
            url: c.url,
          }))}
        />
      </Collapsible>

      <Collapsible label="📜 思想谱系 · 这个判断怎么一路改过来" defaultOpen={thread.versions.length > 0}>
        <LineagePanel
          threadId={thread.id}
          versions={thread.versions.map((v) => ({
            id: v.id,
            claim: v.claim,
            reason: v.reason,
            createdAt: v.createdAt.toISOString(),
          }))}
        />
      </Collapsible>

      <Collapsible label="📝 产出 · 生成决策 Memo" defaultOpen={false}>
        <MemoPanel threadId={thread.id} title={thread.title} />
      </Collapsible>

      <Collapsible label="✍️ Create · 写成文章 / 演讲提纲 / 推文串" defaultOpen={false}>
        <ArticlePanel threadId={thread.id} title={thread.title} />
      </Collapsible>
    </div>
  );
}
