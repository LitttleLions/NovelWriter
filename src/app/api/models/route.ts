import { NextResponse } from "next/server";
import { AVAILABLE_MODELS } from "@/lib/openrouter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { models: AVAILABLE_MODELS },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
