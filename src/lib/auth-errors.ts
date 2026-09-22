/**
 * Supabase Auth / fetch 由来の英語エラーをユーザー向け日本語へ変換する。
 * すでに日本語のメッセージはそのまま返す。
 */
export function translateAuthError(errorMessage: string | null | undefined): string {
  if (!errorMessage?.trim()) {
    return "エラーが発生しました。もう一度お試しください。";
  }

  const raw = errorMessage.trim();
  // API 側で既に日本語化済みの文言はそのまま表示
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(raw)) {
    return raw;
  }

  const message = raw.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid_credentials") ||
    message.includes("invalid email or password")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (
    message.includes("user already registered") ||
    message.includes("email_already_exists") ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already exists")
  ) {
    return "このメールアドレスは既に登録されています。";
  }
  if (
    message.includes("password should be at least") ||
    message.includes("password is known to be weak") ||
    message.includes("password is too short") ||
    message.includes("signup requires a valid password")
  ) {
    return "パスワードは6文字以上で入力してください。";
  }
  if (
    message.includes("new password should be different") ||
    message.includes("same password")
  ) {
    return "新しいパスワードは現在のパスワードと別のものを設定してください。";
  }
  if (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed")
  ) {
    return "メールアドレスの確認が完了していません。届いたメールの確認リンクをクリックしてください。";
  }
  if (
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("email rate limit") ||
    message.includes("over_email_send_rate_limit")
  ) {
    return "試行回数が多すぎます。時間をおいてから再度お試しください。";
  }
  if (
    message.includes("auth/token-expired") ||
    message.includes("token has expired") ||
    message.includes("otp_expired") ||
    message.includes("otp has expired") ||
    message.includes("link is invalid or has expired") ||
    message.includes("expired")
  ) {
    return "リンクの有効期限が切れています。もう一度最初からお手続きください。";
  }
  if (
    message.includes("invalid jwt") ||
    message.includes("invalid token") ||
    message.includes("invalid otp") ||
    message.includes("token not found") ||
    message.includes("flow_state_not_found") ||
    message.includes("flow state")
  ) {
    return "リンクが無効です。もう一度メール送信からお試しください。";
  }
  if (
    message.includes("session missing") ||
    message.includes("auth session missing") ||
    message.includes("not authenticated") ||
    message.includes("user not found")
  ) {
    return "ログイン状態を確認できませんでした。もう一度お試しください。";
  }
  if (
    message.includes("unable to validate email") ||
    message.includes("invalid email") ||
    (message.includes("email address") && message.includes("invalid"))
  ) {
    return "メールアドレスの形式が正しくありません。";
  }
  if (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("load failed") ||
    message.includes("networkerror")
  ) {
    return "通信エラーが発生しました。ネットワーク接続を確認してください。";
  }
  if (message.includes("supabase") && message.includes("未設定")) {
    return raw;
  }

  return `エラーが発生しました（${raw}）`;
}
