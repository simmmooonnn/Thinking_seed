"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveReview } from "@/app/actions";

const QS = [
  { key: "q1", label: "本周产生了哪些真正属于你的新观察?", hint: "每行一条,会各存成一颗星", rows: 3 },
  { key: "q2", label: "哪个想法发生了实质变化?", hint: "存成一条判断", rows: 2 },
  { key: "q3", label: "哪些内容只是消费或转述外部信息?", hint: "只是自省,不保存", rows: 2 },
  { key: "q4", label: "哪个假设最值得在现实中验证?", hint: "存成一条假设", rows: 2 },
  { key: "q5", label: "下周只保留哪一个问题继续思考?", hint: "存成一个问题", rows: 2 },
] as const;

export default function ReviewForm() {
  const [v, setV] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mono mb-1 text-xs uppercase tracking-wider text-grow">每周回顾 · 你亲自答的 5 个问题</div>
      <p className="mb-3 text-sm text-muted2">这是 human-first 的回顾:不是让 AI 总结你,而是你自己回答。答案会变成星图里的星。</p>
      <div className="space-y-3">
        {QS.map((q) => (
          <div key={q.key}>
            <label className="text-sm text-txt">{q.label}</label>
            <textarea
              value={v[q.key] ?? ""}
              onChange={(e) => { setV((s) => ({ ...s, [q.key]: e.target.value })); setDone(null); }}
              rows={q.rows}
              placeholder={q.hint}
              className="mt-1 w-full resize-none rounded-lg bg-panel2 p-2.5 text-[14px] outline-none placeholder:text-muted2 focus:ring-1 focus:ring-grow/40"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {done !== null && (
          <span className="text-sm text-grow">
            ✓ 存了 {done} 条 — <Link href="/" className="underline">回星图看看 →</Link>
          </span>
        )}
        <button
          onClick={() =>
            start(async () => {
              const r = await saveReview({
                q1: v.q1 ?? "", q2: v.q2 ?? "", q4: v.q4 ?? "", q5: v.q5 ?? "",
              });
              setDone(r.count);
              setV({});
            })
          }
          disabled={pending}
          className="ml-auto rounded-lg bg-grow px-4 py-1.5 text-sm font-semibold text-[#04140d] hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "保存中…" : "保存本周回顾"}
        </button>
      </div>
    </div>
  );
}
