"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 日常只需要三面:星图(记)、简报(读)、认知(想)。
// 阅读并进简报,产出/导入收进设置的工具箱——都在,只是不占视线。
const LINKS = [
  { href: "/", label: "星图" },
  { href: "/brief", label: "简报" },
  { href: "/mind", label: "认知" },
  { href: "/settings", label: "设置" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <div className="ml-auto flex items-center gap-1 text-xs">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-1.5 transition"
            style={{
              color: active ? "var(--grow)" : "var(--muted)",
              background: active ? "var(--grow-soft, rgba(52,211,153,.12))" : "transparent",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
