import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimiter, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateCheck = rateLimiter.check(`admin_logs_${clientIp}`, 120, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const eventType = searchParams.get("type");
    const rawLimit = parseInt(searchParams.get("limit") || "100", 10);
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 100 : Math.min(rawLimit, 500);

    const whereClause: Record<string, unknown> = {};
    if (sessionId && sessionId.trim() !== "") {
      whereClause.sessionId = sessionId.trim().slice(0, 100);
    }
    if (eventType && eventType.trim() !== "ALL") {
      whereClause.type = eventType.trim().slice(0, 50);
    }

    const [
      events,
      totalEvents,
      refundsApproved,
      refundsDenied,
      manualReviews,
      toolFailures,
      uniqueSessionsCount,
      allSessions,
    ] = await Promise.all([
      prisma.agentEvent.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.agentEvent.count(),
      prisma.agentEvent.count({ where: { type: "REFUND_PROCESSED" } }),
      prisma.agentEvent.count({ where: { type: "REFUND_DENIED" } }),
      prisma.agentEvent.count({ where: { type: "MANUAL_REVIEW_CREATED" } }),
      prisma.agentEvent.count({
        where: { OR: [{ type: "TOOL_ERROR" }, { status: "FAILED" }] },
      }),
      prisma.agentEvent.groupBy({
        by: ["sessionId"],
      }),
      prisma.agentEvent.findMany({
        distinct: ["sessionId"],
        select: { sessionId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      events,
      stats: {
        totalEvents,
        totalSessions: uniqueSessionsCount.length,
        refundsApproved,
        refundsDenied,
        manualReviews,
        toolFailures,
      },
      availableSessions: allSessions.map((s) => s.sessionId),
    });
  } catch (error: unknown) {
    console.error("Admin logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve logs" },
      { status: 500 }
    );
  }
}
