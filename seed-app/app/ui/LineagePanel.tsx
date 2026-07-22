"use client";

import { useState, useTransition } from "react";
import { setVersionReason, explainThreadLineage } from "@/app/actions";
import { renderMarkdown } from "@/lib/md";

export interface Version {
  id: string;
  claim: string;
  reason: string | null;
  createdAt: string;
}

export default function LineagePanel({
  threadId,
  versions,
}: {
  threadId: string;
  versions: Version[];
}) {
  const [pending, start] = useTransition();
  const [explain, setExplain] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-xs uppercase tracking-wider text-evi">思想谱系 · 判断如何改变</span>
        {versions.length >= 2 && (
          <button
            onClick={() => start(async () => { try { setExplain(await explainThreadLineage(threadId)); } catch { setExplain("解释失败,过一会儿再试。"); } })}
            disabled={pending}
            className="mono ml-auto rounded-lg border border-evi/50 px-3 py-1.5 text-xs text-evi hover:bg-evi/10 disabled:opacity-40"
          >
            {pending ? "分析中…" : "解释演化"}
          </button>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="mt-3 text-sm text-muted2">
          还没有版本。在上面写下/修改「当前判断」,每次实质变化都会在这里留下一版。
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {versions.map((v, i) => (
            <li key={v.id} className="relative grid grid-cols-[auto_1fr] gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="mono flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: i === versions.length - 1 ? "var(--grow)" : "var(--panel2)",
                    color: i === versions.length - 1 ? "#04140d" : "var(--muted)",
                    border: i === versions.length - 1 ? "none" : "1px solid var(--line2)",
                  }}
                >
                  v{i + 1}
                </div>
                {i < versions.length - 1 && (
                  <div className="my-1 w-px flex-1" style={{ background: "var(--line2)" }} />
                )}
              </div>
              <div className="pb-5">
                <p className="text-[15px] leading-relaxed text-txt">{v.claim}</p>
                <input
                  defaultValue={v.reason ?? ""}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== (v.reason ?? "")) start(() => setVersionReason(v.id, val));
                  }}
                  placeholder="为什么改成这样?(写一句触发它的证据/反例)"
                  className="mono mt-1.5 w-full bg-transparent text-[12px] text-evi outline-none placeholder:text-muted2"
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {explain && (
        <div
          className="md mt-3 border-t border-line pt-3 text-[14px] text-[#d6d6de]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(explain) }}
        />
      )}
    </div>
  );
}
