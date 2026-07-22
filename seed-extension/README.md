# Seed 捕获 — Chrome 扩展

把网页/ChatGPT/Claude 里选中的文字或整页正文,一键存进本地 Seed(会自动识别来源、自动归入相关线程)。

## 安装(加载未打包扩展)
1. 先让 Seed 跑起来:`cd seed-app && npm run dev`(默认 `localhost:3000`)。
2. 打开 Chrome → 地址栏输入 `chrome://extensions`。
3. 右上角打开「开发者模式」。
4. 点「加载已解压的扩展程序」→ 选择这个 `seed-extension` 文件夹。
5. 固定到工具栏(拼图图标里点图钉)。

## 用法
- 在任意网页(包括 chatgpt.com / claude.ai)**选中一段文字** → 点扩展图标 → 内容已自动带入 → 「存到 Seed」。
- 或点「抓取本页正文」抓整页可见文字。
- 快捷键:文本框里 ⌘/Ctrl + Enter 直接保存。

## 说明
- 仅与本机 `localhost:3000` 通信,不上传任何第三方服务器。
- 若提示「连不上 Seed」,确认 `seed-app` 正在运行。
