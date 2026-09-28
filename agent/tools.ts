import { prisma } from "@/lib/db";
import { logAgentEvent } from "@/lib/logger";
import { checkRefundEligibility } from "@/policy/refundValidator";
import { canProcessRefund, getSessionContext, updateSessionContext } from "@/lib/sessionStore";
import {
  GetCustomerSchema,
  FindCustomerByEmailSchema,
  GetOrderSchema,
  ListCustomerOrdersSchema,
  CheckRefundEligibilitySchema,
  ProcessRefundSchema,
  DenyRefundSchema,
  CreateManualReviewSchema,
  GetRefundStatusSchema,
  ToolExecutionContext,
} from "./types";
import { PolicyCheckResult, RefundReason } from "@/types";

// OpenAI Function / Tool Definitions
export const AGENT_TOOLS_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_customer",
      description: "Retrieve a customer profile by their unique customer ID.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The unique customer ID (e.g., CUST-001).",
          },
        },
        required: ["customerId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_customer_by_email",
      description: "Search for a customer profile using their registered email address.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "The customer's email address (e.g., aarav.sharma@example.com).",
          },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_order",
      description: "Retrieve complete details for a specific order by order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The unique order ID (e.g., ORD-1001).",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_customer_orders",
      description: "List all orders belonging to a verified customer.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The customer ID whose order history to fetch.",
          },
        },
        required: ["customerId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_refund_eligibility",
      description:
        "Evaluate an order against the strict 12-rule refund policy. Returns deterministic rule-by-rule pass/fail results, decision (APPROVE, DENY, or MANUAL_REVIEW), and explanation.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The verified customer ID making the request.",
          },
          orderId: {
            type: "string",
            description: "The order ID to evaluate for refund.",
          },
          reason: {
            type: "string",
            description: "Optional customer stated reason for the refund.",
          },
        },
        required: ["customerId", "orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "evaluate_return_request",
      description:
        "Evaluate a return and refund request against the strict 12-rule policy using the customer's stated return reason. Strictly read-only; evaluates eligibility without mutating the database.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The verified customer ID making the request.",
          },
          orderId: {
            type: "string",
            description: "The order ID to evaluate.",
          },
          reason: {
            type: "string",
            enum: [
              "DEFECTIVE",
              "DAMAGED",
              "WRONG_ITEM",
              "MISSING_ITEM",
              "NOT_AS_DESCRIBED",
              "CHANGED_MIND",
              "SIZE_OR_FIT",
              "ORDERED_BY_MISTAKE",
              "OTHER",
            ],
            description: "The structured reason for the return.",
          },
          details: {
            type: "string",
            description: "Optional additional details about the return.",
          },
        },
        required: ["customerId", "orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "process_refund",
      description:
        "Execute and commit an approved refund to the database. IMPORTANT: This backend tool independently runs and validates the 12 refund policies before execution. It will reject execution if the order fails any policy.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The customer ID requesting the refund.",
          },
          orderId: {
            type: "string",
            description: "The order ID to refund.",
          },
          reason: {
            type: "string",
            description: "The specific policy-approved reason for processing this refund.",
          },
        },
        required: ["customerId", "orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deny_refund",
      description: "Record an official refund denial when an order violates policy rules.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The customer ID.",
          },
          orderId: {
            type: "string",
            description: "The order ID.",
          },
          reason: {
            type: "string",
            description: "Detailed policy explanation of why the refund is denied.",
          },
        },
        required: ["customerId", "orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_manual_review",
      description:
        "Escalate an order to the human operations review team (required for high-value orders > ₹10,000 or complex exceptions).",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "The customer ID.",
          },
          orderId: {
            type: "string",
            description: "The order ID.",
          },
          reason: {
            type: "string",
            description: "Reason for escalating to human review (e.g. order amount exceeds ₹10,000).",
          },
        },
        required: ["customerId", "orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_refund_status",
      description: "Check the current refund or review status of an order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID.",
          },
        },
        required: ["orderId"],
      },
    },
  },
];

