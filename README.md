# フリマ一発売却メーカー

フリマアプリ出品用の商品説明を自動生成する Next.js アプリです。

## 技術スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Lucide Icons
- Google Gemini API (`@ai-sdk/google`)
- Sentry (`@sentry/nextjs`)
- Discord Webhook（お問い合わせ通知）

## セットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local に API キー等を設定
npm run dev
```

## 環境変数

| 変数名 | 用途 |
| --- | --- |
| `GEMINI_API_KEY` | 出品文生成（未設定時はローカル生成にフォールバック） |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry エラー監視 |
| `DISCORD_WEBHOOK_URL` | お問い合わせの Discord 通知 |

## 主な機能

- 商品情報フォームから SEO タイトル 3 種・説明文・ハッシュタグを生成
- 1 クリック / 一括コピー
- ライト / ダークモード
- お問い合わせ → Discord Webhook
- Sentry + 個人情報マスキング（`lib/sentry-scrub.ts`）
