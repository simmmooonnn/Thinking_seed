import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ReadingButton from "@/app/ui/ReadingButton";
import DismissReading from "@/app/ui/DismissReading";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const user = await getCurrentUser();
  const threads = await prisma.thread.findMany({
    where: { userId: user.id, readings: { some: { dismissed: false } } },
    orderBy: { updatedAt: "desc" },
    include: { readings: { where: { dismissed: false }, orderBy: { createdAt: "desc" } } },
  });

  const total = threads.reduce((s, t) => s + t.readings.length, 0);

  return (
    <div className="space-y-6 reveal">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">推荐阅读</h1>
          <p className="mt-1 text-sm text-muted">
            根据你自己的每个想法,Seed 从网上找来相关、值得读的文章与论文。{total > 0 && ` 目前 ${total} 篇。`}
          </p>
        </div>
        <ReadingButton />
      </div>

      {threads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted2">
          还没有推荐。点右上角「为线程找推荐阅读」,让 Seed 联网为你的想法找几篇好文章。
        </p>
      ) : (
        <div className="space-y-6">
          {threads.map((t) => (
            <section key={t.id}>
              <Link href={`/thread/${t.id}`} className="mono text-xs uppercase tracking-wider text-grow hover:underline">
                ↳ {t.title}
              </Link>
              <div className="mt-2 space-y-2">
                {t.readings.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line bg-panel p-3.5" style={{ borderLeft: "3px solid var(--evi)" }}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-txt hover:text-evi">
                            {r.title} ↗
                          </a>
                        ) : (
                          <span className="text-[15px] font-medium text-txt">{r.title}</span>
                        )}
                        {r.source && <span className="mono ml-2 text-[11px] text-muted2">{r.source}</span>}
                        {r.summary && <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.summary}</p>}
                      </div>
                      <DismissReading id={r.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
