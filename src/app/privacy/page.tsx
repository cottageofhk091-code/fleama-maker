import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";
import { LEGAL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: `${SITE_NAME}のプライバシーポリシー`,
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="プライバシーポリシー">
      <p>
        {LEGAL.serviceName}
        （以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、本サービスにおける情報の取扱いについて説明します。
      </p>

      <LegalSection title="1. 取得する情報">
        <p>当運営は、本サービスの提供にあたり、次の情報を取得することがあります。</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            アカウント情報（メールアドレス、表示名、プラン状態など、登録・認証に必要な情報）
          </li>
          <li>
            決済情報（カード番号等の機密情報は原則として当運営が直接保持せず、
            {LEGAL.paymentProvider} 等の決済代行会社を通じて処理されます）
          </li>
          <li>
            入力・生成テキストデータ（商品情報、コンディションメモ、生成された出品文など、サービス提供に必要なデータ）
          </li>
          <li>
            利用ログ（アクセス日時、端末・ブラウザ情報、エラー情報など、安定運用・不正防止のための情報）
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. 利用目的">
        <p>取得した情報は、次の目的で利用します。</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>本サービスの提供、本人確認、プラン管理</li>
          <li>サービスの改善、品質向上、新機能の検討</li>
          <li>決済・請求・返金に関する管理</li>
          <li>お問い合わせ・サポート対応</li>
          <li>不正利用の防止、セキュリティ確保、規約違反への対応</li>
          <li>重要なお知らせの通知</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 第三者提供">
        <p>
          当運営は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
        </p>
        <p>
          ただし、サービス提供に必要な範囲で、次の事業者へ最小限のデータを連携することがあります。
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            API提供事業者（{LEGAL.aiProviders}
            ）: 出品文生成等の処理に必要な入力テキスト
          </li>
          <li>
            決済事業者（{LEGAL.paymentProvider}
            等）: 有料プランの課金・更新に必要な決済関連情報
          </li>
          <li>
            インフラ・分析・サポート関連の委託先: 運用・障害対応・問い合わせ処理に必要な範囲
          </li>
        </ul>
        <p>
          これらの事業者における取扱いは、各社のプライバシーポリシーおよび契約条件に従います。
        </p>
      </LegalSection>

      <LegalSection title="4. 安全管理">
        <p>
          当運営は、取得した情報の漏えい、滅失、毀損の防止その他の安全管理のため、合理的な措置を講じます。
        </p>
      </LegalSection>

      <LegalSection title="5. お問い合わせ">
        <p>
          個人情報の取扱いに関するお問い合わせは、サイト内の
          <a href="/contact" className="text-teal-400 underline-offset-2 hover:underline">
            お問い合わせフォーム
          </a>
          よりご連絡ください。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
