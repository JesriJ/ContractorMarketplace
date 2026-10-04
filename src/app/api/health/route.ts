import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";

export async function GET() {
  const result = await checkDatabaseConnection();
  const status = result.ok ? 200 : 503;

  return NextResponse.json(result, { status });
}
