"use client";

// Cloud から dynamic(ssr:false) でのみ読み込まれる(WebGL/Three はクライアント専用)。
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphData, GNode, GLink, FocusThread } from "./Cloud";

interface StarNode extends GNode {
  __mats?: THREE.SpriteMaterial[];
  __label?: SpriteText | null;
  __labelColor?: string;
  __group?: THREE.Group;
}

// 柔らかい光テクスチャ(星の輝き)。全ノード共用、一度だけ生成。
let GLOW: THREE.Texture | null = null;
function glowTex(): THREE.Texture {
  if (GLOW) return GLOW;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.75)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  GLOW = new THREE.CanvasTexture(cv);
  return GLOW;
}

// ノードを「発光する星」として作る(グロー + 明るいコア + ラベル)
function makeStar(node: StarNode): THREE.Object3D {
  const tex = glowTex();
  const group = new THREE.Group();
  const size =
    node.type === "root" ? 15 : node.type === "thread" ? 8 + node.r : node.type === "version" ? 5 : 5.5;

  const glowMat = new THREE.SpriteMaterial({
    map: tex,
    color: new THREE.Color(node.color),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(size, size, 1);
  group.add(glow);

  const coreMat = new THREE.SpriteMaterial({
    map: tex,
    color: new THREE.Color(0xffffff),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Sprite(coreMat);
  const cs = size * 0.4;
  core.scale.set(cs, cs, 1);
  group.add(core);

  // 挑战/矛盾のある線程には赤いバッジ
  if (node.type === "thread" && node.challenged) {
    const badgeMat = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color(0xf87171),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const badge = new THREE.Sprite(badgeMat);
    const bs = size * 0.45;
    badge.scale.set(bs, bs, 1);
    badge.position.set(size * 0.45, size * 0.45, 0);
    group.add(badge);
  }

  let label: SpriteText | null = null;
  if (node.type !== "entry") {
    const txt =
      node.type === "version" ? node.label : node.label.length > 16 ? node.label.slice(0, 16) + "…" : node.label;
    label = new SpriteText(txt);
    label.color = node.type === "root" ? "#c8ffe8" : node.type === "version" ? "#9adfc4" : "#ededf2";
    label.textHeight = node.type === "root" ? 5 : node.type === "version" ? 2.6 : 3.6;
    label.fontFace = "Arial";
    (label.material as THREE.Material).depthWrite = false;
    label.position.set(0, size * 0.55 + 3, 0);
    group.add(label);
  }

  node.__mats = [glowMat, coreMat];
  node.__label = label;
  node.__labelColor = label ? label.color : undefined;
  node.__group = group;
  return group;
}

const eid = (x: string | GNode): string => (typeof x === "object" ? x.id : x);

const KIND_GROUP: Record<string, string> = {
  observation: "human",
  judgment: "human",
  question: "human",
  hypothesis: "human",
  decision: "decision",
  ai_suggestion: "ai",
  evidence: "external",
};

export default function Graph({
  data,
  query,
  filterGroup,
  onThreadFocus,
  onEntryClick,
  onEntryDrop,
}: {
  data: GraphData;
  query: string;
  filterGroup: string | null;
  onThreadFocus: (f: FocusThread) => void;
  onEntryClick: (n: GNode) => void;
  onEntryDrop: (entryId: string, threadId: string) => void;
}) {
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<StarNode | null>(null);
  const stickyRef = useRef<StarNode | null>(null);
  const queryRef = useRef("");
  queryRef.current = query;
  const filterRef = useRef<string | null>(null);
  filterRef.current = filterGroup;
  const [size, setSize] = useState({ w: 800, h: 600 });

  const isDim = (n: StarNode) => {
    const q = queryRef.current.trim().toLowerCase();
    if (q && n.type !== "root" && !((n.full ?? n.label) + n.label).toLowerCase().includes(q)) return true;
    const f = filterRef.current;
    if (f && n.type === "entry" && KIND_GROUP[n.kind ?? ""] !== f) return true;
    return false;
  };
  const paint = (n: StarNode, mode: "base" | "target" | "neighbor" | "faded") => {
    const g = n.__group, m = n.__mats, l = n.__label;
    if (mode === "base") {
      const dim = isDim(n);
      if (g) g.scale.setScalar(1);
      if (m) { m[0].opacity = dim ? 0.05 : 0.7; m[1].opacity = dim ? 0.05 : 0.95; }
      if (l) { l.color = n.__labelColor ?? "#ededf2"; l.visible = !dim; }
    } else if (mode === "target") {
      if (g) g.scale.setScalar(1.9);
      if (m) { m[0].opacity = 1; m[1].opacity = 1; }
      if (l) { l.color = "#ffffff"; l.visible = true; }
    } else if (mode === "neighbor") {
      if (g) g.scale.setScalar(1.15);
      if (m) { m[0].opacity = 0.95; m[1].opacity = 1; }
      if (l) { l.color = n.__labelColor ?? "#ededf2"; l.visible = true; }
    } else {
      if (g) g.scale.setScalar(1);
      if (m) { m[0].opacity = 0.04; m[1].opacity = 0.04; }
      if (l) l.visible = false;
    }
  };
  // 邻域高亮: 中心を起点に相连的整个星系点亮、其余淡出。center=null で全体を base に戻す。
  const highlight = (center: StarNode | null) => {
    const nodes = liveRef.current.nodes as StarNode[];
    if (center) {
      const nb = neighborsRef.current.get(center.id) ?? new Set<string>();
      for (const n of nodes) paint(n, n === center ? "target" : nb.has(n.id) ? "neighbor" : "faded");
    } else {
      for (const n of nodes) paint(n, "base");
    }
  };
  // 悬停临时高亮;移开后若有"锁定"的星则回到它,否则复原
  const setHover = (node: StarNode | null) => {
    highlight(node ?? stickyRef.current);
    hoverRef.current = node;
    if (wrapRef.current) wrapRef.current.style.cursor = node ? "pointer" : "grab";
  };

  const dataRef = useRef<GraphData>({ nodes: [], links: [] });
  const liveRef = useRef<GraphData>({ nodes: [], links: [] });
  const neighborsRef = useRef<Map<string, Set<string>>>(new Map());
  const expandedRef = useRef<Set<string>>(new Set());
  const [, bump] = useState(0);

  const rebuild = useCallback(() => {
    const base = dataRef.current;
    const prev = new Map(liveRef.current.nodes.map((n) => [n.id, n]));
    const nodes: GNode[] = [...base.nodes];
    const links: GLink[] = base.links.map((l) => ({ ...l }));

    for (const rid of expandedRef.current) {
      const tnode = base.nodes.find((n) => n.type === "thread" && n.rid === rid);
      const vers = tnode?.versions ?? [];
      let prevId = `t:${rid}`;
      vers.forEach((claim, i) => {
        const id = `v:${rid}:${i}`;
        nodes.push({
          id,
          type: "version",
          label: `v${i + 1}`,
          full: claim,
          color: i === vers.length - 1 ? "#34d399" : "#8b8b96",
          r: 1.7,
        });
        links.push({ source: prevId, target: id, kind: "lineage" });
        prevId = id;
      });
    }

    const merged = nodes.map((n) => {
      const p = prev.get(n.id);
      return p ? Object.assign(p, n) : n;
    });
    // 中心「思想」球を原点に固定
    const root = merged.find((n) => n.id === "root");
    if (root) {
      root.fx = 0; root.fy = 0; root.fz = 0; root.x = 0; root.y = 0; root.z = 0;
    }
    const nb = new Map<string, Set<string>>();
    for (const l of links) {
      const s = eid(l.source), t = eid(l.target);
      if (!nb.has(s)) nb.set(s, new Set());
      if (!nb.has(t)) nb.set(t, new Set());
      nb.get(s)!.add(t);
      nb.get(t)!.add(s);
    }
    neighborsRef.current = nb;

    liveRef.current = { nodes: merged, links };
    bump((v) => v + 1);
    fgRef.current?.d3ReheatSimulation?.();
  }, []);

  useEffect(() => {
    dataRef.current = data;
    stickyRef.current = null;
    rebuild();
  }, [data, rebuild]);

  // 検索 / 色フィルタ変更時に再ペイント(ホバー中はその近傍ハイライトを維持)
  useEffect(() => {
    highlight(hoverRef.current ?? stickyRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterGroup]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setSize({ w: Math.max(r.width, 100), h: Math.max(r.height, 100) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const sceneryRef = useRef(false);
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      const fg = fgRef.current;
      if (fg?.scene && fg.scene()) {
        try {
          fg.d3Force("charge")?.strength(-140);
          fg.d3Force("link")?.distance((l: GLink) =>
            l.kind === "root" ? 95 : l.kind === "rel" ? 78 : l.kind === "lineage" ? 22 : 44,
          );
          const cam = fg.camera?.();
          if (cam) { cam.far = 12000; cam.updateProjectionMatrix(); }
        } catch {}
        if (!sceneryRef.current) {
          sceneryRef.current = true;
          addScenery(fg.scene());
        }
        clearInterval(iv);
      }
      if (++tries > 50) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // 相机平滑飞到某颗星并以它为中心
  const flyTo = (n: GNode, dist: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    const cam = fg.camera();
    const nx = n.x ?? 0, ny = n.y ?? 0, nz = n.z ?? 0;
    let dx = nx - cam.position.x, dy = ny - cam.position.y, dz = nz - cam.position.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
    fg.cameraPosition({ x: nx - dx * dist, y: ny - dy * dist, z: nz - dz * dist }, { x: nx, y: ny, z: nz }, 900);
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <div className="pointer-events-none absolute bottom-24 right-4 z-20 flex flex-col items-end gap-1.5">
        <button
          onClick={() => fgRef.current?.zoomToFit(700, 60)}
          className="pointer-events-auto mono rounded-lg border border-line2 bg-panel/80 px-3 py-2 text-[11px] text-muted backdrop-blur hover:text-txt"
        >
          重置视角
        </button>
        <span className="mono rounded-full bg-panel/60 px-2.5 py-1 text-[10px] text-muted2 backdrop-blur">
          拖动旋转 · 滚轮缩放
        </span>
      </div>
      <ForceGraph3D
        ref={fgRef}
        graphData={liveRef.current as any}
        width={size.w}
        height={size.h}
        backgroundColor="#050508"
        showNavInfo={false}
        nodeRelSize={4}
        nodeVal={((n: GNode) => n.r) as any}
        nodeThreeObject={makeStar as any}
        nodeThreeObjectExtend={false}
        nodeLabel={((n: GNode) => `<div style="max-width:260px;font:13px sans-serif;color:#ededf2;background:rgba(20,20,24,.92);padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.12)">${(n.full ?? n.label).replace(/</g, "&lt;")}</div>`) as any}
        linkColor={((l: GLink) => {
          if (query.trim()) return "#1a1a20";
          if (l.suggested) return "#fbbf24";
          if (l.kind === "rel") return "#c084fc";
          if (l.kind === "lineage") return "#5eead4";
          if (l.kind === "thread") return "#34d399";
          return "#8ba3b8";
        }) as any}
        linkOpacity={0.6}
        linkWidth={((l: GLink) => (l.suggested ? 0.9 : l.kind === "rel" || l.kind === "lineage" ? 0.6 : l.kind === "thread" ? 0.5 : 0.25)) as any}
        linkDirectionalParticles={((l: GLink) => (l.suggested ? 3 : l.kind === "rel" ? 2 : l.kind === "thread" ? 1 : 0)) as any}
        linkDirectionalParticleColor={((l: GLink) => (l.suggested ? "#fbbf24" : l.kind === "rel" ? "#c084fc" : "#34d399")) as any}
        linkDirectionalParticleWidth={1.4}
        onNodeHover={((n: StarNode | null) => setHover(n)) as any}
        onNodeClick={((n: GNode) => {
          if (n.type === "entry") {
            flyTo(n, 70);
            onEntryClick(n);
          } else if (n.type === "thread" && n.rid) {
            flyTo(n, 115);
            stickyRef.current = n as StarNode;
            if (expandedRef.current.has(n.rid)) expandedRef.current.delete(n.rid);
            else expandedRef.current.add(n.rid);
            rebuild();
            highlight(n as StarNode);
            onThreadFocus({ rid: n.rid, title: n.label, claim: n.claim, versions: n.versions?.length ?? 0 });
          } else if (n.type === "version") {
            flyTo(n, 45);
          } else if (n.type === "root") {
            flyTo(n, 260);
            stickyRef.current = null;
            highlight(null);
          }
        }) as any}
        onNodeDragEnd={((n: GNode) => {
          if (n.type === "entry" && n.rid) {
            let best: GNode | null = null;
            let bestD = 34;
            for (const m of liveRef.current.nodes) {
              if (m.type !== "thread") continue;
              const d = Math.hypot((m.x ?? 0) - (n.x ?? 0), (m.y ?? 0) - (n.y ?? 0), (m.z ?? 0) - (n.z ?? 0));
              if (d < bestD) { bestD = d; best = m; }
            }
            if (best?.rid && best.rid !== n.threadId) onEntryDrop(n.rid, best.rid);
          }
          n.fx = undefined; n.fy = undefined; n.fz = undefined;
        }) as any}
      />
    </div>
  );
}

function addScenery(scene: THREE.Scene) {
  const tex = glowTex();

  // 星空(3 層: 遠い細かい星 / 中間 / 近い明るい星)。
  // sizeAttenuation:false で常に一定ピクセルの円点にし、遠くでも消えないようにする。
  const layer = (count: number, rMin: number, rMax: number, px: number, op: number) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = rMin + Math.random() * (rMax - rMin);
      const th = Math.acos(2 * Math.random() - 1);
      const ph = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(th) * Math.cos(ph);
      pos[i * 3 + 1] = r * Math.sin(th) * Math.sin(ph);
      pos[i * 3 + 2] = r * Math.cos(th);
      const w = 0.7 + Math.random() * 0.3;
      col[i * 3] = w * (0.85 + Math.random() * 0.15);
      col[i * 3 + 1] = w;
      col[i * 3 + 2] = w * (0.92 + Math.random() * 0.08);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: px,
      map: tex,
      sizeAttenuation: false, // 常に一定サイズの円点
      vertexColors: true,
      transparent: true,
      opacity: op,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo, mat));
  };
  layer(1600, 1500, 5000, 1.6, 0.5); // 遠景の細かい星
  layer(800, 700, 2500, 2.6, 0.65); // 中景
  layer(220, 400, 1400, 4.5, 0.9); // 近景の明るい星

  // 星雲(大きく淡い加算スプライト、色とりどり)
  const nebColors = [0x34d399, 0x60a5fa, 0xc084fc, 0x22d3ee];
  for (const c of nebColors) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: c,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    const r = 700 + Math.random() * 1800;
    const th = Math.acos(2 * Math.random() - 1);
    const ph = Math.random() * Math.PI * 2;
    sp.position.set(r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th));
    const s = 800 + Math.random() * 900;
    sp.scale.set(s * 0.85, s * 0.85, 1);
    scene.add(sp);
  }
}
