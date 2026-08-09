"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  text: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
};

export function CopyButton({
  text,
  label = "コピー",
  className = "",
  size = "sm",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const sizeClass =
    size === "md"
      ? "h-10 px-4 text-sm"
      : "h-8 px-3 text-xs";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/60 ${sizeClass} ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          コピー済
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}
