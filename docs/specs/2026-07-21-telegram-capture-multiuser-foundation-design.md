# Seed:Telegram 零摩擦捕获 + 多人数据模型地基 — 设计文档

日期:2026-07-21
状态:已通过 brainstorm 评审,待 spec 复核

---

## 背景与动机

Seed 已具备丰富的下游能力(3D 星图、每日简报、Active Seed 联网挑战、认知画像、思想编年史、主动提醒)。但作者本人的真实使用状态是"**偶尔记,但常忘/懒得打开**"。

诊断:痛点在**最前面的门口**。念头发生在离开电脑的时刻(床上、路上、聊天中),而记录它却要"开电脑 → 找页面 → 输入",路径太长。所有下游价值都只有在"捕获真的发生"时才成立——当前是在一个连作者都不常触发的捕获循环上,盖了一栋精致的下游楼。

因此本轮不再加下游 AI 功能,而是**把前门修到零阻力**,并顺势**奠定多人数据模型地基**(作者已明确:近期只做地基层 A,不做部署/真登录)。

## 目标

1. **捕获零激活能量**:念头冒出的当下,在一个整天已开着的 App(Telegram)里 2 秒记下,连新 App 都不用开;出门也能记。
2. **回来被触发**:每天一条 Telegram 推送(今日之问)把作者拉回来,而非靠"想起来打开"。
3. **多人数据模型地基(A)**:引入 `User` 与 `userId` 全局隔离、`getCurrentUser()` 接缝,让将来上云/真登录时其它代码零改动。

## 非目标(本轮明确不做)

- 云端部署、真登录/注册 UI、密码/OAuth(阶段 C)
- SQLite → Postgres 迁移(阶段 B)
- 自带 API key、按人限流/配额(阶段 D)
- 图片(截图)捕获(v1.1)
- Active Seed 挑战推送(v1.1)
- 共鸣 / 多人协作 V5

## 关键技术决策:长轮询,不用部署

Telegram 收消息两种方式:
- **Webhook**:Telegram 主动 POST 到公网地址 → 需部署/公网 URL。**不采用。**
- **长轮询(getUpdates)**:本地进程主动拉取 → 只需能上网,**无需公网地址、部署、内网穿透**。**采用。**

架构:

```
手机 Telegram App
   ↓ 发语音/文字
Telegram 云(离线时排队暂存)
   ↓ 本地 bot 进程主动拉取(getUpdates 长轮询)
bot 进程(node,跑在作者自己电脑)
   ↓ 复用 ingestCore 管线(写 userId)
同一个 dev.db(与网页共用一份数据)
```

推论:
- **零部署**:电脑上多跑一个 `npm run bot`,和网页并排。
- **出门也能记**:手机发出 → Telegram 队列 → 电脑联网拉取入库;即使当时电脑睡眠,醒来补拉,念头不丢。
- **数据纯本地单人**:没有东西上云,dev.db 仍在本机。
- **同一份 bot 代码是云端版第一形态**:将来上云只是"从笔电跑"变"在服务器跑",捕获代码零改动。

前提:电脑开着且 bot 在跑才能把队列拉进库(睡眠可,醒来补拉)。对本地单人工具可接受。

---

## 第一部分:多人数据模型地基(A)

### Prisma Schema 改动

新增 `User`:

```prisma
model User {
  id             String   @id @default(cuid())
  name           String?
  telegramUserId String?  @unique   // 绑定一个 Telegram 账号
  isOwner        Boolean  @default(false) // A 阶段用来定位"当前用户"
  createdAt      DateTime @default(now())
  threads    Thread[]
  entries    Entry[]
  briefs     DailyBrief[]
  links      ThreadLink[]
}
```

给**根实体**加 `userId`(必填)+ 关系:`Thread / Entry / DailyBrief / ThreadLink`。
- 子表 `ClaimVersion / Challenge / Reading` 天然从属 Thread,通过 thread 关系隔离,**不重复加** `userId`。
- `DailyBrief` 唯一约束:`@unique` 的 `date` 改为 `@@unique([userId, date])`。

### `getCurrentUser()` 接缝

新建 `lib/auth.ts`:

```ts
export async function getCurrentUser(): Promise<User>
```

- **A 阶段实现**:返回 `isOwner: true` 的用户(找不到则惰性创建 owner)。无登录界面。
- **将来 C 阶段**:改为读 session/cookie 返回登录用户——签名不变,**调用方零改动**。
- **调用面**:所有 server action、页面查询、路由 handler、cron、signals 都改为先取 `const user = await getCurrentUser()`,查询 `where` 带 `userId: user.id`,create 时写 `userId: user.id`。面广但机械。

### 数据迁移

1. schema 迁移建 `User` 表 + 各表 `userId` 列(先允许 null 以便回填)。
2. 一次性脚本:创建 owner 用户 → 把现有全部 `Thread/Entry/DailyBrief/ThreadLink` 的 `userId` 回填为 owner → 再将列改为必填。
3. 本地 SQLite dev.db,数据不丢。

### 受影响文件(userId 重构清单,实现时逐个核对)

