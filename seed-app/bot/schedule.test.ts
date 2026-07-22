import { test, expect } from "vitest";
import { shouldPushDaily } from "./schedule";

const at = (h: number) => new Date(2026, 6, 21, h, 0, 0);

test("pushes once after the hour on a new day", () => {
  expect(shouldPushDaily(null, at(9), 9)).toBe(true);
  expect(shouldPushDaily("2026-07-21", at(10), 9)).toBe(false); // 今天已推
  expect(shouldPushDaily("2026-07-20", at(10), 9)).toBe(true);  // 新的一天
});

test("does not push before the hour", () => {
  expect(shouldPushDaily(null, at(8), 9)).toBe(false);
});
