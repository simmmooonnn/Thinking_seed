import Link from "next/link";
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
        <div className="mono mb-2 text-xs uppercase tracking-wider text-muted">工具箱 · 不常用,但都在</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/import" className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-muted transition hover:border-grow/40 hover:text-txt">
            📥 导入 · 把 AI 对话/文本拆成种子
          </Link>
          <Link href="/outputs" className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-muted transition hover:border-grow/40 hover:text-txt">
            📤 产出汇总 · 周报与回顾
          </Link>
          <Link href="/reading" className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-muted transition hover:border-grow/40 hover:text-txt">
            📖 推荐阅读 · 全部列表
          </Link>
        </div>
      </section>
    </div>
  );
}
