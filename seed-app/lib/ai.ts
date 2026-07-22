import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Kind } from "./types";

// 最安モデル（$1/$5 per 1M）。サーバー側でのみ呼ぶ。キーはブラウザに出ない。
const MODEL = "claude-haiku-4-5";

function client(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.length < 20) return null;
  return new Anthropic({ apiKey: key });
}

const VALID_KINDS: Kind[] = [
  "observation",
  "judgment",
  "question",
  "hypothesis",
  "decision",
  "ai_suggestion",
  "evidence",
];

/**
 * 短いメモの来源/種別を LLM で提案する。
 * 失敗時（キー無し・ネット無し）は簡単なヒューリスティックにフォールバックし、
 * アプリは常に動く。「AI 建议」ではなくあくまで「提案」なので aiSuggested=true を付ける。
 */
export async function classifyKind(text: string): Promise<Kind> {
  const c = client();
  if (!c) return heuristicKind(text);

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 200,
      system:
        "你是一个思想记录助手。判断用户这条笔记最接近哪一种类型,只输出分类,不改写内容。\n" +
        "observation=用户亲自观察到的事实/现象; judgment=用户自己的判断或主张; " +
        "question=一个未解决的问题; hypothesis=可验证的假设; decision=一个已经做出的决定; " +
        "evidence=引用的外部资料/数据/他人原话; ai_suggestion=明显来自AI的建议。\n" +
        "默认更倾向 observation 或 judgment,不要轻易标成 ai_suggestion。",
      messages: [{ role: "user", content: text }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { kind: { type: "string", enum: VALID_KINDS } },
            required: ["kind"],
            additionalProperties: false,
          },
        },
      },
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      const parsed = JSON.parse(block.text) as { kind?: string };
      if (parsed.kind && VALID_KINDS.includes(parsed.kind as Kind)) {
        return parsed.kind as Kind;
      }
    }
  } catch {
    // フォールバックに落ちる
  }
  return heuristicKind(text);
}

/**
 * 新しいメモが既存のどの Thread に属しそうかを LLM に判定させる（線程対齐）。
 * 明確に関連する時だけ id を返す。関連が薄ければ null（＝新しい話題として Inbox に残す）。
 */
export async function suggestThread(
  text: string,
  threads: { id: string; title: string; claim: string | null }[],
): Promise<string | null> {
  const c = client();
  if (!c || threads.length === 0) return null;

  const list = threads
    .map((t, i) => `${i}. ${t.title}${t.claim ? ` — 当前判断:${t.claim}` : ""}`)
    .join("\n");

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 60,
      system:
        "你判断一条新笔记是否明确属于某个已有的思考线程。\n" +
        "只有当它明显在延续/发展某个线程时才选那个线程的编号;\n" +
        "如果它是一个新话题,或只是勉强相关,一律返回 -1。宁可返回 -1。",
      messages: [
        { role: "user", content: `已有线程:\n${list}\n\n新笔记:「${text}」\n\n它属于哪个线程?` },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { index: { type: "integer" } },
            required: ["index"],
            additionalProperties: false,
          },
        },
      },
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      const parsed = JSON.parse(block.text) as { index?: number };
      const i = parsed.index;
      if (typeof i === "number" && i >= 0 && i < threads.length) return threads[i].id;
    }
  } catch {
    /* null */
  }
  return null;
}

/**
 * Thinking Pre-Commit / 先追问：当前判断上,提出一个信息增益最高的追问。
 * 只问一个问题(不给建议、不替用户下结论)。
 */
