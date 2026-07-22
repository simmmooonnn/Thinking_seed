"use client";

import { useState, useTransition } from "react";
import { makeWeekly } from "@/app/actions";
import { renderMarkdown } from "@/lib/md";

export default function WeeklyPanel() {
  const [pending, start] = useTransition();
  const [md, setMd] = useState<string | null>(null);

  function download() {
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seed-weekly-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-grow">产出 · 本周思想回顾</span>
        <div className="ml-auto flex items-center gap-2">
          {md && (
            <>
              <button
                onClick={() => navigator.clipboard.writeText(md)}
                className="mono rounded border border-line px-2.5 py-1 text-[11px] text-muted hover:text-txt"
              >
                复制
              </button>
              <button
                onClick={download}
                className="mono rounded border border-line px-2.5 py-1 text-[11px] text-muted hover:text-txt"
              >
                下载 .md
              </button>
            </>
          )}
          <button
            onClick={() => start(async () => { try { setMd(await makeWeekly()); } catch { setMd("_生成失败,过一会儿再试。_"); } })}
            disabled={pending}
            className="rounded-lg bg-grow px-3.5 py-1.5 text-sm font-semibold text-[#04140d] hover:brightness-110 disabled:opacity-40"
          >
            {pending ? "生成中…" : md ? "重新生成" : "生成本周回顾"}
          </button>
        </div>
      </div>
      {md ? (
        <div
          className="md mt-4 border-t border-line pt-4 text-[15px] text-[#d6d6de]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
        />
      ) : (
        <p className="mt-3 text-sm text-muted2">
          只回答 5 件事:本周有哪些真正属于你的新观察 · 哪个想法变了 · 哪些只是消费信息 · 最该验证哪个假设 · 下周只保留哪个问题。
        </p>
      )}
    </div>
  );
}
