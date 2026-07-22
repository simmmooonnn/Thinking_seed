"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import EntryPopover, { type EntryNode } from "./EntryPopover";
import { moveEntryToThread } from "@/app/actions";

export interface GNode {
  id: string;
  rid?: string;
  type: "root" | "thread" | "entry" | "version";
  label: string;
  full?: string;
  kind?: string;
  color: string;
  r: number;
  dormant?: boolean;
  challenged?: boolean;
  aiSuggested?: boolean;
  linkSuggested?: boolean;
  threadId?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  claim?: string;
  versions?: string[];
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
  __born?: number;
}
export interface GLink {
  source: string | GNode;
  target: string | GNode;
  kind: "root" | "thread" | "rel" | "lineage";
  suggested?: boolean;
}
export interface GraphData {
  nodes: GNode[];
  links: GLink[];
}

export interface FocusThread {
  rid: string;
  title: string;
  claim?: string;
  versions: number;
}

const Graph = dynamic(() => import("./Graph"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="mono text-xs text-muted2">3D 星图加载中…</span>
    </div>
  ),
});

function LegendBtn({
  c,
  t,
  g,
  active,
  onClick,
}: {
  c: string;
  t: string;
  g: string;
  active: string | null;
  onClick: (g: string) => void;
}) {
  const on = active === g;
  return (
    <button
      onClick={() => onClick(g)}
      className="mono flex items-center gap-1 rounded-full px-1.5 py-0.5 transition"
      style={{ color: on ? c : "var(--muted)", background: on ? "rgba(255,255,255,.08)" : "transparent", opacity: active && !on ? 0.4 : 1 }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
      {t}
    </button>
  );
}

export default function Cloud({
  data,
  threads,
}: {
  data: GraphData;
  threads: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<EntryNode | null>(null);
  const [focus, setFocus] = useState<FocusThread | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [, start] = useTransition();
  const toggle = (g: string) => setFilter((f) => (f === g ? null : g));

  return (
    <div className="absolute inset-0">
      <div className="pointer-events-none absolute left-0 right-0 top-3 z-20 flex justify-center px-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 搜索想法…"
          className="pointer-events-auto w-full max-w-xs rounded-full border border-line2 bg-panel/80 px-4 py-1.5 text-[13px] outline-none backdrop-blur placeholder:text-muted2 focus:border-grow/50"
        />
      </div>

      <Graph
        data={data}
        query={query}
        filterGroup={filter}
        onThreadFocus={(f) => setFocus(f)}
        onEntryClick={(n) =>
          setSelected({
            id: n.rid!,
            text: n.full ?? n.label,
            kind: n.kind ?? "observation",
            threadId: n.threadId ?? null,
            linkSuggested: n.linkSuggested ?? false,
            audioUrl: n.audioUrl ?? null,
            imageUrl: n.imageUrl ?? null,
          })
        }
        onEntryDrop={(entryId, threadId) =>
          start(async () => {
            await moveEntryToThread(entryId, threadId);
            router.refresh();
          })
        }
      />

      {/* 聚焦线程 HUD */}
      {focus && (
        <div className="toast absolute right-4 top-16 z-20 w-72 rounded-2xl border border-line2 bg-panel/90 p-4 shadow-2xl backdrop-blur">
          <div className="mb-1 flex items-center gap-2">
            <span className="mono text-[11px] uppercase tracking-wider text-grow">线程</span>
            <button onClick={() => setFocus(null)} className="ml-auto text-muted2 hover:text-txt">
              ✕
            </button>
          </div>
          <p className="text-[15px] font-medium text-txt">{focus.title}</p>
          {focus.claim && <p className="mt-1 text-[13px] text-muted">↳ {focus.claim}</p>}
          <p className="mono mt-2 text-[11px] text-evi">
            {focus.versions >= 2
              ? `判断演化 ${focus.versions} 版 · 已在图中展开 →`
              : focus.versions === 1
                ? "判断仅 1 版,继续发展它"
                : "还没写下判断"}
          </p>
          <button
            onClick={() => router.push(`/thread/${focus.rid}`)}
            className="mt-3 w-full rounded-lg bg-grow py-1.5 text-sm font-semibold text-[#04140d] hover:brightness-110"
          >
            打开完整线程 →
          </button>
        </div>
      )}

      {/* 图例(可点筛选) */}
      <div className="absolute bottom-4 left-4 z-20 hidden gap-1.5 rounded-full border border-line bg-panel/70 px-2 py-1 text-[10px] backdrop-blur sm:flex">
        <LegendBtn c="#34d399" t="你的" g="human" active={filter} onClick={toggle} />
        <LegendBtn c="#fbbf24" t="决定" g="decision" active={filter} onClick={toggle} />
        <LegendBtn c="#c084fc" t="AI建议" g="ai" active={filter} onClick={toggle} />
        <LegendBtn c="#60a5fa" t="外部" g="external" active={filter} onClick={toggle} />
      </div>

      {selected && (
        <EntryPopover
          entry={selected}
          threads={threads}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