export async function askOneQuestion(input: {
  title: string;
  claim: string | null;
  entries: { kind: string; text: string }[];
}): Promise<string> {
  const c = client();
  const lines = input.entries.map((e) => `[${e.kind}] ${e.text}`).join("\n");
  const fallback = "哪个事实如果不成立,会推翻你现在的判断?";
  if (!c) return fallback;

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 120,
      system:
        "你是一个苏格拉底式追问者,不是答案机器。针对用户当前的判断,只提出【一个】" +
        "信息增益最高的问题,帮他自己继续思考。可选角度:什么证据最能推翻它?这是你的判断还是AI的?" +
        "有没有相反的案例?哪个假设最该先验证?只输出一句问题,不要解释,不要给建议。",
      messages: [
        {
          role: "user",
          content: `主题:${input.title}\n当前判断:${input.claim || "(还没写)"}\n\n推理条目:\n${lines}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text" && block.text.trim()) return block.text.trim();
  } catch {
    /* fallback */
  }
  return fallback;
}

/**
 * Create 層: 成熟した一つの想法を、読める文章/評論の草稿に仕立てる。
 */
const DRAFT_SYS: Record<string, string> = {
  essay:
    "把这条思考线程写成一篇可读的中文短文/评论草稿(约 500-700 字)。第一人称、像作者本人在写;" +
    "顺着 观察→初始判断→证据→反例/张力→新理解 推进;只用给定材料,把未解的张力如实写进去;结尾留一个真问题。输出 Markdown(标题+正文)。",
  talk:
    "把这条思考线程写成一份【演讲提纲】(5-8 分钟)。Markdown 分节:一个抓人的开场钩子 · 核心洞见一句话 · 3 个推进要点(各配你的观察/证据)· 一个可现场展示的例子或反例 · 收尾金句。简洁、能照着讲。",
  proposal:
    "把这条思考线程写成一份【研究 proposal 骨架】。Markdown 小节:背景与动机 · 核心研究问题 · 可检验假设 · 方法/实验设计 · 预期贡献 · 主要风险与反例。只用给定材料,缺的地方标注‘待补’。",
  thread:
    "把这条思考线程写成一条【推文串】(5-8 条,每条以数字开头,如 1/)。第一条是钩子;每条能独立成立又层层递进;用你自己的观察和证据;最后一条留一个问题。语气真诚、不油腻。输出纯文本。",
};

export async function draftArticle(
  input: {
    title: string;
    claim: string | null;
    entries: { kind: string; text: string }[];
    challenges: { stance: string; text: string }[];
    readings: { title: string }[];
  },
  format: string = "essay",
): Promise<string> {
  const c = client();
  const body = input.entries.map((e) => `[${e.kind}] ${e.text}`).join("\n");
  const ch = input.challenges.map((x) => `[${x.stance}] ${x.text}`).join("\n");
  const rd = input.readings.map((x) => `- ${x.title}`).join("\n");

  if (!c) {
    return `# ${input.title}\n\n> ⚠️ 未连接 LLM,以下为原始材料。\n\n${body}`;
  }
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: (DRAFT_SYS[format] ?? DRAFT_SYS.essay) + " 不要写'本文将…'这类套话。",
      messages: [
        {
          role: "user",
          content:
            `主题:${input.title}\n当前主张:${input.claim || "(未写)"}\n\n推理材料:\n${body}` +
            (ch ? `\n\n已有的挑战/反例:\n${ch}` : "") +
            (rd ? `\n\n相关阅读(可作背景):\n${rd}` : ""),
        },
      ],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text" && b.text.trim()) return b.text;
  } catch {
    /* fallback */
  }
  return `# ${input.title}\n\n> ⚠️ 生成失败,以下为原始材料。\n\n${body}`;
}

/**
 * Questioner: 全線程を見渡して「今日1時間かける価値のある一つの問い」を返す。
 */
