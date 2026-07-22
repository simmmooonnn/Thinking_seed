"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { computeEvolution } from "@/app/actions";

interface Story {
  headline: string;
  chapters: { title: string; body: string; threads: string[] }[];
  insight: string;
}

export default function EvolutionCard() {
  const [pending, start] = useTransition();
  const [s, setS] = useState<Story | null>(null);
  const [t2id, setT2id] = useState<Record<string, string>>({});
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        const r = await computeEvolution();
        setS(r.story);
        setT2id(r.titleToId);
      } catch {
        setErr(true);
      }
    });

  return (
    <div
      className="rounded-3xl border border-line bg-panel p-5"
      style={{ backgroundImage: "radial-gradient(500px 180px at 50% 0%, rgba(192,132,252,.09), transparent 70%)" }}
    >
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-[0.14em] text-ai">思想编年史 · 纵向看你的这段路</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-ai/50 px-3.5 py-1.5 text-sm text-ai hover:bg-ai/10 disabled:opacity-40"
        >
          {pending ? "回望中…" : s ? "重新回望" : "回望我的思想轨迹"}
        </button>
      </div>

      {err && <p className="mt-2 text-sm text-[#f87171]">回望失败,可能是网络或额度问题——过一会儿再试。</p>}

      {!s ? (
        !err && <p className="mt-2 text-sm text-muted2">画像是此刻的你;编年史是随时间的你——你在哪些问题上改了主意、坚持了什么、又长出了什么新方向。</p>
      ) : (
        <div className="mt-4 space-y-5">
          <p className="text-[clamp(17px,2.2vw,22px)] font-semibold leading-snug text-txt">{s.headline}</p>

          {s.chapters.length > 0 && (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {s.chapters.map((ch, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-ai" style={{ boxShadow: "0 0 10px rgba(192,132,252,.7)" }} />
                  <div className="text-sm font-semibold text-txt">{ch.title}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{ch.body}</p>
                  {ch.threads.length > 0 && (
                    <div className="mono mt-1.5 flex flex-wrap gap-1.5 text-[10.5px]">
                      {ch.threads.map((name, j) =>
                        t2id[name] ? (
                          <Link
                            key={j}
                            href={`/thread/${t2id[name]}`}
                            className="rounded border border-ai/40 px-1.5 py-0.5 text-ai hover:bg-ai/10"
                          >
                            {name} →
                          </Link>
                        ) : (
                          <span key={j} className="rounded border border-line px-1.5 py-0.5 text-muted2">
                            {name}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {s.insight && (
            <div className="rounded-xl border border-grow/30 bg-grow/5 px-3.5 py-2.5 text-[13.5px] text-[#e6e6ee]">
              <span className="mono mr-2 text-[11px] uppercase tracking-wider text-grow">纵向才看得见</span>
              {s.insight}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
