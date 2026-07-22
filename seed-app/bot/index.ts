import { getMe } from "./telegram";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error("缺 TELEGRAM_BOT_TOKEN(写进 .env.local)"); process.exit(1); }

const me = await getMe(token);
console.log(`bot 已连接: @${me.username}`);