export async function dailyQuestion(
  threads: { title: string; claim: string | null }[],
  signals?: {
    unchallengedClaims?: string[]; // 有判断却没证据
    openHypotheses?: string[]; // 提了假设没做决定
    dormant?: string[]; // 被搁置太久的线
    recentTurn?: string; // 最近改了主意的地方
  },
): Promise<string> {
  const c = client();
  const fallback = "今天,你最想不清楚、但又绕不开的那个问题,是什么?";
  if (!c || threads.length === 0) return fallback;
  const list = threads.map((t) => `- ${t.title}${t.claim ? `:${t.claim}` : ""}`).join("\n");
  const cues: string[] = [];
  if (signals?.unchallengedClaims?.length)
    cues.push(`他有判断却一直没找证据:${signals.unchallengedClaims.slice(0, 3).join("、")}`);
  if (signals?.openHypotheses?.length)
    cues.push(`他提了假设却迟迟没收口成决定:${signals.openHypotheses.slice(0, 3).join("、")}`);
  if (signals?.dormant?.length)
    cues.push(`他把这些线搁置太久:${signals.dormant.slice(0, 3).join("、")}`);
  if (signals?.recentTurn) cues.push(`他最近改了主意:${signals.recentTurn}`);
  const cueBlock = cues.length ? `\n\n我最近的认知状态:\n${cues.map((x) => `- ${x}`).join("\n")}` : "";
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 150,
      system:
        "你是 Questioner。看用户所有正在发展的想法,提出【今天值得他花一小时去想】的一个问题。\n" +
        "如果给了他的‘认知状态’,优先针对那里的盲区出题——逼他给一个没证据的判断找证据、把一个悬着的假设收口成决定、或重新拾起被搁置的线,而不是泛泛发问。\n" +
        "问题要具体到某条想法,能真正推动他。只输出一句问题,不解释,不给答案。",
      messages: [{ role: "user", content: `我的想法:\n${list}${cueBlock}\n\n今天最值得我想一小时的一个问题?` }],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text" && b.text.trim()) return b.text.trim();
  } catch {
    /* fallback */
  }
  return fallback;
}

/**
 * v3: あるアイデア(線程)に対して【联网】で関連する読むべき記事/論文を推薦する。
 */
export async function recommendReading(
  title: string,
  claim: string,
): Promise<{ title: string; url: string; source: string; summary: string }[]> {
  const c = client();
  if (!c) return [];
  const topic = claim?.trim() ? `${title} —— ${claim}` : title;
  try {
    const searched = await c.messages.create({
      model: MODEL,
      max_tokens: 3500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      system:
        "根据用户的这个想法,联网找 3-4 篇【值得一读、真正相关】的文章/论文/深度报道。" +
        "优先严肃来源(研究、权威媒体、经典长文)。每篇给标题、链接、来源、以及一句话说明它和这个想法有什么关系。中文。",
      messages: [{ role: "user", content: `我的想法:${topic}` }],
    });
    const findingsText = searched.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const sources: { title: string; url: string }[] = [];
    for (const b of searched.content as any[]) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) if (r?.url) sources.push({ title: r.title ?? r.url, url: r.url });
      }
    }
    if (!findingsText.trim()) return [];
    const srcList = sources.slice(0, 10).map((s, i) => `${i}. ${s.title} — ${s.url}`).join("\n");
    const structured = await c.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system:
        "把下面的联网结果整理成 3-4 条推荐阅读。每条:title(文章标题),url(从来源列表挑最匹配的完整链接,没有留空)," +
        "source(来源/平台名),summary(一句话:为什么和用户的想法相关、值得读)。只用结果里出现的信息。",
      messages: [{ role: "user", content: `结果:\n${findingsText}\n\n来源列表:\n${srcList || "(无)"}` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    source: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: ["title", "url", "source", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = structured.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const parsed = JSON.parse(b.text) as {
        items?: { title: string; url: string; source: string; summary: string }[];
      };
      return (parsed.items ?? []).filter((k) => k.title?.trim()).slice(0, 5);
    }
  } catch {
    /* [] */
  }
  return [];
}

/**
 * v3 Active Seed: 判断に対して【联网】で反方証拠と支持証拠を探し、挑战カードに構造化する。
 */
