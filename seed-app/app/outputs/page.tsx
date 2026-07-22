import Link from "next/link";
import { prisma } from "@/lib/db";
import WeeklyPanel from "@/app/ui/WeeklyPanel";
import ReviewForm from "@/app/ui/ReviewForm";
import DiscoverLinks from "@/app/ui/DiscoverLinks";

export const dynamic = "force-dynamic";

export default async function OutputsPage() {
  const threads = await prisma.thread.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <div className="space-y-6 reveal">
      <h1 className="text-lg font-semibold">产出</h1>
      <ReviewForm />
      <WeeklyPanel />
      <DiscoverLinks />

      <section>
        <div className="mono mb-2 text-xs uppercase tracking-wider text-muted">
          按线程生成决策 Memo
        </div>
        {threads.length === 0 ? (
          <p className="text-sm text-muted2">还没有线程。</p>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/thread/${t.id}`}
                className="flex items-center gap-2 rounded-xl border border-line bg-panel p-3.5 hover:border-line2"
              >
                <span className="font-medium">{t.title}</span>
                <span className="mono ml-auto text-[11px] text-muted2">
                  {t._count.entries} 条 · 进入生成 →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
