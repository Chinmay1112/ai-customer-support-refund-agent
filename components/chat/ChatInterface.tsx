"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, Customer } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ToolActivityIndicator } from "./ToolActivityIndicator";
import {
  RotateCcw,
  ShieldAlert,
  Bot,
  Package,
  Undo2,
  CreditCard,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface CustomerWithOrders extends Customer {
  orders?: Array<{
    id: string;
    productName: string;
    amount: number;
    status: string;
    refundStatus: string;
  }>;
}

export const DEMO_PROMPTS = [
  {
    label: "Eligible Refund (ORD-1001)",
    prompt: "I want a refund for ORD-1001 because the headphones are defective.",
    customerId: "CUST-001",
    scenario: "Reason captured -> eligible card -> awaits customer confirmation",
    badge: "ELIGIBLE",
  },
  {
    label: "Outside Window (ORD-1002)",
    prompt: "The product is defective for ORD-1002.",
    customerId: "CUST-002",
    scenario: "Delivered 14 days ago > 7-day limit (Expected: DENY)",
    badge: "DENY",
  },
  {
    label: "High-Value Review (ORD-1008)",
    prompt: "I want to return ORD-1008 because it arrived damaged.",
    customerId: "CUST-008",
    scenario: "Order amount ₹48,990 > ₹10,000 threshold (Expected: MANUAL_REVIEW)",
    badge: "MANUAL_REVIEW",
  },
  {
    label: "Defective Product (ORD-1006)",
    prompt: "The OTG is defective for ORD-1006.",
    customerId: "CUST-006",
    scenario: "Used but verified defective exemption (Expected: ELIGIBLE)",
    badge: "ELIGIBLE",
  },
  {
    label: "Used Non-Defective (ORD-1007)",
    prompt: "I changed my mind about ORD-1007.",
    customerId: "CUST-007",
    scenario: "Used item return for change of mind (Expected: DENY)",
    badge: "DENY",
  },
  {
    label: "Digital Product (ORD-1004)",
    prompt: "I don't want the digital product anymore for ORD-1004.",
    customerId: "CUST-004",
    scenario: "Digital product exclusion rule (Expected: DENY)",
    badge: "DENY",
  },
  {
    label: "Refund Status (ORD-1005)",
    prompt: "What is the status of my refund for ORD-1005?",
    customerId: "CUST-005",
    scenario: "Inquire on status without executing new refund (Expected: STATUS)",
    badge: "STATUS",
  },
];

interface ChatInterfaceProps {
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  externalPrompt?: { prompt: string; customerId: string; ts: number } | null;
  demoMode?: boolean;
}

export function ChatInterface({
  selectedCustomerId: propCustomerId,
  onCustomerChange: propOnCustomerChange,
  externalPrompt,
  demoMode = false,
}: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState("sess_init");
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [internalCustomerId, setInternalCustomerId] = useState("CUST-001");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  }, []);

  const selectedCustomerId = propCustomerId || internalCustomerId;
  const setSelectedCustomerId = propOnCustomerChange || setInternalCustomerId;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch customer list for customer context switcher
  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) setCustomers(data.customers);
      })
      .catch((err) => console.error("Could not load customers:", err));
  }, []);

  const activeCustomer: CustomerWithOrders = customers.find(
    (c) => c.id === selectedCustomerId
  ) || {
    id: "CUST-001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91 98201 11223",
    createdAt: new Date().toISOString(),
    orders: [],
  };

  const customerFirstName = activeCustomer.name ? activeCustomer.name.split(" ")[0] : "there";

  const handleSendMessage = useCallback(
    async (text: string, overrideCustomerId?: string) => {
      if (!text.trim() || isLoading) return;

      const currentCustomer = overrideCustomerId || selectedCustomerId;
      setErrorMsg(null);

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: text,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setActiveTool(null);

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            customerId: currentCustomer,
            message: text,
            requestId,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();

        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: data.message,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          toolCalls: data.toolCalls,
          decisionCard: data.decisionCard,
          refundId: data.refundId,
          workflowState: data.workflowState,
          pendingAction: data.pendingAction,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: unknown) {
        console.error("Chat error:", err);
        setErrorMsg("Failed to communicate with support agent. Please check connection and try again.");
      } finally {
        setIsLoading(false);
        setActiveTool(null);
      }
    },
    [isLoading, selectedCustomerId, sessionId, messages]
  );

  const lastHandledPromptRef = useRef<typeof externalPrompt>(null);

  // Handle external demo prompt trigger from Demo Mode modal
  useEffect(() => {
    if (externalPrompt && externalPrompt.prompt && externalPrompt !== lastHandledPromptRef.current) {
      lastHandledPromptRef.current = externalPrompt;
      handleSendMessage(externalPrompt.prompt, externalPrompt.customerId);
    }
  }, [externalPrompt, handleSendMessage]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeTool]);

  const handleResetSession = () => {
    const newSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setSessionId(newSession);
    setMessages([]);
    setErrorMsg(null);
  };

  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    const newCust = customers.find((c) => c.id === newCustId);
    if (newCust && messages.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_switch`,
          role: "assistant",
          content: `Switched customer account to **${newCust.name}** (${newCust.id}). How can I help you today?`,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  const isConversationEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Top E-Commerce Customer Context Bar (Requirement 5) */}
      <div className="bg-slate-50/90 border-b border-gray-200/90 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0">
            {activeCustomer.name ? activeCustomer.name.slice(0, 1) : "U"}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-gray-900 truncate">
                {activeCustomer.name}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/70">
                {activeCustomer.orders?.length || 0} Orders
              </span>
            </div>
            <div className="text-[10px] text-gray-400">
              {demoMode ? (
                <>
                  Account: <span className="font-mono text-purple-700 font-semibold">{activeCustomer.id}</span>
                </>
              ) : (
                <span className="text-emerald-600 font-medium">Verified Account</span>
              )}
            </div>
          </div>

          {/* Clean Account Switcher Dropdown (Only visible when Demo Mode is ON per Requirement 18) */}
          {demoMode && (
            <div className="relative ml-1 hidden sm:block">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="text-[11px] font-medium text-purple-700 hover:text-purple-900 bg-purple-50/70 hover:bg-purple-100 border border-purple-200 rounded-lg px-2 py-1 cursor-pointer transition-colors focus:outline-none"
                title="Switch demo customer account"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    Demo Account: {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetSession}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            title="Start a new chat"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col justify-start min-h-0 bg-slate-50/20">
        {isConversationEmpty ? (
          /* Redesigned Initial Welcome State (Requirement 1) */
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full animate-in fade-in duration-300">
            {/* Friendly Avatar */}
            <div className="relative mb-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10">
                <Bot className="w-7 h-7" />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"
                title="Nova is online"
              />
            </div>

            {/* Dynamic Welcome Title */}
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Hi {customerFirstName} 👋
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              How can I help you today?
            </p>

            {/* 4 Interactive Quick Action Cards (Requirement 1 & 2) */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => handleSendMessage("Show my recent orders")}
                className="flex items-start gap-2.5 p-3.5 bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                    My Orders
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    View & track your purchases
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("I want to know about refunds and returns")}
                className="flex items-start gap-2.5 p-3.5 bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Undo2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                    Refund & Returns
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Check eligibility or start return
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("What is the status of my refund?")}
                className="flex items-start gap-2.5 p-3.5 bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                    Refund Status
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Track ongoing refund/review
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage("What can you do?")}
                className="flex items-start gap-2.5 p-3.5 bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-900 group-hover:text-blue-900">
                    Other Help
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Store policies & support FAQ
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Active Message Stream */
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSendMessage={(txt) => handleSendMessage(txt)}
                isLatestMessage={idx === messages.length - 1}
              />
            ))}

            {isLoading && (
              <div className="py-1">
                <ToolActivityIndicator currentTool={activeTool} statusText="Evaluating request with policy engine..." />
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Conversational Secondary Quick Actions (Requirement 2) */}
      {!isConversationEmpty && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max text-xs">
            <span className="text-[11px] font-semibold text-gray-400 mr-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Suggested:
            </span>
            {(() => {
              const latestMsg = messages[messages.length - 1];
              const isAwaitingConfirmation =
                latestMsg?.role === "assistant" &&
                (latestMsg.pendingAction === "AWAIT_CONFIRMATION" || latestMsg.workflowState === "AWAITING_CONFIRMATION");

              const isAwaitingReason =
                latestMsg?.role === "assistant" &&
                (latestMsg.pendingAction === "AWAIT_REASON" || latestMsg.workflowState === "REASON_REQUIRED");

              const isAwaitingOrder =
                latestMsg?.role === "assistant" &&
                (latestMsg.pendingAction === "AWAIT_ORDER" || latestMsg.workflowState === "ORDER_REQUIRED");

              if (isAwaitingConfirmation) {
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Yes, proceed")}
                      disabled={isLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer shadow-2xs"
                    >
                      Yes, proceed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("No, cancel")}
                      disabled={isLoading}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium px-3.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer"
                    >
                      No, cancel
                    </button>
                  </>
                );
              }

              if (isAwaitingReason) {
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Damaged")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Damaged
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Defective")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Defective
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Wrong item")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Wrong item
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Missing item")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Missing item
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Changed my mind")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Changed my mind
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Other")}
                      disabled={isLoading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Other
                    </button>
                  </>
                );
              }

              if (isAwaitingOrder) {
                const customerOrders = activeCustomer?.orders || [];
                return (
                  <>
                    {customerOrders.slice(0, 3).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSendMessage(o.id)}
                        disabled={isLoading}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-semibold px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer"
                      >
                        {o.id} ({o.productName.slice(0, 16)}...)
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Start a return")}
                      disabled={isLoading}
                      className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Start a return
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Check return policy")}
                      disabled={isLoading}
                      className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Check return policy
                    </button>
                  </>
                );
              }

              return (
                <>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Show my recent orders")}
                    disabled={isLoading}
                    className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    My Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("I want to return something")}
                    disabled={isLoading}
                    className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Returns & Refunds
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("Track my refund")}
                    disabled={isLoading}
                    className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Refund Status
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage("What can you do?")}
                    disabled={isLoading}
                    className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-900 border border-gray-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Other Help
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bottom Message Composer */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-3.5 flex-shrink-0">
        <ChatInput
          onSendMessage={(msg) => handleSendMessage(msg)}
          disabled={isLoading}
          placeholder={`Type a message to Nova... (e.g. "I want to return an item", "Show my orders")`}
        />

        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1">
          <span className="truncate">
            Customer Support Assistant • Press Enter to send
          </span>
          <span className="font-mono text-[10px] hidden sm:inline text-gray-400">
            {mounted ? `Session: ${sessionId.slice(0, 12)}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