export async function challengeClaim(
  title: string,
  claim: string,
): Promise<{ stance: "challenge" | "support"; text: string; sourceTitle: string; url: string }[]> {
  const c = client();
  if (!c) return [];
  const target = claim?.trim() || title;
  try {
    // 1) 联网で証拠を探す
    const searched = await c.messages.create({
      model: MODEL,
      max_tokens: 3500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      system:
        "你帮用户挑战自己的判断。针对给定判断,联网找:1-2 条【反方证据/反例】,以及 1 条【支持证据】。" +
        "优先严肃来源(研究、权威媒体)。每条给出来源标题和要点。用中文。",
      messages: [{ role: "user", content: `主题:${title}\n判断:${target}` }],
    });
    const findingsText = searched.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    // web_search_tool_result からソース(title/url)を集める
    const sources: { title: string; url: string }[] = [];
    for (const b of searched.content as any[]) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) {
          if (r?.url) sources.push({ title: r.title ?? r.url, url: r.url });
        }
      }
    }
    if (!findingsText.trim()) return [];

    // 2) 構造化(証拠テキスト + ソース一覧 → 挑战カード)
    const srcList = sources.slice(0, 8).map((s, i) => `${i}. ${s.title} — ${s.url}`).join("\n");
    const structured = await c.messages.create({
      model: MODEL,
      max_tokens: 900,
      system:
        "把下面的联网调研整理成 2-3 张挑战卡。每张:stance(challenge=反方/反例,support=支持),text(一句话中文要点)," +
        "sourceTitle(来源标题),url(从来源列表里挑最匹配的完整链接,没有就留空)。只用调研里出现的信息。",
      messages: [
        { role: "user", content: `调研:\n${findingsText}\n\n来源列表:\n${srcList || "(无)"}` },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    stance: { type: "string", enum: ["challenge", "support"] },
                    text: { type: "string" },
                    sourceTitle: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["stance", "text", "sourceTitle", "url"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cards"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = structured.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const parsed = JSON.parse(b.text) as {
        cards?: { stance: "challenge" | "support"; text: string; sourceTitle: string; url: string }[];
      };
      return (parsed.cards ?? []).filter((k) => k.text?.trim()).slice(0, 4);
    }
  } catch {
    /* [] */
  }
  return [];
}

/**
 * 長期主线: 全線程を横断して、繰り返し現れる母題(長期研究/創業の主線候補)を 1-3 個命名する。
 */
export async function findMainlines(
  threads: { title: string; claim: string | null }[],
): Promise<{ name: string; why: string; threads: number[] }[]> {
  const c = client();
  if (!c || threads.length < 3) return [];
  const list = threads
    .map((t, i) => `${i}. ${t.title}${t.claim ? ` — ${t.claim}` : ""}`)
    .join("\n");
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 800,
      system:
        "在用户的所有思考线程之上,找出 1-3 条【反复出现的母题/主线】——那种可能成为他长期研究方向或创业主线的深层问题。\n" +
        "给每条主线起一个凝练的名字(name),一句话说明它为什么是主线(why),并列出属于它的线程编号(threads)。\n" +
        "只提炼真正贯穿多条线程的;没有就少给。不要把所有线程硬凑成一条。",
      messages: [{ role: "user", content: `线程:\n${list}\n\n我的长期主线是什么?` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    why: { type: "string" },
                    threads: { type: "array", items: { type: "integer" } },
                  },
                  required: ["name", "why", "threads"],
                  additionalProperties: false,
                },
              },
            },
            required: ["lines"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const parsed = JSON.parse(b.text) as {
        lines?: { name: string; why: string; threads: number[] }[];
      };
      return (parsed.lines ?? []).filter((l) => l.name?.trim()).slice(0, 3);
    }
  } catch {
    /* [] */
  }
  return [];
}

/**
 * v4: 認知画像(思考の指紋)。全履歴の統計 + トレンドから、その人の思考の癖を描く。
 */
export async function thinkingProfile(input: {
  authorPct: number;
  counts: Record<string, number>;
  unchallenged: number;
  openHypotheses: number;
  weeklyOriginal: number[];
  inbox: number;
  topThreads: string[];
}): Promise<{ fingerprint: string; strengths: string[]; blindspots: string[]; nudge: string }> {
  const empty = { fingerprint: "记录还太少,继续用几周,画像会清楚起来。", strengths: [], blindspots: [], nudge: "" };
  const c = client();
  if (!c) return empty;
  const trend = input.weeklyOriginal.length >= 2
    ? `每周原创产出趋势(旧→新):${input.weeklyOriginal.join(", ")}`
    : "";
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 700,
      system:
        "你是一面长期观察用户思维的镜子。根据统计,给出一张【认知画像】:\n" +
        "fingerprint = 一句凝练、具体、能让人一震的‘思维指纹’(不是套话);\n" +
        "strengths = 2-3 条他思维上的真实长处;\n" +
        "blindspots = 2-3 条真实盲区/坏习惯(基于数字,诚实但不刻薄);\n" +
        "nudge = 一条具体、今天就能做的改进建议。\n" +
        "基于给的数字说话,不泛泛表扬。中文。",
      messages: [
        {
          role: "user",
          content:
            `第一作者占比 ${input.authorPct}%。各类:${JSON.stringify(input.counts)}。` +
            `有 ${input.unchallenged} 个判断没有证据支撑;${input.openHypotheses} 个假设提出后还没做成决定。` +
            `Inbox 散念 ${input.inbox} 条。${trend}。` +
            `反复出现的主题:${input.topThreads.slice(0, 8).join("、")}。`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              fingerprint: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              blindspots: { type: "array", items: { type: "string" } },
              nudge: { type: "string" },
            },
            required: ["fingerprint", "strengths", "blindspots", "nudge"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const p = JSON.parse(b.text);
      return {
        fingerprint: p.fingerprint || empty.fingerprint,
        strengths: (p.strengths ?? []).slice(0, 3),
        blindspots: (p.blindspots ?? []).slice(0, 3),
        nudge: p.nudge || "",
      };
    }
  } catch {
    /* empty */
  }
  return empty;
}

