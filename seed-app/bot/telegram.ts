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
