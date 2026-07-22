const API = "http://localhost:3000/api/capture";
const $ = (id) => document.getElementById(id);
const textEl = $("text");
const statusEl = $("status");

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = "status " + cls;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runInPage(func) {
  const tab = await activeTab();
  if (!tab?.id) return "";
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func });
    return result || "";
  } catch {
    return "";
  }
}

// 起動時: 選択テキストを取り込む
(async () => {
  const sel = await runInPage(() => window.getSelection().toString());
  if (sel.trim()) textEl.value = sel.trim();
})();

$("sel").onclick = async () => {
  const sel = await runInPage(() => window.getSelection().toString());
  if (sel.trim()) {
    textEl.value = sel.trim();
    setStatus("已抓取选中文字。");
  } else setStatus("没有选中任何文字。", "err");
};

$("page").onclick = async () => {
  const txt = await runInPage(() => {
    const clean = (s) => (s || "").replace(/\n{3,}/g, "\n\n").trim();
    const host = location.hostname;

    // ChatGPT: 每条消息带 data-message-author-role
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
      const ns = [...document.querySelectorAll("[data-message-author-role]")];
      if (ns.length) {
        return (
          "[对话 · ChatGPT]\n\n" +
          ns
            .map((n) => (n.getAttribute("data-message-author-role") === "user" ? "你" : "AI") + ": " + clean(n.innerText))
            .join("\n\n")
        ).slice(0, 8000);
      }
    }
    // Claude: 用户 data-testid=user-message,助手 .font-claude-message
    if (host.includes("claude.ai")) {
      const ns = [...document.querySelectorAll('[data-testid="user-message"], .font-claude-message')];
      if (ns.length) {
        return (
          "[对话 · Claude]\n\n" +
          ns
            .map((n) => (n.getAttribute("data-testid") === "user-message" ? "你" : "AI") + ": " + clean(n.innerText))
            .join("\n\n")
        ).slice(0, 8000);
      }
    }
    // 通用: 正文
    const el = document.querySelector("main") || document.querySelector("article") || document.body;
    return clean(el.innerText).slice(0, 8000);
  });

  if (txt.trim()) {
    textEl.value = txt.trim();
    const isConv = txt.startsWith("[对话");
    setStatus(isConv ? "已抓取本页 AI 对话(你问/AI答)。" : "已抓取本页正文(最多 8000 字)。");
  } else setStatus("抓取失败。", "err");
};

$("save").onclick = async () => {
  const text = textEl.value.trim();
  if (!text) return setStatus("先写点内容。", "err");
  setStatus("正在存入 Seed…");
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: "import" }),
    });
    const j = await res.json();
    if (j.ok) {
      setStatus("✓ 已存入 Seed" + (j.suggestedThread ? "(AI 已归入相关线程)" : ""), "ok");
      textEl.value = "";
      setTimeout(() => window.close(), 900);
    } else {
      setStatus("失败: " + (j.error || "未知"), "err");
    }
  } catch {
    setStatus("连不上 Seed。请确认它在 localhost:3000 运行。", "err");
  }
};

textEl.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") $("save").click();
});