/**
 * v4 主动越界: 把检测到的一个模式,写成一句像朋友路过时轻声说的提醒。
 */
export async function phraseNudge(cue: string): Promise<string> {
  const c = client();
  if (!c) return cue;
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 120,
      system:
        "你是 Seed —— 一个一直在旁边看着用户思考的存在。现在你注意到了一个值得提一句的模式。\n" +
        "把它说成【一句】温和、口语、像朋友路过时轻声提醒的话,可以带一个轻轻的邀请(要不要…)。\n" +
        "不说教、不用感叹号堆砌、不超过 40 字。只输出这一句。",
      messages: [{ role: "user", content: `我注意到:${cue}` }],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text" && b.text.trim()) return b.text.trim();
  } catch {
    /* fallback */
  }
  return cue;
}

/**
 * v4: 思想编年史。读所有 claim 的版本演变 + 线程的萌发/坚持/休眠,
 * 讲成一段"过去这段时间,你的思维发生了什么"的纵向故事。联网不要。
 */
export async function evolutionStory(input: {
  turns: { topic: string; from: string; to: string; reason: string }[];
  steadfast: string[];
  emerging: string[];
  dormant: string[];
  span: string;
}): Promise<{
  headline: string;
  chapters: { title: string; body: string }[];
  insight: string;
}> {
  const empty = {
    headline: "你的思想还在积累,时间线会随记录展开。",
    chapters: [] as { title: string; body: string }[],
    insight: "",
  };
  const c = client();
  if (!c) return empty;
  const turnsTxt = input.turns.length
    ? input.turns
        .map((t) => `·「${t.topic}」你从『${t.from}』改成了『${t.to}』${t.reason ? `(因为:${t.reason})` : ""}`)
        .join("\n")
    : "(暂无明确的立场翻转)";
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 1100,
      system:
        "你是用户思想的编年史作者。基于事实,写一段【思想编年史】——不是流水账,而是看出脉络:\n" +
        "headline = 一句话点出这段时间他思维的主旋律;\n" +
        "chapters = 2-4 个小节,每节 {title 小标题, body 2-3 句叙事},讲他坚持了什么、推翻了什么、新长出了什么;\n" +
        "insight = 一句只有纵向看才能发现的洞察(比如某个反复出现的模式、某种正在成形的世界观)。\n" +
        "有温度但不吹捧,像了解他很久的人在替他回望。中文。",
      messages: [
        {
          role: "user",
          content:
            `时间跨度:${input.span}。\n` +
            `【改变了主意的地方】\n${turnsTxt}\n\n` +
            `【一直坚持的判断】${input.steadfast.slice(0, 8).join("、") || "—"}\n` +
            `【新萌发的方向】${input.emerging.slice(0, 8).join("、") || "—"}\n` +
            `【正在休眠/被搁置】${input.dormant.slice(0, 6).join("、") || "—"}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, body: { type: "string" } },
                  required: ["title", "body"],
                  additionalProperties: false,
                },
              },
              insight: { type: "string" },
            },
            required: ["headline", "chapters", "insight"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const p = JSON.parse(b.text);
      return {
        headline: p.headline || empty.headline,
        chapters: (p.chapters ?? []).slice(0, 4),
        insight: p.insight || "",
      };
    }
  } catch {
    /* empty */
  }
  return empty;
}

/**
 * v3: 自分の線程どうしの【矛盾/衝突する判断】を見つける。联网不要。
 */
export async function findContradictions(
  threads: { title: string; claim: string | null }[],
): Promise<{ a: number; b: number; reason: string }[]> {
  const c = client();
  if (!c || threads.length < 2) return [];
  const list = threads
    .map((t, i) => `${i}. ${t.title}${t.claim ? ` — 判断:${t.claim}` : ""}`)
    .join("\n");
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 700,
      system:
        "在用户自己的思考线程里,找出【判断互相冲突/前后不一致】的成对线程——一条主张与另一条的立场相抵触。\n" +
        "只找真正的矛盾,不是话题相关。用一句中文说清它们在哪儿打架。返回成对编号。宁缺毋滥。",
      messages: [{ role: "user", content: `线程:\n${list}\n\n哪些判断互相矛盾?` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              pairs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    a: { type: "integer" },
                    b: { type: "integer" },
                    reason: { type: "string" },
                  },
                  required: ["a", "b", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["pairs"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const parsed = JSON.parse(b.text) as { pairs?: { a: number; b: number; reason: string }[] };
      return (parsed.pairs ?? []).filter(
        (p) => p.a !== p.b && p.a >= 0 && p.b >= 0 && p.a < threads.length && p.b < threads.length,
      );
    }
  } catch {
    /* [] */
  }
  return [];
}

/**
 * 認知の鏡: 最近の記録の構成から「提問しているか / 消費しているか」を一言で誠実に返す。
 * おだてない。褒めもけなしもせず、事実に基づく一言。
 */
export async function reflectCognition(stats: {
  human: number;
  ai: number;
  external: number;
  questions: number;
  observations: number;
  decisions: number;
  hypotheses: number;
  unchallenged: number;
}): Promise<string> {
  const c = client();
  if (!c) {
    const pct = stats.human + stats.ai + stats.external > 0
      ? Math.round((stats.human / (stats.human + stats.ai + stats.external)) * 100)
      : 0;
    return `你的原创内容约占 ${pct}%。(未连接 LLM,这是粗略统计。)`;
  }
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "你是一面诚实的认知镜子。根据用户最近的记录构成,用 2-3 句中文说清:他最近更像在【提出并发展自己的问题/判断】,还是在【消费/转述 AI 与外部信息】?" +
        "指出一个具体倾向和一个可改进点。不要客套,不要泛泛表扬,基于给的数字说话。",
      messages: [
        {
          role: "user",
          content:
            `你的观察/判断/问题/假设/决定(原创)共 ${stats.human} 条;AI 建议 ${stats.ai} 条;外部证据 ${stats.external} 条。` +
            `其中问题 ${stats.questions}、观察 ${stats.observations}、假设 ${stats.hypotheses}、决定 ${stats.decisions}。` +
            `有 ${stats.unchallenged} 个判断还没有任何证据支撑。`,
        },
      ],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text" && b.text.trim()) return b.text.trim();
  } catch {
    /* fallback */
  }
  return "记录还不够多,继续捕获,这面镜子会更清楚。";
}

/**
 * 跨線程の主线を発見: 同じ母題/明らかに関連する線程ペアを返す。
 * 明確に関連する時だけ。宁缺毋滥。
 */
export async function findThreadRelations(
  threads: { title: string; claim: string | null }[],
): Promise<{ a: number; b: number; reason: string }[]> {
  const c = client();
  if (!c || threads.length < 2) return [];
  const list = threads
    .map((t, i) => `${i}. ${t.title}${t.claim ? ` — ${t.claim}` : ""}`)
    .join("\n");
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 700,
      system:
        "你在用户的多个思考线程里,找出【共享同一母题/明显互相关联】的成对线程。\n" +
        "只连真正相关的(同一个更大问题的不同侧面、互为因果、互相印证或冲突)。\n" +
        "勉强相关的不要连。用简短中文说明它们共享的母题。返回成对的编号。",
      messages: [{ role: "user", content: `线程列表:\n${list}\n\n哪些线程共享母题?` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              pairs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    a: { type: "integer" },
                    b: { type: "integer" },
                    reason: { type: "string" },
                  },
                  required: ["a", "b", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["pairs"],
            additionalProperties: false,
          },
        },
      },
    });
    const block = res.content.find((x) => x.type === "text");
    if (block && block.type === "text") {
      const parsed = JSON.parse(block.text) as { pairs?: { a: number; b: number; reason: string }[] };
      return (parsed.pairs ?? []).filter(
        (p) =>
          p.a !== p.b &&
          p.a >= 0 &&
          p.b >= 0 &&
          p.a < threads.length &&
          p.b < threads.length,
      );
    }
  } catch {
    /* [] */
  }
  return [];
}

/**
 * Founder 周报 / 本周思想回顾。跨所有线程,只回答 5 件事。
 */
export async function generateWeekly(input: {
  threads: { title: string; claim: string | null; entries: { kind: string; text: string }[] }[];
}): Promise<string> {
  const c = client();
  const body = input.threads
    .map(
      (t) =>
        `## ${t.title}${t.claim ? `\n当前判断:${t.claim}` : ""}\n` +
        t.entries.map((e) => `- [${e.kind}] ${e.text}`).join("\n"),
    )
    .join("\n\n");

  if (!c || input.threads.length === 0) {
    return (
      `# 本周思想回顾\n\n> ⚠️ ${input.threads.length === 0 ? "本周还没有线程。" : "未连接 LLM,以下为原始汇总。"}\n\n` +
      body
    );
  }
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system:
        "你根据用户所有线程,写一份简洁的【本周思想回顾】(Founder Weekly),只回答 5 件事,每件用小标题:\n" +
        "1. 本周产生了哪些真正属于你的新观察?\n" +
        "2. 哪个想法发生了实质变化?\n" +
        "3. 哪些内容只是消费/转述外部信息(而非你自己的判断)?\n" +
        "4. 哪个假设最值得下周在现实中验证?\n" +
        "5. 下周只保留哪一个问题继续思考?\n" +
        "只用给定内容,不虚构。区分事实/判断/AI建议。输出纯 Markdown。",
      messages: [{ role: "user", content: body }],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") return b.text;
  } catch {
    /* fallback */
  }
  return `# 本周思想回顾\n\n> ⚠️ 生成失败。\n\n` + body;
}