// Tool Implementation Registry
export async function executeBackendTool(
  toolName: string,
  rawArgs: unknown,
  ctx: ToolExecutionContext
): Promise<{ success: boolean; data?: unknown; error?: string; policyResult?: PolicyCheckResult }> {
  const { sessionId } = ctx;

  // Log start of tool invocation
  await logAgentEvent({
    sessionId,
    type: "TOOL_CALL",
    toolName,
    status: "INFO",
    input: rawArgs,
    message: `Invoking tool: ${toolName}`,
  });

  try {
    switch (toolName) {
      case "get_customer": {
        const parsed = GetCustomerSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_customer: ${parsed.error.message}`);
        }
        const customer = await prisma.customer.findUnique({
          where: { id: parsed.data.customerId },
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        });

        if (!customer) {
          await logAgentEvent({
            sessionId,
            type: "TOOL_ERROR",
            toolName,
            status: "WARNING",
            output: { found: false, customerId: parsed.data.customerId },
            message: `Customer ${parsed.data.customerId} not found in CRM.`,
          });
          return { success: false, error: `Customer with ID ${parsed.data.customerId} was not found.` };
        }

        await logAgentEvent({
          sessionId,
          type: "CUSTOMER_LOOKUP",
          toolName,
          status: "SUCCESS",
          output: { customerId: customer.id, name: customer.name, email: customer.email },
          message: `Customer verified: ${customer.name} (${customer.id})`,
        });

        return { success: true, data: customer };
      }

      case "find_customer_by_email": {
        const parsed = FindCustomerByEmailSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }
        const customer = await prisma.customer.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
          select: { id: true, name: true, email: true, phone: true, createdAt: true },
        });

        if (!customer) {
          await logAgentEvent({
            sessionId,
            type: "TOOL_ERROR",
            toolName,
            status: "WARNING",
            output: { found: false, email: parsed.data.email },
            message: `No customer record matching email: ${parsed.data.email}`,
          });
          return { success: false, error: `No customer found with email ${parsed.data.email}` };
        }

        await logAgentEvent({
          sessionId,
          type: "CUSTOMER_LOOKUP",
          toolName,
          status: "SUCCESS",
          output: { customerId: customer.id, name: customer.name, email: customer.email },
          message: `Customer matched by email: ${customer.name} (${customer.id})`,
        });

        return { success: true, data: customer };
      }

      case "get_order": {
        const parsed = GetOrderSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }
        const order = await prisma.order.findUnique({
          where: { id: parsed.data.orderId },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            refund: true,
          },
        });

        if (!order) {
          await logAgentEvent({
            sessionId,
            type: "TOOL_ERROR",
            toolName,
            status: "WARNING",
            output: { found: false, orderId: parsed.data.orderId },
            message: `Order ID ${parsed.data.orderId} does not exist in database.`,
          });
          return { success: false, error: `Order ${parsed.data.orderId} not found.` };
        }

        await logAgentEvent({
          sessionId,
          type: "ORDER_LOOKUP",
          toolName,
          status: "SUCCESS",
          output: {
            orderId: order.id,
            productName: order.productName,
            amount: order.amount,
            status: order.status,
            refundStatus: order.refundStatus,
            customerId: order.customerId,
          },
          message: `Order retrieved: ${order.id} - ${order.productName} (₹${order.amount.toLocaleString("en-IN")})`,
        });

        return { success: true, data: order };
      }

      case "list_customer_orders": {
        const parsed = ListCustomerOrdersSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }
        const orders = await prisma.order.findMany({
          where: { customerId: parsed.data.customerId },
          orderBy: { purchaseDate: "desc" },
          include: { refund: true },
        });

        await logAgentEvent({
          sessionId,
          type: "TOOL_SUCCESS",
          toolName,
          status: "SUCCESS",
          output: { orderCount: orders.length, customerId: parsed.data.customerId },
          message: `Retrieved ${orders.length} order(s) for customer ${parsed.data.customerId}`,
        });

        return { success: true, data: orders };
      }

      case "evaluate_return_request":
      case "check_refund_eligibility": {
        const parsed = CheckRefundEligibilitySchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }

        await logAgentEvent({
          sessionId,
          type: "ELIGIBILITY_CHECK_STARTED",
          toolName,
          status: "INFO",
          input: { orderId: parsed.data.orderId, customerId: parsed.data.customerId, reason: parsed.data.reason },
          message: `Starting deterministic eligibility check for order ${parsed.data.orderId}`,
        });

        const [order, customer] = await Promise.all([
          prisma.order.findUnique({ where: { id: parsed.data.orderId } }),
          prisma.customer.findUnique({ where: { id: parsed.data.customerId } }),
        ]);

        if (!order) {
          return { success: false, error: `Order ${parsed.data.orderId} does not exist.` };
        }
        if (!customer) {
          return { success: false, error: `Customer ${parsed.data.customerId} does not exist.` };
        }

        const reason = (parsed.data.reason as RefundReason) || undefined;

        // Run deterministic policy engine with structured reason
        const policyResult = checkRefundEligibility({ order, customer, reason });

        // Log each passed and failed policy rule for the admin audit dashboard
        for (const rule of policyResult.passedRules) {
          await logAgentEvent({
            sessionId,
            type: "POLICY_RULE_PASSED",
            status: "SUCCESS",
            metadata: { ruleId: rule.ruleId, rule: rule.rule },
            message: `✓ Rule Passed: ${rule.rule} - ${rule.explanation}`,
          });
        }

        for (const rule of policyResult.failedRules) {
          await logAgentEvent({
            sessionId,
            type: "POLICY_RULE_FAILED",
            status: "FAILED",
            metadata: { ruleId: rule.ruleId, rule: rule.rule },
            message: `✗ Rule Failed: ${rule.rule} - ${rule.explanation}`,
          });
        }

        await logAgentEvent({
          sessionId,
          type: "ELIGIBILITY_CHECK_COMPLETED",
          toolName,
          status: policyResult.eligible ? "SUCCESS" : policyResult.decision === "MANUAL_REVIEW" ? "WARNING" : "FAILED",
          output: {
            decision: policyResult.decision,
            eligible: policyResult.eligible,
            refundAmount: policyResult.refundAmount,
            passedCount: policyResult.passedRules.length,
            failedCount: policyResult.failedRules.length,
          },
          message: `Eligibility check completed for ${order.id}: ${policyResult.decision} - ${policyResult.explanation}`,
        });

        // NOTE: check_refund_eligibility NEVER mutates the database!
        return { success: true, data: policyResult, policyResult };
      }

      case "process_refund": {
        const parsed = ProcessRefundSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }

        // CRITICAL ARCHITECTURAL SAFEGUARD 1: Server-side session verification
        const authCheck = canProcessRefund(sessionId, parsed.data.orderId, parsed.data.customerId);
        if (!authCheck.allowed) {
          await logAgentEvent({
            sessionId,
            type: "REFUND_EXECUTION_BLOCKED",
            toolName,
            status: "FAILED",
            output: {
              orderId: parsed.data.orderId,
              customerId: parsed.data.customerId,
              reason: authCheck.reason,
            },
            message: `Refund execution blocked: ${authCheck.reason}`,
          });
          return {
            success: false,
            error: `Refund execution blocked: ${authCheck.reason}`,
          };
        }

        // ATOMIC TRANSACTION ARCHITECTURE (Requirement 27)
        // All 8 steps are executed inside a single database transaction. If any step fails,
        // the entire operation rolls back and the database remains completely unmodified.
        try {
          const txResult = await prisma.$transaction(async (tx) => {
            // 1. re-fetch order
            const txOrder = await tx.order.findUnique({
              where: { id: parsed.data.orderId },
              include: { refund: true },
            });
            if (!txOrder) {
              throw new Error(`Order ${parsed.data.orderId} not found in database.`);
            }

            // 2. re-fetch customer
            const txCustomer = await tx.customer.findUnique({
              where: { id: parsed.data.customerId },
            });
            if (!txCustomer) {
              throw new Error(`Customer ${parsed.data.customerId} not found in database.`);
            }

            // 3. re-check ownership
            if (txOrder.customerId !== txCustomer.id) {
              throw new Error(`Security violation: Order ${txOrder.id} does not belong to verified customer.`);
            }

            // 4. check duplicate refund
            if (txOrder.refundStatus === "REFUNDED" || txOrder.refund) {
              throw new Error(`Order ${txOrder.id} has already been refunded.`);
            }

            // 5. re-run policy
            const sessionContext = getSessionContext(sessionId, txCustomer.id);
            const effectiveReason = (parsed.data.reason as RefundReason) || sessionContext.reason || undefined;
            const policyResult = checkRefundEligibility({
              order: txOrder,
              customer: txCustomer,
              reason: effectiveReason,
            });

            if (policyResult.decision !== "APPROVE") {
              const policyError = new Error(
                `Backend policy validation failed with decision "${policyResult.decision}". ${policyResult.explanation}`
              );
              (policyError as unknown as { policyResult: PolicyCheckResult }).policyResult = policyResult;
              throw policyError;
            }

            // 6. create refund
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const refundId = `REF-${txOrder.id.replace("ORD-", "")}-${randomSuffix}`;
            const refundAmount = policyResult.refundAmount ?? txOrder.amount;

            const createdRefund = await tx.refund.create({
              data: {
                id: refundId,
                orderId: txOrder.id,
                customerId: txCustomer.id,
                amount: refundAmount,
                status: "APPROVED",
                reason: parsed.data.reason,
              },
            });

            // 7. update order status
            await tx.order.update({
              where: { id: txOrder.id },
              data: { refundStatus: "REFUNDED" },
            });

            // 8. write audit event within transaction
            await tx.agentEvent.create({
              data: {
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                sessionId,
                type: "REFUND_PROCESSED",
                toolName,
                status: "SUCCESS",
                output: JSON.stringify({
                  refundId: createdRefund.id,
                  orderId: txOrder.id,
                  customerId: txCustomer.id,
                  amount: createdRefund.amount,
                  status: createdRefund.status,
                }),
                message: `✓ Refund ${createdRefund.id} successfully processed for ₹${createdRefund.amount.toLocaleString(
                  "en-IN"
                )} on order ${txOrder.id}`,
              },
            });

            return { refund: createdRefund, policyResult, order: txOrder };
          }, { maxWait: 10000, timeout: 20000 });

          // Update session context state to COMPLETED
          updateSessionContext(sessionId, {
            state: "COMPLETED",
            refundId: txResult.refund.id,
          });

          return {
            success: true,
            data: {
              refundId: txResult.refund.id,
              orderId: txResult.order.id,
              amount: txResult.refund.amount,
              status: "APPROVED",
              message: `Refund of ₹${txResult.refund.amount.toLocaleString("en-IN")} has been successfully processed.`,
            },
            policyResult: txResult.policyResult,
          };
        } catch (txErr: unknown) {
          const txErrorMsg = txErr instanceof Error ? txErr.message : String(txErr);
          const caughtPolicyResult = (txErr as { policyResult?: PolicyCheckResult })?.policyResult;

          await logAgentEvent({
            sessionId,
            type: "REFUND_EXECUTION_BLOCKED",
            toolName,
            status: "FAILED",
            output: {
              orderId: parsed.data.orderId,
              customerId: parsed.data.customerId,
              error: txErrorMsg,
            },
            message: `Atomic transaction rolled back: ${txErrorMsg}`,
          });

          return {
            success: false,
            error: `Cannot process refund: ${txErrorMsg}`,
            policyResult: caughtPolicyResult,
          };
        }
      }

      case "deny_refund": {
        const parsed = DenyRefundSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }

        // Update order refundStatus if not already refunded
        const existingOrder = await prisma.order.findUnique({
          where: { id: parsed.data.orderId },
        });

        if (existingOrder && existingOrder.refundStatus !== "REFUNDED") {
          await prisma.order.update({
            where: { id: parsed.data.orderId },
            data: { refundStatus: "DENIED" },
          });
        }

        await logAgentEvent({
          sessionId,
          type: "REFUND_DENIED",
          toolName,
          status: "WARNING",
          output: {
            orderId: parsed.data.orderId,
            customerId: parsed.data.customerId,
            reason: parsed.data.reason,
          },
          message: `✗ Refund officially denied for order ${parsed.data.orderId}: ${parsed.data.reason}`,
        });

        return {
          success: true,
          data: {
            orderId: parsed.data.orderId,
            status: "DENIED",
            reason: parsed.data.reason,
          },
        };
      }

      case "create_manual_review": {
        const parsed = CreateManualReviewSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }

        const reviewId = `REV-${Math.floor(100000 + Math.random() * 900000)}`;

        await prisma.order.update({
          where: { id: parsed.data.orderId },
          data: { refundStatus: "PENDING_REVIEW" },
        });

        await logAgentEvent({
          sessionId,
          type: "MANUAL_REVIEW_CREATED",
          toolName,
          status: "WARNING",
          output: {
            reviewId,
            orderId: parsed.data.orderId,
            customerId: parsed.data.customerId,
            reason: parsed.data.reason,
          },
          message: `⚠ Escalated order ${parsed.data.orderId} to Manual Operations Review (${reviewId}). Reason: ${parsed.data.reason}`,
        });

        return {
          success: true,
          data: {
            reviewId,
            orderId: parsed.data.orderId,
            status: "PENDING_REVIEW",
            message: `Ticket ${reviewId} created for Senior Operations Review. A specialist will audit this within 24-48 business hours.`,
          },
        };
      }

      case "get_refund_status": {
        const parsed = GetRefundStatusSchema.safeParse(rawArgs);
        if (!parsed.success) {
          throw new Error(`Invalid arguments: ${parsed.error.message}`);
        }

        const order = await prisma.order.findUnique({
          where: { id: parsed.data.orderId },
          include: { refund: true },
        });

        if (!order) {
          return { success: false, error: `Order ${parsed.data.orderId} not found.` };
        }

        const statusData = {
          orderId: order.id,
          productName: order.productName,
          refundStatus: order.refundStatus,
          refundDetails: order.refund,
        };

        await logAgentEvent({
          sessionId,
          type: "TOOL_SUCCESS",
          toolName,
          status: "INFO",
          output: statusData,
          message: `Checked refund status for order ${order.id}: ${order.refundStatus}`,
        });

        return { success: true, data: statusData };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logAgentEvent({
      sessionId,
      type: "TOOL_ERROR",
      toolName,
      status: "FAILED",
      output: { error: errorMsg },
      message: `Tool execution error in ${toolName}: ${errorMsg}`,
    });
    return { success: false, error: errorMsg };
  }
}
