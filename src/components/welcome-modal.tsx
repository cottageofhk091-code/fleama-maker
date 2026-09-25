"use client";

import { BrandMark } from "@/components/brand-mark";
import { CenterModal } from "@/components/center-modal";
import {
  SIGNUP_WELCOME_BODY,
  SIGNUP_WELCOME_TITLE,
} from "@/lib/auth-tab-sync";
import { SITE_NAME } from "@/lib/site";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 互換用（旧バナー文言）。未指定時は定型タイトル/本文を使用 */
  message?: string | null;
};

/**
 * 会員登録完了ダイアログ — ユーザーが閉じるまで表示し続ける
 */
export function WelcomeModal({ open, onClose }: Props) {
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      labelledBy="welcome-dialog-title"
    >
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <BrandMark size={48} className="rounded-xl shadow-sm" />
        </div>
        <p className="text-[11px] font-semibold tracking-wide text-teal-700 dark:text-teal-300">
          {SITE_NAME}
        </p>
        <h2
          id="welcome-dialog-title"
          className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white"
        >
          {SIGNUP_WELCOME_TITLE}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {SIGNUP_WELCOME_BODY}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
        >
          閉じる
        </button>
      </div>
    </CenterModal>
  );
}

/** @deprecated WelcomeModal を利用してください */
export const WelcomeBanner = WelcomeModal;