/**
 * 思想谱系: 解释一条判断如何从 v1 演化到最新版(语义 diff / 演化叙事)。
 */
export async function explainLineage(input: {
  title: string;
  versions: { claim: string; reason: string | null; createdAt: string }[];
}): Promise<string> {
  const c = client();
  const chain = input.versions
    .map((v, i) => `v${i + 1}: ${v.claim}${v.reason ? `  (你写的理由: ${v.reason})` : ""}`)
    .join("\n");
  if (!c || input.versions.length < 2) {
    return input.versions.length < 2
      ? "这个判断还只有一个版本,继续发展它,再来看演化。"
      : chain;
  }
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 600,
      system:
        "给你一条判断的历代版本。用简短 Markdown 说明:每一步【具体变了什么】(不是换词,而是含义/立场的变化)," +
        "以及【最可能的触发原因】(新证据? 发现反例? 具体化?)。最后一句提示:哪个假设仍未被验证。不要复述原文,不要客套。",
      messages: [{ role: "user", content: `主题:${input.title}\n\n版本链:\n${chain}` }],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") return b.text;
  } catch {
    /* fallback */
  }
  return chain;
}

/**
 * 貼り付けた対話/長文から「記録する価値のある要点」を数個に抽出(导入)。
 * 各要点に来源/種別も付ける。
 */
