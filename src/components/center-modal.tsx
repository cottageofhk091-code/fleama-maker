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
  /**
   * true（既定）: ダイアログに p-6 を付与
   * false: 子コンポーネント側で余白を管理（料金プラン等）
   */
  padded?: boolean;
};

/**
 * 全モーダル共通シェル — 画面中央固定・見切れ防止
 */
export function CenterModal({
  open,
  onClose,
  labelledBy,
  children,
  closeDisabled = false,
  padded = true,
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
    if (Date.now() - openedAtRef.current < 320) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={maybeCloseFromBackdrop}
      onClick={maybeCloseFromBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative my-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-700 ${
          padded ? "p-6" : ""
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
