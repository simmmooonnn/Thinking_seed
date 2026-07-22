import ExportButton from "@/app/ui/ExportButton";

export default function SettingsPage() {
  return (
    <div className="space-y-6 reveal">
      <h1 className="text-lg font-semibold">设置 · 隐私</h1>

      <section className="rounded-xl border border-line bg-panel p-4">
        <div className="mono mb-1 text-xs uppercase tracking-wider text-grow">数据归你所有</div>
        <p className="text-sm text-muted">
          这一版是<strong className="text-txt">本地单人</strong>模式:所有数据都存在你电脑上的
          <code className="mono mx-1 rounded bg-panel2 px-1.5 py-0.5 text-xs">prisma/dev.db</code>
          文件里,不上传任何服务器。
        </p>
        <div className="mt-3">
          <ExportButton />
        </div>
      </section>

      <section className="rounded-xl border border-amber/40 bg-amber/5 p-4">
        <div className="mono mb-1 text-xs uppercase tracking-wider text-amber">⚠ 安全提醒</div>
        <p className="text-sm text-muted">
          你之前在对话里贴过 Claude / OpenAI 的 API Key。它们已写入
          <code className="mono mx-1 rounded bg-panel2 px-1.5 py-0.5 text-xs">.env.local</code>
          (不会被 git 提交),但由于曾以明文出现,请尽快到各自后台
          <strong className="text-txt"> 重新生成新 Key </strong>
          并替换,以免被盗用。
        </p>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4">
        <div className="mono mb-1 text-xs uppercase tracking-wider text-muted">下一步 (Slice 2+)</div>
        <ul className="mt-1 space-y-1 text-sm text-muted2">
          <li>· 候选线程自动关联(pgvector)</li>
          <li>· Thinking Pre-Commit(决策前的一个关键问题)</li>
          <li>· 周报 / Founder Update 产出</li>
          <li>· 思想谱系(版本 + 语义 Diff)</li>
        </ul>
      </section>
    </div>
  );
}
