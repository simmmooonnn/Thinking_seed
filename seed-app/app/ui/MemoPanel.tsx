"use client";

import { useState, useTransition } from "react";
import { makeMemo } from "@/app/actions";
import { renderMarkdown } from "@/lib/md";

export default function MemoPanel({ threadId, title }: { threadId: string; title: string }) {
  const [pending, start] = useTransition();
  const [memo, setMemo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function gen() {
    start(async () => {
      setNote(null);
      try {
        setMemo(await makeMemo(threadId));
      } catch {
        setNote("生成失败,过一会儿再试。");
      }
    });
  }

  async function copy() {
    if (!memo) return;
    try {
      await navigator.clipboard.writeText(memo);
      setNote("已复制");
    } catch {
      setNote("复制失败,请手动选择");
    }
    setTimeout(() => setNote(null), 2000);
  }

  function download() {
    if (!memo) return;
    const blob = new Blob([memo], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]/g, "_")}-memo.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-grow">产出 · 决策 Memo</span>
        <div className="ml-auto flex items-center gap-2">
          {note && <span className="mono text-[11px] text-grow">{note}</span>}
          {memo && (
            <>
              <button
                onClick={copy}
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
            onClick={gen}
            disabled={pending}
            className="rounded-lg bg-grow px-3.5 py-1.5 text-sm font-semibold text-[#04140d] hover:brightness-110 disabled:opacity-40"
          >
            {pending ? "生成中…" : memo ? "重新生成" : "一键生成"}
          </button>
        </div>
      </div>
      {memo ? (
        <div
          className="md mt-4 border-t border-line pt-4 text-[15px] text-[#d6d6de]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(memo) }}
        />
      ) : (
        <p className="mt-3 text-sm text-muted2">
          把这个线程里的观察、判断、证据和决定,整理成一页带来源的决策 Memo。
        </p>
      )}
    </div>
  );
}
