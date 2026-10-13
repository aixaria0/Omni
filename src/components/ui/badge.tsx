import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-bg/35 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
        tone === "neutral" && "border-border text-muted",
        tone === "ok" && "border-ok/25 bg-ok/5 text-ok",
        tone === "warn" && "border-warn/25 bg-warn/5 text-warn",
        tone === "danger" && "border-danger/25 bg-danger/5 text-danger",
        tone === "accent" && "border-accent/25 bg-accent/5 text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
