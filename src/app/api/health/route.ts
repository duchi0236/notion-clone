import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEnv } from "@/lib/env";

export async function GET() {
  const startedAt = Date.now();
  const env = validateEnv();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      app: "clawnote",
      environment: process.env.NODE_ENV,
      database: "connected",
      env: env.ok ? "valid" : "invalid",
      envErrors: env.errors,
      timestamp: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      app: "clawnote",
      environment: process.env.NODE_ENV,
      database: "failed",
      env: env.ok ? "valid" : "invalid",
      envErrors: env.errors,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
    }, { status: 500 });
  }
}
