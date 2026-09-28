import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runRefundAgent } from "@/agent/agent";
import { logAgentEvent } from "@/lib/logger";
import { rateLimiter, getClientIp } from "@/lib/rateLimit";

const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(4000, "Message exceeds 4,000 characters limit"),
  customerId: z.string().trim().min(1).max(50).default("CUST-001"),
  sessionId: z.string().trim().max(100).optional(),
  requestId: z.string().trim().max(100).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(8000),
      })
    )
    .max(100)
    .optional(),
});

// Idempotency cache to prevent duplicate processing on retries/double-clicks (Requirement 26)
interface CachedResponse {
  result: unknown;
  timestamp: number;
}
const requestCache = new Map<string, CachedResponse>();

function cleanStaleCache(now: number) {
  if (requestCache.size > 500) {
    for (const [k, v] of requestCache.entries()) {
      if (now - v.timestamp > 1000 * 60 * 15) {
        requestCache.delete(k);
      }
    }
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting check: 60 requests per minute per client IP
  const clientIp = getClientIp(req);
  const rateCheck = rateLimiter.check(`chat_${clientIp}`, 60, 60 * 1000);
  if (!rateCheck.success) {
    return NextResponse.json(
      {
        message: "You have sent too many requests. Please wait a moment before sending another message.",
        error: "Rate limit exceeded",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { message, customerId, conversationHistory, requestId } = parsed.data;

  // Check idempotency cache
  const now = Date.now();
  cleanStaleCache(now);
  if (requestId && requestCache.has(requestId)) {
    const cached = requestCache.get(requestId)!;
    return NextResponse.json(cached.result);
  }

  const sessionId =
    parsed.data.sessionId || `sess_${now}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const result = await runRefundAgent({
      sessionId,
      customerId,
      message,
      conversationHistory,
    });

    if (requestId) {
      requestCache.set(requestId, { result, timestamp: Date.now() });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal agent failure";
    console.error("API /api/chat error:", error);

    await logAgentEvent({
      sessionId,
      type: "AGENT_ERROR",
      status: "FAILED",
      output: { error: errorMsg },
      message: `Fatal error in chat endpoint: ${errorMsg}`,
    });

    return NextResponse.json(
      {
        message:
          "I apologize, but an unexpected technical error occurred while processing your request. Please try again shortly.",
        sessionId,
        toolCalls: [],
        decisionCard: null,
      },
      { status: 500 }
    );
  }
}
