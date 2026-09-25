"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand-mark";
import { translateAuthError } from "@/lib/auth-errors";
import {
  REGISTERED_QUERY_KEY,
  REGISTERED_QUERY_VALUE,
} from "@/lib/auth-redirect";
import { notifySignupConfirmed } from "@/lib/auth-tab-sync";
import { getSupabase } from "@/lib/supabase";
import { SITE_NAME } from "@/lib/site";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

const SUCCESS_TITLE = "認証が完了しました";
const SUCCESS_BODY =
  "元の画面（タブ）に戻ってお続けください。このウィンドウは閉じて構いません。";

export default function AuthConfirmedPage() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("メールアドレスを確認しています…");

  useEffect(() => {
    let cancelled = false;

    const finishOk = () => {
      if (cancelled) return;
      notifySignupConfirmed({ bonusGranted: true });
      setStatus("ok");
      setMessage(SUCCESS_BODY);
    };

    void (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          throw new Error("Supabase が未設定です。");
        }

        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const tokenHash =
          url.searchParams.get("token_hash") || hashParams.get("token_hash");
        const typeRaw = url.searchParams.get("type") || hashParams.get("type");
        const type =
          typeRaw && OTP_TYPES.has(typeRaw as EmailOtpType)
            ? (typeRaw as EmailOtpType)
            : null;
        const code = url.searchParams.get("code");
        const access_token =
          hashParams.get("access_token") || url.searchParams.get("access_token");
        const refresh_token =
          hashParams.get("refresh_token") ||
          url.searchParams.get("refresh_token");
        const registeredFlag =
          url.searchParams.get(REGISTERED_QUERY_KEY) ===
            REGISTERED_QUERY_VALUE ||
          type === "signup" ||
          type === "invite";

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // 新規登録完了はトップへ ?registered=true で飛ばし、ダイアログを確実に出す
          if (registeredFlag && !cancelled) {
            notifySignupConfirmed({ bonusGranted: true });
            window.location.replace(
              `/?${REGISTERED_QUERY_KEY}=${REGISTERED_QUERY_VALUE}`,
            );
            return;
          }
          window.history.replaceState({}, "", "/auth/confirmed");
          finishOk();
          return;
        }

        throw new Error(
          "リンクが無効か、有効期限が切れています。元の画面から登録をやり直してください。",
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          translateAuthError(err instanceof Error ? err.message : String(err)),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-2xl border border-teal-200/80 bg-white p-6 text-center shadow-sm dark:border-teal-900 dark:bg-slate-900/80 sm:p-8">
        <div className="mb-4 flex justify-center">
          <BrandMark size={48} className="rounded-xl shadow-sm" />
        </div>
        <p className="text-[11px] font-semibold tracking-wide text-teal-700 dark:text-teal-300">
          {SITE_NAME}
        </p>
        <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          {status === "working"
            ? "確認中"
            : status === "ok"
              ? SUCCESS_TITLE
              : "確認できませんでした"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
          {message}
        </p>
        {status === "ok" && (
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
          >
            このウィンドウを閉じる
          </button>
        )}
      </div>
    </main>
  );
}
