# Seed Telegram Bot

在 Telegram 里零摩擦捕获念头到 Seed——发文字或语音条,自动分类归线；每天早上还会推送一个「今日之问」。纯本地长轮询,不需要部署、不需要公网 IP、不需要 webhook。

## 准备

1. 在 Telegram 里找 **@BotFather**,发 `/newbot`,按提示起个名字,拿到一个 bot token(形如 `123456:ABC-DEF...`)。
2. 拿到自己的 Telegram 数字 user id：给 **@userinfobot** 发一条消息,它会回复你的 id。

## 配置

在 `seed-app/.env.local` 里加两行(把值换成你自己的):

```
TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
TELEGRAM_OWNER_ID="你的数字id"
```

## 运行

`.env.local` 里还需要有 `ANTHROPIC_API_KEY`(以及可选的 `OPENAI_API_KEY`),因为捕获后的分类/今日之问都靠它。bot 和网页用的是同一个 `dev.db`,数据是通的。

```bash
cd seed-app
npm run bot
```

启动成功会打印:

```
bot 已连接: @yourbot — 长轮询中,Ctrl+C 退出
```

## 用法

- 直接发一段文字或一条语音 → bot 自动分类、归入合适的线,并回一条确认(记下了什么 kind、归到了哪条线,或暂放收件箱)。
- 发 `/today` → 当场要一个「今天值得想一小时的问题」。
- 每天 9 点(本地时间,bot 进程所在时区)会自动推送一次今日之问；直接回复那条消息(发文字)就会被当作正常捕获记下。

## 关于电脑开关机

bot 跑在你自己电脑上,需要电脑开着(睡眠也没关系)。电脑睡眠或关机期间,Telegram 服务器会把消息排队;bot 一旦重新开始拉取(长轮询),会自动补收这段时间的消息,不会丢。

## 安全

bot 只认已绑定为 owner 的 Telegram id(首次启动时,`.env.local` 里的 `TELEGRAM_OWNER_ID` 会被写入 owner 用户)。其他任何人发来的消息一律忽略,不会被记录、不会触发任何操作。

## 小贴士

可以先在 `seed-app` 里 `npm run dev` 起网页(可选,用来看捕获结果、浏览线),再另开一个终端跑 `npm run bot`。两者互不干扰,共享同一份数据。
