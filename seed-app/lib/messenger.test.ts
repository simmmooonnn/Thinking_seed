import { test, expect } from "vitest";
import { buildItems, resurfaceReason } from "./messenger";

test("buildItems orders challenge > nudge > resurface, stable within group", () => {
  const items = buildItems({
    challenges: [
      { id: "c1", threadId: "t1", threadTitle: "A", stance: "challenge", text: "x" },
      { id: "c2", threadId: "t2", threadTitle: "B", stance: "support", text: "y" },
    ],
    nudge: { id: "n1", text: "hi" },
    resurface: [{ id: "r1", title: "C", days: 5, question: null, reason: null }],
  });
  expect(items.map((i) => i.id)).toEqual(["c1", "c2", "n1", "r1"]);
  expect(items[0].kind).toBe("challenge");
  expect(items[2].kind).toBe("nudge");
});

test("buildItems skips null nudge", () => {
  const items = buildItems({ challenges: [], nudge: null, resurface: [] });
  expect(items).toEqual([]);
});

test("resurfaceReason finds active partner via link (either direction)", () => {
  const links = [
    { aId: "dormant", bId: "active1" },
    { aId: "active2", bId: "dormant" },
  ];
  const active = new Map([["active2", "注意力vs判断力"]]);
  expect(resurfaceReason("dormant", links, active)).toBe("它和你最近在想的「注意力vs判断力」相连");
});

test("resurfaceReason returns null when no linked partner is active", () => {
  const links = [{ aId: "dormant", bId: "sleepy" }];
  expect(resurfaceReason("dormant", links, new Map())).toBeNull();
  expect(resurfaceReason("lonely", links, new Map([["sleepy", "X"]]))).toBeNull();
});
