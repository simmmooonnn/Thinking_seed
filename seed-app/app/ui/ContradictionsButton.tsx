"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { scanContradictions } from "@/app/actions";

export default function ContradictionsButton() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);
  const [err, setErr] = useState(false);

  const run = () =>
    start(async () => {
      setErr(false);
      try {
        setDone((await scanContradictions()).count);
      } catch {
        setErr(true);
      }
    });

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-amber">自相矛盾 · 你自己在打架的判断</span>
        <button
          onClick={run}
          disabled={pending}
          className="ml-auto rounded-lg border border-amber/50 px-3.5 py-1.5 text-sm text-amber hover:bg-amber/10 disabled:opacity-40"
        >
          {pending ? "扫描中…" : "找出我的自相矛盾"}
        </button>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-[#f87171]">扫描失败,过一会儿再试。</p>
      ) : done === null ? (
        <p className="mt-2 text-sm text-muted2">AI 检查你所有线程的判断,找出互相冲突/前后不一致的地方,做成挑战卡挂到对应线程上。</p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {done > 0 ? (
            <>找到 <span className="font-semibold text-amber">{done}</span> 处矛盾,已挂到对应线程 · <Link href="/" className="text-grow underline">回星图看看(红点线程)→</Link></>
          ) : (
            "没发现明显的自相矛盾 —— 你的判断挺一致。"
          )}
        </p>
      )}
    </div>
  );
}
