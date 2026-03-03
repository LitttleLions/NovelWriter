import { NextResponse } from "next/server";
import { AVAILABLE_MODELS } from "@/lib/openrouter";

export async function GET() {
  return NextResponse.json({ models: AVAILABLE_MODELS });
}
