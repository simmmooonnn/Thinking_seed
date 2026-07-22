export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shouldPushDaily(lastPushedYmd: string | null, now: Date, hour: number): boolean {
  return now.getHours() >= hour && ymd(now) !== lastPushedYmd;
}
