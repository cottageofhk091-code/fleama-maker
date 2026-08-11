import { HomeClient } from "@/components/home-client";

/** 課金UI・生成フォームが常に最新コードで載るよう動的レンダリング */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <HomeClient />;
}
