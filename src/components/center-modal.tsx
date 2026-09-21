"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  /** Prevent backdrop close while busy */
  closeDisabled?: boolean;
};

/**
 * 中央配置モーダル共通シェル（見切れ防止）
 */
export function CenterModal({
  open,
  onClose,
  labelledBy,
  children,
  closeDisabled = false,
}: Props) {
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  function maybeCloseFromBackdrop(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.target !== e.currentTarget || closeDisabled) return;
    // 開いた直後の同一クリックで backdrop が受けて即閉じるのを防ぐ
    if (Date.now() - openedAtRef.current < 320) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      role="presentation"
      onMouseDown={maybeCloseFromBackdrop}
      onClick={maybeCloseFromBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="mx-auto w-[90%] max-w-[480px] max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{
          width: "90%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          margin: "auto",
          borderRadius: 12,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