- `prisma/schema.prisma`
- `lib/db.ts`(不变)、新增 `lib/auth.ts`
- `lib/ingest.ts` / 新增 `lib/ingest-core.ts`、`lib/signals.ts`
- `app/actions.ts`(全部 action)
- `app/page.tsx`、`app/mind/page.tsx`、`app/brief/page.tsx`、`app/reading/page.tsx`、`app/outputs/page.tsx`、`app/thread/[id]/page.tsx` 等
- `app/api/*/route.ts`(voice / image / capture / cron/challenge)

---

## 第二部分:Telegram 捕获 + 回来 bot(本地长轮询)

### 形态

- 独立脚本 `bot/index.ts`,`npm run bot`(经 tsx)运行,与网页并排。
- 长轮询 `getUpdates`(带 offset 游标,处理完确认,避免重复)。
- 加载 `.env.local`(bot 是纯 node 进程,需显式 dotenv)。

### 配置(.env.local)

- `TELEGRAM_BOT_TOKEN`(BotFather 获取)
- owner 的 Telegram 用户 ID:存到 `User.telegramUserId`(A 阶段可先用 `TELEGRAM_OWNER_ID` env 引导写入)。

### ingestCore 抽取

- 现 `lib/ingest.ts` 带 `import "server-only"` + `revalidatePath`,bot 进程无法复用。
- 拆出 `lib/ingest-core.ts`:纯管线(classify → suggestThread → prisma.entry.create → touch thread.updatedAt),**新增写入 `userId`**,不带 server-only、不 revalidate。
- `lib/ingest.ts` 改为薄包装:`ingestCore(...)` + `revalidatePath`(Next 路径用)。
- bot 直接 import `ingestCore`。网页 + bot 共用同一份管线、同一个 DB。
- 注:bot 写入不触发网页热刷新,网页刷新可见(可接受;将来可加轻量轮询刷新)。

### 捕获流

- **文字**:`ingestCore(text, { userId, source: "telegram" })` → 回复「🌱 已记下 · {kind} · 归入「{thread}」」(无线程则"暂放收件箱")。
- **语音条**:Telegram `getFile` 下载 → Whisper 转写(复用 `/api/voice` 逻辑)→ ingestCore → 回复转写文本 + 确认。**v1 必含**(路上/床上关键)。
- **图片**:v1.1(下载 → 视觉描述 → ingestCore)。

### 回来那一半(闭环)

- bot 轮询循环顺带看表:每天设定时刻(默认早 9 点)把**今日之问**(复用 `dailyQuestion` + `gatherQuestionSignals` 盲区信号)作为一条 Telegram 消息推给 owner:「🌰 今天值得想一小时的一个问题:…」。
- 作者**直接回复**该消息 → 回复本身被捕获成新 entry。捕获与回来都在 Telegram 内,零摩擦闭环。
- 调度无需额外基建:循环内记"今天推过没",过点未推即推。
- Active Seed 挑战推送:v1.1。

### 安全

- bot 只处理 `telegramUserId` 已绑定到某 `User` 的消息;未知 id 一律忽略(防注入)。

### 命令

- 默认发什么都=捕获。
- 可选 `/today`:当场返回今日之问。
- 可选 `/start`:问候 + 简述。
- 不做更多。

---

## 模块边界

| 模块 | 职责 | 依赖 |
|---|---|---|
| `lib/ingest-core.ts` | 纯捕获管线(分类/归线/落库/触活),写 userId | prisma, ai |
| `lib/ingest.ts` | Next 包装:ingestCore + revalidate | ingest-core |
| `lib/auth.ts` | `getCurrentUser()` 接缝 | prisma |
| `lib/signals.ts` | 盲区信号(改为按 userId) | prisma |
| `bot/index.ts` | 长轮询:捕获 + 每日推送 | ingest-core, ai, prisma, telegram |
| `prisma/schema.prisma` | User + userId + DailyBrief 复合唯一 | — |

## 构建顺序

1. A:schema(User/userId/DailyBrief 复合唯一)+ 迁移回填 + `getCurrentUser()` + 全局 userId 重构。
2. ingestCore 抽取。
3. bot:文字捕获 → 语音捕获 → 每日推送 → `/today`。
4. 作者在第 3 步开始得到真实价值。

## 测试策略

- **隔离**:建第二个测试用户,确认其查询看不到 owner 的 threads/entries;DailyBrief 复合唯一生效。
- **bot 捕获**:发文字 → 网页 owner 名下出现、kind/thread 正确;发语音 → 转写 + 捕获正确。
- **每日推送**:到点触发一次且当天不重复;回复推送消息 → 被捕获成 entry。
- **安全**:陌生 telegram id 消息被忽略。
- **回归**:userId 重构后现有网页流程(捕获/线程/画像/编年史/简报/挑战)不回归。
- **离线补拉**:bot 停一会儿,期间手机发的消息在 bot 重启后被补拉入库。

## 风险与缓解

- **userId 重构面广**:纯机械但易漏。缓解:实现时按"受影响文件清单"逐个核对 + 第二用户隔离测试兜底。
- **bot 依赖电脑开机**:本地方案固有限制。缓解:Telegram 队列 + 醒来补拉,消息不丢;将来阶段 B/C 上云消除此限制(同份代码)。
- **语音转写成本/时延**:复用现有 Whisper,单人量级可忽略。
