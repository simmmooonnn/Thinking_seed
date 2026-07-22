import { prisma } from "../lib/db";
import { ingestCore } from "../lib/ingest-core";
import { dailyQuestion } from "../lib/ai";
import { gatherQuestionSignals } from "../lib/signals";
import { kindMeta } from "../lib/types";
import { getMe, getUpdates, sendMessage } from "./telegram";
import { handleUpdate, type HandlerDeps } from "./handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerTg = process.env.TELEGRAM_OWNER_ID;
if (!token) { console.error("缺 TELEGRAM_BOT_TOKEN"); process.exit(1); }

// 首启: 把 owner id 绑到 owner 用户(A 阶段单人)
if (ownerTg) {
  const owner = await prisma.user.findFirst({ where: { isOwner: true } });
  if (owner && owner.telegramUserId !== ownerTg) {
    await prisma.user.update({ where: { id: owner.id }, data: { telegramUserId: ownerTg } });
  }
}

const deps: HandlerDeps = {
  resolveUserId: async (tgId) =>
    (await prisma.user.findUnique({ where: { telegramUserId: String(tgId) } }))?.id ?? null,
  ingestText: async (userId, text) => {
    const res = await ingestCore(userId, text, { source: "telegram" });
    const kind = res?.entry.kind ?? "observation";
    const title = res?.suggested
      ? (await prisma.thread.findUnique({ where: { id: res.suggested }, select: { title: true } }))?.title ?? null
      : null;
    return { kind: kindMeta(kind).label, threadTitle: title };
  },
  transcribe: async (fileId) => {
    const { getFile, downloadFile } = await import("./telegram");
    const f = await getFile(token, fileId);
    const buf = await downloadFile(token, f.file_path);
    const { transcribe } = await import("../lib/transcribe");
    return (await transcribe(buf, "voice.ogg")) ?? "";
  },
  dailyQuestion: async (userId) => {
    const threads = await prisma.thread.findMany({
      where: { userId, status: { in: ["seed", "developing"] } },
      orderBy: { updatedAt: "desc" }, take: 20, select: { title: true, claim: true },
    });
    const signals = await gatherQuestionSignals(userId);
    return dailyQuestion(threads.map((t) => ({ title: t.title, claim: t.claim })), signals);
  },
  reply: (chatId, text) => sendMessage(token, chatId, text),
};

const me = await getMe(token);
console.log(`bot 已连接: @${me.username} — 长轮询中,Ctrl+C 退出`);

let offset: number | undefined;
for (;;) {
  try {
    const updates = await getUpdates(token, offset);
    for (const u of updates) {
      offset = u.update_id + 1;
      await handleUpdate(u, deps);
    }
  } catch (e) {
    console.error("轮询出错,2s 后重试:", (e as Error).message);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
