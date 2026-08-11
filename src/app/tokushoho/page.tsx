import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";
import { LEGAL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: `${SITE_NAME}の特定商取引法に基づく表記`,
};

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-white/10 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-200">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

export default function TokushohoPage() {
  return (
    <LegalPageShell title="特定商取引法に基づく表記">
      <p>
        {LEGAL.serviceName}
        における有料サービスの提供にあたって、特定商取引法に基づき以下のとおり表記します。表記内容は必要に応じて更新されることがあります。
      </p>

      <LegalSection title="表記事項">
        <dl className="rounded-xl border border-white/10 bg-slate-900/60 px-4 sm:px-5">
          <Row label="販売事業者" value={LEGAL.sellerName} />
          <Row label="運営責任者" value={LEGAL.operatorName} />
          <Row label="所在地／電話番号" value={LEGAL.addressAndPhone} />
          <Row
            label="お問い合わせ先"
            value={
              <>
                {LEGAL.contactMethod}
                <br />
                <Link
                  href={LEGAL.contactPath}
                  className="text-teal-400 underline-offset-2 hover:underline"
                >
                  お問い合わせフォームを開く
                </Link>
              </>
            }
          />
          <Row label="支払方法" value={LEGAL.paymentMethod} />
          <Row
            label="販売価格"
            value="各プラン申込画面に表示する価格（消費税込表示）"
          />
          <Row
            label="商品等の引渡時期"
            value="決済完了後、即時利用可能"
          />
          <Row
            label="返品・キャンセル"
            value={
              <>
                デジタルコンテンツ・オンラインサービスの性質上、決済完了後の返金は原則としてお受けできません。
                {"\n"}
                解約はマイページ内の「契約管理・解約」よりいつでも可能です（解約後も当該課金期間の終了までは利用できる場合があります）。
                {"\n"}
                <Link
                  href={LEGAL.accountPath}
                  className="text-teal-400 underline-offset-2 hover:underline"
                >
                  マイページ（契約管理・解約）へ
                </Link>
              </>
            }
          />
          <Row
            label="動作環境"
            value="最新の主要ブラウザ（Chrome / Safari / Edge 等）および安定したインターネット接続"
          />
        </dl>
      </LegalSection>

      <LegalSection title="補足">
        <p>
          所在地・電話番号等の開示請求がある場合は、
          <Link
            href={LEGAL.contactPath}
            className="text-teal-400 underline-offset-2 hover:underline"
          >
            お問い合わせフォーム
          </Link>
          よりご連絡ください。法令に基づき、遅滞なく開示します。
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
