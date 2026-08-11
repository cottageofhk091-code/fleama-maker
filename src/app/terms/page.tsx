import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";
import { LEGAL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "利用規約",
  description: `${SITE_NAME}の利用規約・免責事項`,
};

export default function TermsPage() {
  return (
    <LegalPageShell title="利用規約・免責事項">
      <p>
        本利用規約（以下「本規約」）は、{LEGAL.serviceName}
        （以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくすべての方（以下「ユーザー」）は、本規約に同意したものとみなします。
      </p>

      <LegalSection title="第1条（適用）">
        <p>
          本規約は、本サービスの提供条件および本サービスの利用に関する{LEGAL.serviceName}
          運営者（以下「当運営」）とユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当運営との間の本サービスの利用に関わる一切の関係に適用されます。
        </p>
        <p>
          当運営が本サービス上で掲載するルール、ガイドライン等は、本規約の一部を構成するものとします。
        </p>
      </LegalSection>

      <LegalSection title="第2条（AI生成コンテンツと免責事項）">
        <p>
          本サービスは、AIにより出品文・タイトル・販促文等のテキストを自動生成します。生成結果の正確性、完全性、適法性、特定目的への適合性について、当運営はいかなる保証も行いません。
        </p>
        <p>
          ユーザーは、フリマアプリ等への掲載前に、生成テキストの内容（商品情報、状態、価格表現、法令・プラットフォーム規約への適合等）を必ず自身で確認・調整する責任を負うものとします。
        </p>
        <p>
          本サービスの利用、または生成テキストの掲載・取引に起因して生じたトラブル、損害、クレーム、返品、規約違反等について、当運営は法令上許容される範囲で一切の責任を負いません。
        </p>
      </LegalSection>

      <LegalSection title="第3条（有料プランおよび決済）">
        <p>
          本サービスは、Sold
          Pro等の有料プランを提供する場合があります。有料プランは、申込時に表示される条件に従い、原則として自動更新されます。
        </p>
        <p>
          デジタルコンテンツ・オンラインサービスの性質上、決済完了後の返金は原則としてお受けできません。解約手続きを行った場合でも、当該課金期間の残存分についての按分返金は行いません。
        </p>
        <p>
          解約はマイページ内の「契約管理・解約」よりいつでも可能です。Stripeをご利用の場合はカスタマーポータルからの解約、または解約申請フォームからの申請が可能です。
        </p>
        <p>
          決済は{LEGAL.paymentProvider}
          等の決済代行事業者を通じて処理されます。カード情報等の取扱いは当該事業者の規約・ポリシーに従います。
        </p>
      </LegalSection>

      <LegalSection title="第4条（禁止事項）">
        <p>ユーザーは、本サービスの利用にあたり、次の行為をしてはなりません。</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>法令または公序良俗に違反する行為</li>
          <li>不正アクセス、アカウントの不正利用、なりすまし</li>
          <li>本サービスへの過度な負荷、妨害、改ざん</li>
          <li>本サービスのリバースエンジニアリング、解析、複製、再配布</li>
          <li>当運営または第三者の権利・利益を侵害する行為</li>
          <li>その他、当運営が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="第5条（規約の変更）">
        <p>
          当運営は、必要に応じて本規約を変更できます。変更後の規約は、本サービス上に掲示した時点から効力を生じるものとします。
        </p>
      </LegalSection>

      <LegalSection title="お問い合わせ">
        <p>
          本規約に関するお問い合わせは、サイト内の
          <a href={LEGAL.contactPath} className="text-teal-400 underline-offset-2 hover:underline">
            お問い合わせフォーム
          </a>
          よりご連絡ください。解約は
          <a href={LEGAL.accountPath} className="text-teal-400 underline-offset-2 hover:underline">
            マイページ内の「契約管理・解約」
          </a>
          よりいつでも可能です。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
