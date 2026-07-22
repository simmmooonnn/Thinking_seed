"use client";

import { useState, useTransition } from "react";
import { makeArticle } from "@/app/actions";
import { renderMarkdown } from "@/lib/md";

const FORMATS = [
  { key: "essay", label: "文章" },
  { key: "talk", label: "演讲提纲" },
  { key: "proposal", label: "研究 proposal" },
  { key: "thread", label: "推文串" },
];

export default function ArticlePanel({ threadId, title }: { threadId: string; title: string }) {
  const [pending, start] = useTransition();
  const [md, setMd] = useState<string | null>(null);
  const [fmt, setFmt] = useState("essay");
  const [note, setNote] = useState<string | null>(null);

  const generate = () =>
    start(async () => {
      setNote(null);
      try {
        setMd(await makeArticle(threadId, fmt));
      } catch {
        setNote("生成失败,过一会儿再试。");
      }
    });

  async function copy() {
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      setNote("已复制");
    } catch {
      setNote("复制失败,请手动选择文本");
    }
    setTimeout(() => setNote(null), 2000);
  }

  function download() {
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]/g, "_")}-${fmt}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono text-xs uppercase tracking-wider text-ai">Create · 写成一篇</span>
        <div className="ml-auto flex items-center gap-2">
          {note && <span className="mono text-[11px] text-grow">{note}</span>}
          {md && (
            <>
              <button onClick={copy} className="mono rounded border border-line px-2.5 py-1 text-[11px] text-muted hover:text-txt">复制</button>
              <button onClick={download} className="mono rounded border border-line px-2.5 py-1 text-[11px] text-muted hover:text-txt">下载 .md</button>
            </>
          )}
          <button
            onClick={generate}
            disabled={pending}
            className="rounded-lg border border-ai/50 px-3.5 py-1.5 text-sm text-ai hover:bg-ai/10 disabled:opacity-40"
          >
            {pending ? "写作中…" : "生成"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFmt(f.key)}
            className="mono rounded-md border px-2.5 py-1 text-[11px] transition"
            style={{
              color: fmt === f.key ? "var(--ai)" : "var(--muted)",
              borderColor: fmt === f.key ? "rgba(192,132,252,.5)" : "var(--line)",
              background: fmt === f.key ? "rgba(192,132,252,.08)" : "transparent",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {md ? (
        <div className="md mt-4 border-t border-line pt-4 text-[15px] text-[#d6d6de]" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
      ) : (
        <p className="mt-3 text-sm text-muted2">把这条线程的观察、判断、证据、反例,顺成一篇作品——选个形态,把零散感悟变成文章 / 演讲 / 研究 proposal / 推文串。</p>
      )}
    </div>
  );
}
