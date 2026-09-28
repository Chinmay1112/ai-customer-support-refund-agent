import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimiter, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateCheck = rateLimiter.check(`customers_${clientIp}`, 120, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        orders: {
          select: {
            id: true,
            productName: true,
            amount: true,
            status: true,
            refundStatus: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error: unknown) {
    console.error("Customers list fetch error:", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}
