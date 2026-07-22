// Provenance（来源/種別）の定義。演示 demo と同じ配色思想:
// human=緑, ai=紫, external=青, decision=琥珀

export type Kind =
  | "observation" // 你的观察
  | "judgment" // 你的判断
  | "question" // 问题
  | "hypothesis" // 假设
  | "decision" // 决定
  | "ai_suggestion" // AI 建议
  | "evidence"; // 外部证据

export type Author = "human" | "ai" | "external";

export interface KindMeta {
  label: string; // 中文ラベル
  author: Author;
  color: string; // tailwind 用のアクセント色クラス断片 (border-l / text / bg)
  dot: string; // 点の色
}

export const KINDS: Record<Kind, KindMeta> = {
  observation: { label: "你的观察", author: "human", color: "grow", dot: "#34d399" },
  judgment: { label: "你的判断", author: "human", color: "grow", dot: "#34d399" },
  question: { label: "问题", author: "human", color: "grow", dot: "#34d399" },
  hypothesis: { label: "假设", author: "human", color: "grow", dot: "#5eead4" },
  decision: { label: "决定", author: "human", color: "amber", dot: "#fbbf24" },
  ai_suggestion: { label: "AI 建议", author: "ai", color: "ai", dot: "#c084fc" },
  evidence: { label: "外部证据", author: "external", color: "evi", dot: "#60a5fa" },
};

export const KIND_ORDER: Kind[] = [
  "observation",
  "judgment",
  "question",
  "hypothesis",
  "decision",
  "ai_suggestion",
  "evidence",
];

export function kindMeta(kind: string): KindMeta {
  return KINDS[(kind as Kind)] ?? KINDS.observation;
}

export const STATUS_LABEL: Record<string, string> = {
  seed: "种子",
  developing: "发展中",
  decided: "已决定",
  archived: "已归档",
};
