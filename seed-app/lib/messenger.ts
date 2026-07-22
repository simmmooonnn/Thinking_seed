// 信使卡的纯逻辑:三类环境提醒(挑战/主动提醒/重新浮现)合并为一个入口。
// 设计依据(调研):提醒越多单条越没用;重新浮现要给"为什么是这条"的理由,而非冰冷倒计时。

export interface MsgChallenge {
  id: string;
  threadId: string;
  threadTitle: string;
  stance: string;
  text: string;
}

export interface MsgResurface {
  id: string; // thread id
  title: string;
  days: number;
  question: string | null;
  reason: string | null; // 浮现理由(与最近活跃线相连);null = 退回天数文案
}

export interface MsgNudge {
  id: string;
  text: string;
  threadId?: string;
}

export type MsgItem =
  | ({ kind: "challenge" } & MsgChallenge)
  | ({ kind: "nudge" } & MsgNudge)
  | ({ kind: "resurface" } & MsgResurface);

// 组装顺序 = 展示优先级:挑战 > 主动提醒 > 重新浮现;组内保持传入顺序。
export function buildItems(input: {
  challenges: MsgChallenge[];
  nudge: MsgNudge | null;
  resurface: MsgResurface[];
}): MsgItem[] {
  const items: MsgItem[] = [];
  for (const c of input.challenges) items.push({ kind: "challenge", ...c });
  if (input.nudge) items.push({ kind: "nudge", ...input.nudge });
  for (const r of input.resurface) items.push({ kind: "resurface", ...r });
  return items;
}

// 浮现理由:休眠线程若经 ThreadLink 连到一条【最近活跃】的线,给出具体理由。
export function resurfaceReason(
  dormantId: string,
  links: { aId: string; bId: string }[],
  activeTitles: Map<string, string>,
): string | null {
  for (const l of links) {
    const partner = l.aId === dormantId ? l.bId : l.bId === dormantId ? l.aId : null;
    if (!partner) continue;
    const title = activeTitles.get(partner);
    if (title) return `它和你最近在想的「${title}」相连`;
  }
  return null;
}
