import { NextResponse } from "next/server";
import { generateListing } from "@/lib/gemini";
import { CATEGORIES, CONDITIONS } from "@/lib/types";
import type { ProductInput } from "@/lib/types";
import * as Sentry from "@sentry/nextjs";

function isProductInput(body: unknown): body is ProductInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.category === "string" &&
    (CATEGORIES as readonly string[]).includes(b.category) &&
    typeof b.brand === "string" &&
    b.brand.trim().length > 0 &&
    typeof b.productName === "string" &&
    b.productName.trim().length > 0 &&
    typeof b.condition === "string" &&
    (CONDITIONS as readonly string[]).includes(b.condition)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isProductInput(body)) {
      return NextResponse.json(
        { error: "入力内容が不正です。必須項目を確認してください。" },
        { status: 400 },
      );
    }

    const input: ProductInput = {
      category: body.category,
      brand: body.brand.trim(),
      productName: body.productName.trim(),
      condition: body.condition,
      size: body.size?.trim() || undefined,
      color: body.color?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    };

    const result = await generateListing(input);
    return NextResponse.json(result);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "生成中にエラーが発生しました。しばらくしてから再度お試しください。" },
      { status: 500 },
    );
  }
}
