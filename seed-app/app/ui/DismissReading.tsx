"use client";

import { useTransition } from "react";
import { dismissReading } from "@/app/actions";

export default function DismissReading({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => dismissReading(id))}
      disabled={pending}
      className="mono shrink-0 text-[11px] text-muted2 hover:text-txt"
      title="不感兴趣"
    >
      ✕
    </button>
  );
}
