"use client";

import { useState, useTransition } from "react";
import { mainlines } from "@/app/actions";

export default function MainlinesButton() {
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<{ name: string; why: string; titles: string[] }[] | null>(null);
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        setLines(await mainlines());
      } catch {
        setErr(true);
      }
    });

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-grow">长期主线 · 反复出现的母题</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-grow/50 px-3.5 py-1.5 text-sm text-grow hover:bg-grow/10 disabled:opacity-40"
        >
          {pending ? "提炼中…" : lines ? "重新提炼" : "找出我的长期主线"}
        </button>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-[#f87171]">提炼失败,过一会儿再试。</p>
      ) : lines === null ? (
        <p className="mt-2 text-sm text-muted2">
          AI 从你所有线程之上,提炼那条可能成为长期研究方向或创业主线的深层母题。
        </p>
      ) : lines.length === 0 ? (
        <p className="mt-3 text-sm text-muted2">还没有贯穿多条线程的主线——线程再多一点会更清楚。</p>
      ) : (
        <div className="mt-3 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="rounded-xl border border-line bg-panel2 p-3" style={{ borderLeft: "3px solid var(--grow)" }}>
              <div className="text-[15px] font-semibold text-txt">{l.name}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{l.why}</p>
              {l.titles.length > 0 && (
                <div className="mono mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted2">
                  {l.titles.map((t, j) => (
                    <span key={j} className="rounded border border-line px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
