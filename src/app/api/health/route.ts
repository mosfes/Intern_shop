import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/health — checks the database connection (TiDB returns e.g. "8.0.11-TiDB-v8.5.x")
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ version: string }[]>`SELECT VERSION() AS version`;
    return NextResponse.json({ ok: true, version: rows[0]?.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
