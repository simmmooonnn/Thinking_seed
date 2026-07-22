import "server-only";

// OpenAI Whisper で音声を文字起こし。key 無し/失敗時は null。
export async function transcribe(buf: Buffer, filename: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.length < 20) return null;
  try {
    const fd = new FormData();
    fd.set("model", "whisper-1");
    fd.set("file", new Blob([new Uint8Array(buf)], { type: "audio/webm" }), filename);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { text?: string };
    return typeof j.text === "string" ? j.text.trim() : null;
  } catch {
    return null;
  }
}
