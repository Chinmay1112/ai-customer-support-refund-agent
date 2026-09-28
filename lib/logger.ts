import { prisma } from "./db";

export type EventType =
  | "AGENT_STARTED"
  | "USER_MESSAGE_RECEIVED"
  | "INTENT_DETECTED"
  | "STATE_BEFORE"
  | "ENTITY_EXTRACTION"
  | "STATE_TRANSITION"
  | "TOOL_AUTHORIZATION"
  | "CUSTOMER_LOOKUP"
  | "ORDER_LOOKUP"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "TOOL_SUCCESS"
  | "TOOL_ERROR"
  | "POLICY_CHECK"
  | "POLICY_RULE_PASSED"
  | "POLICY_RULE_FAILED"
  | "REFUND_REQUEST_STARTED"
  | "ORDER_IDENTIFIED"
  | "REFUND_REASON_CAPTURED"
  | "ELIGIBILITY_CHECK_STARTED"
  | "ELIGIBILITY_CHECK_COMPLETED"
  | "REFUND_CONFIRMATION_REQUESTED"
  | "REFUND_CONFIRMATION_RECEIVED"
  | "REFUND_CONFIRMATION_CANCELLED"
  | "REFUND_EXECUTION_BLOCKED"
  | "REFUND_PROCESSED"
  | "REFUND_DENIED"
  | "MANUAL_REVIEW_CREATED"
  | "STATE_AFTER"
  | "AGENT_COMPLETED"
  | "AGENT_ERROR";

export type EventStatus = "SUCCESS" | "FAILED" | "INFO" | "WARNING";

export interface LogEventParams {
  sessionId: string;
  type: EventType;
  toolName?: string;
  status?: EventStatus;
  input?: unknown;
  output?: unknown;
  message: string;
  metadata?: Record<string, unknown>;
}

// Sanitize helper to ensure no API keys or sensitive data are ever logged
function sanitize(data: unknown): unknown {
  if (!data) return data;
  try {
    const str = JSON.stringify(data);
    const sanitizedStr = str
      .replace(/sk-[a-zA-Z0-9_\-]{15,}/gi, "sk-***REDACTED***")
      .replace(/AQ\.[a-zA-Z0-9_\-]{15,}/gi, "AQ.***REDACTED***")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, "Bearer ***REDACTED***")
      .replace(/"(password|token|secret|apiKey|api_key)"\s*:\s*"[^"]+"/gi, '"$1":"***REDACTED***"');
    return JSON.parse(sanitizedStr);
  } catch {
    return data;
  }
}

function stringifySafe(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(sanitize(val));
  } catch {
    return String(val);
  }
}

export async function logAgentEvent(params: LogEventParams) {
  const {
    sessionId,
    type,
    toolName,
    status = "INFO",
    input,
    output,
    message,
    metadata,
  } = params;

  const sanitizedInput = stringifySafe(input);
  const sanitizedOutput = stringifySafe(output);
  const sanitizedMetadata = stringifySafe(metadata);

  // Safe console output for developer inspection
  if (process.env.NODE_ENV !== "test") {
    const symbol = status === "SUCCESS" ? "✓" : status === "FAILED" ? "✗" : "ℹ";
    console.log(
      `[${new Date().toISOString()}] [${sessionId.slice(0, 8)}] [${type}] ${symbol} ${message} ${
        toolName ? `(${toolName})` : ""
      }`
    );
  }

  try {
    const event = await prisma.agentEvent.create({
      data: {
        sessionId,
        type,
        toolName: toolName || null,
        status,
        input: sanitizedInput,
        output: sanitizedOutput,
        message,
        metadata: sanitizedMetadata,
      },
    });
    return event;
  } catch (err) {
    console.error("Failed to write AgentEvent log to database:", err);
    return null;
  }
}