export async function extractKeyIdeas(
  text: string,
): Promise<{ text: string; kind: Kind }[]> {
  const c = client();
  if (!c) return [{ text: text.slice(0, 500), kind: "observation" }];
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system:
        "从用户粘贴的对话/长文里,提取 2-6 条【值得单独记下】的要点(观察/判断/假设/证据/决定/问题)。\n" +
        "用第一人称、精炼中文重写每一条(不要照抄整段)。区分:这是用户自己的判断,还是 AI 的建议(kind=ai_suggestion)。\n" +
        "不要把寒暄和无关内容算进去。",
      messages: [{ role: "user", content: text.slice(0, 12000) }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    kind: {
                      type: "string",
                      enum: [
                        "observation",
                        "judgment",
                        "question",
                        "hypothesis",
                        "decision",
                        "ai_suggestion",
                        "evidence",
                      ],
                    },
                  },
                  required: ["text", "kind"],
                  additionalProperties: false,
                },
              },
            },
            required: ["ideas"],
            additionalProperties: false,
          },
        },
      },
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text") {
      const parsed = JSON.parse(b.text) as { ideas?: { text: string; kind: Kind }[] };
      const ideas = (parsed.ideas ?? []).filter((i) => i.text?.trim());
      if (ideas.length) return ideas.slice(0, 8);
    }
  } catch {
    /* fallback */
  }
  return [{ text: text.slice(0, 500), kind: "observation" }];
}

