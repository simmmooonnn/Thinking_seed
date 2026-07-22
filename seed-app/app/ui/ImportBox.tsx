"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { importText } from "@/app/actions";

export default function ImportBox() {
  const [text, setText] = useState("");
  const [split, setSplit] = useState(true);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  function run() {
    if (!text.trim() || pending) return;
    start(async () => {
      const r = await importText(text, split);
      setDone(r.count);
      setText("");
    });
  }

  return (
    <div className="rounded-2xl border border-line2 bg-panel p-4">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setDone(null); }}
        rows={8}
        placeholder="粘贴一段 ChatGPT / Claude 对话,或任意文字…"
        className="w-full resize-y rounded-xl bg-panel2 p-3 text-[14px] leading-relaxed outline-none placeholder:text-muted2 focus:ring-1 focus:ring-grow/40"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="mono flex cursor-pointer items-center gap-2 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={split}
            onChange={(e) => setSplit(e.target.checked)}
            className="accent-grow"
          />
          让 AI 拆成多条要点(区分你的判断 / AI 建议)
        </label>
        <button
          onClick={run}
          disabled={pending || !text.trim()}
          className="ml-auto rounded-lg bg-grow px-4 py-1.5 text-sm font-semibold text-[#04140d] hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "导入中…" : "导入"}
        </button>
      </div>
      {done !== null && (
        <p className="mt-3 text-sm text-grow">
          ✓ 导入了 {done} 条 —{" "}
          <Link href="/" className="underline hover:brightness-110">回星图看看 →</Link>
        </p>
      )}
    </div>
  );
}
