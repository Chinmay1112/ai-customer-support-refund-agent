import { z } from "zod";

// Zod schemas for all 9 agent tools

export const GetCustomerSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
});
export type GetCustomerInput = z.infer<typeof GetCustomerSchema>;

export const FindCustomerByEmailSchema = z.object({
  email: z.string().email("Valid email address required"),
});
export type FindCustomerByEmailInput = z.infer<typeof FindCustomerByEmailSchema>;

export const GetOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});
export type GetOrderInput = z.infer<typeof GetOrderSchema>;

export const ListCustomerOrdersSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
});
export type ListCustomerOrdersInput = z.infer<typeof ListCustomerOrdersSchema>;

export const CheckRefundEligibilitySchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().optional(),
});
export type CheckRefundEligibilityInput = z.infer<typeof CheckRefundEligibilitySchema>;

export const ProcessRefundSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().min(3, "Refund reason must be specified"),
});
export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;

export const DenyRefundSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().min(3, "Denial reason must be specified"),
});
export type DenyRefundInput = z.infer<typeof DenyRefundSchema>;

export const CreateManualReviewSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().min(3, "Reason for manual review is required"),
});
export type CreateManualReviewInput = z.infer<typeof CreateManualReviewSchema>;

export const GetRefundStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});
export type GetRefundStatusInput = z.infer<typeof GetRefundStatusSchema>;

export interface ToolExecutionContext {
  sessionId: string;
  verifiedCustomerId?: string;
}