/**
 * 画像から「ユーザーが記録したいであろう内容」を短く抽出(截图/图片捕获)。
 * key 無し/失敗時は簡単な既定文。
 */
export async function describeImage(base64: string, mediaType: string): Promise<string> {
  const c = client();
  if (!c) return "(图片已保存,未连接 LLM 无法自动提取内容)";
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "你从用户截图/图片里,提取他最可能想记下的关键信息。若有文字就转成通顺的一段;" +
        "若是图表/界面就概括要点。用中文,只输出内容本身,不要客套、不要说'这张图片显示'。",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                data: base64,
              },
            },
            { type: "text", text: "提取我可能想记下的内容。" },
          ],
        },
      ],
    });
    const b = res.content.find((x) => x.type === "text");
    if (b && b.type === "text" && b.text.trim()) return b.text.trim();
  } catch {
    /* fallback */
  }
  return "(图片已保存,自动提取失败)";
}

function heuristicKind(text: string): Kind {
  const t = text.trim();
  if (/[?？]$/.test(t)) return "question";
  if (/(如果|假设|可能|也许|大概)/.test(t)) return "hypothesis";
  if (/(决定|要做|下一步|计划)/.test(t)) return "decision";
  if (/(我发现|我注意到|观察到|看到)/.test(t)) return "observation";
  return "judgment";
}

/**
 * 一つの Thread の推理を「決策 Memo」に整理する。
 * 事実/判断/AI建议/未验证を区別し、来源にないことは書かない、という原則を守る。
 */
export async function generateMemo(input: {
  title: string;
  entries: { kind: string; text: string }[];
}): Promise<string> {
  const c = client();
  const lines = input.entries.map((e) => `[${e.kind}] ${e.text}`).join("\n");

  if (!c) {
    // フォールバック: LLM 無しでも構造化した素の Memo を返す
    return (
      `# 决策 Memo：${input.title}\n\n` +
      `> ⚠️ 未连接 LLM,以下为原始条目的直接整理(未做归纳)。\n\n` +
      input.entries.map((e) => `- **${e.kind}**：${e.text}`).join("\n") +
      `\n`
    );
  }

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 1600,
      system:
        "你把用户的推理线程整理成一页 Markdown 决策 Memo。严格遵守:\n" +
        "1. 明确区分【事实/观察】【用户判断】【AI建议】【外部证据】【未验证假设】【决定】;\n" +
        "2. 只使用给定条目里的内容,不要虚构证据或补全没有的事实;\n" +
        "3. 缺少证据的地方要明确写“尚未验证”;\n" +
        "4. 给出【下一步最该验证的一个假设】;\n" +
        "5. 结尾附一个【来源】小节,按类型列出实际用到的原始条目(作为脚注,可追溯)。\n" +
        "输出纯 Markdown,不要额外解释。",
      messages: [
        {
          role: "user",
          content: `主题:${input.title}\n\n条目(格式为 [类型] 内容):\n${lines}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (block && block.type === "text") return block.text;
  } catch {
    // フォールバックへ
  }
  return (
    `# 决策 Memo：${input.title}\n\n> ⚠️ 生成失败,以下为原始条目。\n\n` +
    input.entries.map((e) => `- **${e.kind}**：${e.text}`).join("\n")
  );
}
