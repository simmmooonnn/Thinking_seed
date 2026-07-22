"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
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

  // 专注模式(防"毛球"): 星尘多时默认只显示思想线;点一颗线程星才展开它的尘埃。
  // 搜索时自动切回全部(图谱作为搜索结果的可视化,是社区公认真正有用的图谱用法)。
  const gid = (x: string | GNode) => (typeof x === "object" ? x.id : x);
  const entryTotal = useMemo(() => data.nodes.filter((n) => n.type === "entry").length, [data]);
  const [viewPref, setViewPref] = useState<"focus" | "all" | null>(null);
  const mode = viewPref ?? (entryTotal > 40 ? "focus" : "all");
  const effMode = query.trim() ? "all" : mode;
  const [openThread, setOpenThread] = useState<string | null>(null);

  const shown = useMemo<GraphData>(() => {
    if (effMode === "all") return data;
    const keep = new Set<string>();
    for (const n of data.nodes) {
      if (n.type !== "entry") keep.add(n.id);
      else if (openThread && n.threadId === openThread) keep.add(n.id);
    }
    return {
      nodes: data.nodes.filter((n) => keep.has(n.id)),
      links: data.links.filter((l) => keep.has(gid(l.source)) && keep.has(gid(l.target))),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, effMode, openThread]);

  // 弹层指向的星被专注模式隐藏时,顺手关掉(避免"弹层挂在看不见的星上")
  useEffect(() => {
    if (!selected) return;
    if (effMode === "focus" && selected.threadId !== openThread) setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effMode, openThread]);

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
        data={shown}
        query={query}
        filterGroup={filter}
        onThreadFocus={(f) => {
          setFocus(f);
          // 再点同一颗星 = 收起它的星尘(与 Graph 侧版本谱系的二次点击收起保持对称)
          setOpenThread((prev) => (prev === f.rid ? null : f.rid));
        }}
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
            <button
              onClick={() => {
                setFocus(null);
                setOpenThread(null);
              }}
              aria-label="收起"
              className="ml-auto text-muted2 hover:text-txt"
            >
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

      {/* 左下: 视图切换 + 图例(可点筛选) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="mono flex items-center gap-0.5 rounded-full border border-line bg-panel/70 p-0.5 text-[10px] backdrop-blur">
          {(["focus", "all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewPref(m)}
              className="rounded-full px-2 py-0.5 transition"
              style={{
                color: effMode === m ? "var(--grow)" : "var(--muted2)",
                background: effMode === m ? "rgba(52,211,153,.12)" : "transparent",
              }}
              title={m === "focus" ? "只显示思想线,点一颗星展开它的星尘(星多时更清晰)" : "显示全部星尘"}
            >
              {m === "focus" ? "✦ 专注" : "全部"}
            </button>
          ))}
        </div>
        {effMode === "focus" && !openThread && (
          <span className="mono rounded-full bg-panel/60 px-2 py-0.5 text-[10px] text-muted2 backdrop-blur">
            点一颗星,展开它的星尘
          </span>
        )}
        <div className="hidden gap-1.5 rounded-full border border-line bg-panel/70 px-2 py-1 text-[10px] backdrop-blur sm:flex">
          <LegendBtn c="#34d399" t="你的" g="human" active={filter} onClick={toggle} />
          <LegendBtn c="#fbbf24" t="决定" g="decision" active={filter} onClick={toggle} />
          <LegendBtn c="#c084fc" t="AI建议" g="ai" active={filter} onClick={toggle} />
          <LegendBtn c="#60a5fa" t="外部" g="external" active={filter} onClick={toggle} />
        </div>
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
