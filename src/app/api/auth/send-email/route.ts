import { NextResponse } from "next/server";

/**
 * 共有 Supabase プロジェクトでは Send Email Hook を有効化しないこと
 *（物件セカンドオピニオン側の送信にも影響するため）。
 *
 * フリマリストSold の Auth メールは次で Resend 直接送信します:
 * - POST /api/auth/signup
 * - POST /api/auth/forgot-password
 * From: フリマリストSold <noreply@cloudflowriver.com>
 */
export async function POST() {
  return NextResponse.json(
    {
      error: {
        http_code: 501,
        message:
          "Furima Sold uses /api/auth/signup and /api/auth/forgot-password with Resend. Do not enable the shared-project Send Email Hook for this app.",
      },
    },
    { status: 501 },
  );
}
