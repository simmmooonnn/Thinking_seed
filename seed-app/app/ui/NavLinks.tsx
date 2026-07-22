"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "星图" },
  { href: "/brief", label: "简报" },
  { href: "/reading", label: "阅读" },
  { href: "/mind", label: "认知" },
  { href: "/outputs", label: "产出" },
  { href: "/import", label: "导入" },
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
