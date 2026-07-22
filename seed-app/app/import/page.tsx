import ImportBox from "@/app/ui/ImportBox";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-6 reveal">
      <div>
        <h1 className="text-lg font-semibold">导入</h1>
        <p className="mt-1 text-sm text-muted">
          把你和 ChatGPT / Claude 的对话、或任何文字带进 Seed。AI 会识别来源、自动归入相关线程。
        </p>
      </div>

      <ImportBox />

      <section className="rounded-2xl border border-line bg-panel p-4">
        <div className="mono mb-1 text-xs uppercase tracking-wider text-ai">一键抓取 · Chrome 扩展</div>
        <p className="text-sm text-muted">
          想在 ChatGPT / Claude 页面里<strong className="text-txt">选中就存</strong>、或一键抓整段对话?
          装上随附的浏览器扩展:
        </p>
        <ol className="mt-2 space-y-1 text-sm text-muted2">
          <li>1. 打开 <code className="mono rounded bg-panel2 px-1.5 py-0.5 text-xs">chrome://extensions</code></li>
          <li>2. 右上角开启「开发者模式」</li>
          <li>3. 点「加载已解压的扩展程序」→ 选项目里的 <code className="mono rounded bg-panel2 px-1.5 py-0.5 text-xs">seed-extension</code> 文件夹</li>
          <li>4. 在 ChatGPT / Claude 页面点扩展图标 → 「抓取本页 / AI 对话」→「存到 Seed」</li>
        </ol>
        <p className="mt-2 text-xs text-muted2">
          (扩展只和本机 localhost:3000 通信,不上传任何第三方。)
        </p>
      </section>
    </div>
  );
}
