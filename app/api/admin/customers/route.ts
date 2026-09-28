import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimiter, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateCheck = rateLimiter.check(`admin_cust_${clientIp}`, 120, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          include: {
            refund: true,
          },
          orderBy: { purchaseDate: "desc" },
        },
        refunds: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error: unknown) {
    console.error("Admin customers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}
