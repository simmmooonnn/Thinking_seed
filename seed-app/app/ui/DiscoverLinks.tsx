"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { discoverThreadLinks } from "@/app/actions";

export default function DiscoverLinks() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        setDone((await discoverThreadLinks()).count);
      } catch {
        setErr(true);
      }
    });

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-ai">主线 · 跨线程发现</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-ai/50 px-3.5 py-1.5 text-sm text-ai hover:bg-ai/10 disabled:opacity-40"
        >
          {pending ? "分析中…" : "发现思想主线"}
        </button>
      </div>
      {err ? (
        <p className="mt-3 text-sm text-[#f87171]">分析失败,过一会儿再试。</p>
      ) : done === null ? (
        <p className="mt-3 text-sm text-muted2">
          让 AI 找出你不同线程背后共享的母题,并在星图里把它们连成一条主线(紫色虚线)。
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {done > 0 ? (
            <>
              连了 <span className="text-ai font-semibold">{done}</span> 条主线 ——{" "}
              <Link href="/" className="text-grow hover:underline">回星图看看 →</Link>
            </>
          ) : (
            "暂时没发现明显共享母题的线程(线程再多一点会更有意思)。"
          )}
        </p>
      )}
    </div>
  );
}
