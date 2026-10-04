import { NextResponse } from "next/server";
import { listConversations } from "@/lib/messages";

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const result = await listConversations(Number.isFinite(page) ? page : 1);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
