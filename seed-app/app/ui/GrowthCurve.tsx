// 認知成長曲線(サーバー描画の最小 SVG)。棒=每周你的原创产出、折线=第一作者占比。
export interface Week {
  label: string;
  original: number;
  total: number;
  pct: number; // 0-100
}

export default function GrowthCurve({ weeks }: { weeks: Week[] }) {
  const W = 340, H = 130, padL = 6, padR = 6, padT = 12, padB = 20;
  const n = weeks.length || 1;
  const maxOrig = Math.max(1, ...weeks.map((w) => w.original));
  const bw = (W - padL - padR) / n;
  const x = (i: number) => padL + bw * i + bw * 0.5;
  const yBar = (v: number) => padT + (H - padT - padB) * (1 - v / maxOrig);
  const yPct = (p: number) => padT + (H - padT - padB) * (1 - p / 100);

  const linePts = weeks.map((w, i) => `${x(i)},${yPct(w.pct)}`).join(" ");

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mono mb-1 text-xs uppercase tracking-wider text-grow">认知成长曲线 · 近 {n} 周</div>
      <p className="mb-3 text-sm text-muted2">绿柱 = 每周你产出的原创想法数;青线 = 第一作者占比。看的是趋势,不是数量。</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
        {/* bars */}
        {weeks.map((w, i) => {
          const y = yBar(w.original);
          const h = H - padB - y;
          return (
            <g key={i}>
              <rect x={x(i) - bw * 0.3} y={y} width={bw * 0.6} height={Math.max(h, 0)} rx={2} fill="#34d399" opacity={0.85} />
              {i % 2 === 0 && (
                <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#5f5f6b" fontFamily="monospace">
                  {w.label}
                </text>
              )}
            </g>
          );
        })}
        {/* author % line */}
        <polyline points={linePts} fill="none" stroke="#5eead4" strokeWidth="1.5" opacity={0.9} />
        {weeks.map((w, i) => (
          <circle key={i} cx={x(i)} cy={yPct(w.pct)} r={2} fill="#5eead4" />
        ))}
      </svg>
      <div className="mono mt-1 flex gap-4 text-[10px] text-muted2">
        <span>🟩 原创产出</span>
        <span style={{ color: "#5eead4" }}>— 第一作者占比</span>
      </div>
    </div>
  );
}
