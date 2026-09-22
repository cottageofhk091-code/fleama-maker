import type { Metadata } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { BillingProvider } from "@/components/billing/billing-provider";
import { PricingPlansModalHost } from "@/components/pricing-plans-modal";
import { DevPlanSwitcher } from "@/components/billing/dev-plan-switcher";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { VisitTracker } from "@/components/visit-tracker";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  siteAssets,
} from "@/lib/site";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
  ),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: siteAssets.faviconIco, sizes: "any" },
      { url: siteAssets.faviconPng, type: "image/png", sizes: "512x512" },
    ],
    shortcut: siteAssets.faviconIco,
    apple: siteAssets.faviconPng,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: siteAssets.headerNote,
        width: 1280,
        height: 670,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: [siteAssets.headerNote],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${notoSansJp.variable} ${zenMaru.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <BillingProvider>
              <VisitTracker />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <PricingPlansModalHost />
              <DevPlanSwitcher />
              <Analytics />
            </BillingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
