import type { Metadata } from "next";
import Link from "next/link";
import NavLinks from "./ui/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seed · 思想种子",
  description: "Human-First Reasoning Layer — 保存使答案属于你的那段人类推理。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="inline-block h-[10px] w-[10px] rounded-[3px]"
                style={{ background: "var(--grow)", boxShadow: "0 0 14px var(--grow)" }}
              />
              <span className="mono text-sm tracking-widest text-muted">SEED</span>
            </Link>
            <span className="text-xs text-muted2">· 思想种子</span>
            <NavLinks />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">{children}</main>
      </body>
    </html>
  );
}
