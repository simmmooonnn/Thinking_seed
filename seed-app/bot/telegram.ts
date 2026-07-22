const BASE = (token: string) => `https://api.telegram.org/bot${token}`;

async function call<T>(token: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE(token)}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result as T;
}

export function getMe(token: string) {
  return call<{ id: number; username: string }>(token, "getMe");
}

export interface Update {
  update_id: number;
  message?: {
    from?: { id: number };
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    entities?: { type: string }[];
  };
}

export function getUpdates(token: string, offset?: number) {
  return call<Update[]>(token, "getUpdates", { offset, timeout: 30 });
}

export async function sendMessage(token: string, chatId: number, text: string) {
  await call(token, "sendMessage", { chat_id: chatId, text });
}

export function getFile(token: string, fileId: string) {
  return call<{ file_path: string }>(token, "getFile", { file_id: fileId });
}

export async function downloadFile(token: string, filePath: string): Promise<Buffer> {
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  return Buffer.from(await res.arrayBuffer());
}
