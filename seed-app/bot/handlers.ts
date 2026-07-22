import type { Update } from "./telegram";

export interface HandlerDeps {
  resolveUserId(tgId: number): Promise<string | null>;
  ingestText(userId: string, text: string): Promise<{ kind: string; threadTitle: string | null }>;
  transcribe(fileId: string): Promise<string>;
  dailyQuestion(userId: string): Promise<string>;
  reply(chatId: number, text: string): Promise<void>;
}

export async function handleUpdate(update: Update, deps: HandlerDeps): Promise<void> {
  const msg = update.message;
  const tgId = msg?.from?.id;
  const chatId = msg?.chat.id;
  if (!msg || tgId == null || chatId == null) return;

  const userId = await deps.resolveUserId(tgId);
  if (!userId) return; // 只认已绑定用户(防注入)

  if (msg.text?.startsWith("/start")) {
    await deps.reply(chatId, "🌱 我是 Seed。把任何念头发给我——文字或语音,我替你记下并归好线。");
    return;
  }
  if (msg.text?.startsWith("/today")) {
    await deps.reply(chatId, `🌰 今天值得想一小时的一个问题:\n${await deps.dailyQuestion(userId)}`);
    return;
  }

  let text = msg.text ?? null;
  if (!text && msg.voice) text = await deps.transcribe(msg.voice.file_id);
  if (!text) return;

  const { kind, threadTitle } = await deps.ingestText(userId, text);
  const where = threadTitle ? `归入「${threadTitle}」` : "暂放收件箱";
  const head = msg.voice ? `🎤 "${text}"\n` : "";
  await deps.reply(chatId, `${head}🌱 已记下 · ${kind} · ${where}`);
}
