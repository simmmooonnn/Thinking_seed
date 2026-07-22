import { test, expect, vi } from "vitest";
import { sendMessage } from "./telegram";

test("sendMessage posts chat_id + text to sendMessage endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: {} }) });
  vi.stubGlobal("fetch", fetchMock);
  await sendMessage("TKN", 42, "hi");
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.telegram.org/botTKN/sendMessage");
  expect(JSON.parse(opts.body)).toEqual({ chat_id: 42, text: "hi" });
});
