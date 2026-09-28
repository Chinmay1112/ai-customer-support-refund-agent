"use client";

import React, { useState } from "react";
import { ChatMessage } from "@/types";
import { Bot, User, ChevronDown, ChevronUp, Cpu, Check, X } from "lucide-react";
import { RefundDecisionCard } from "./RefundDecisionCard";

interface MessageBubbleProps {
  message: ChatMessage;
  onSendMessage?: (text: string) => void;
  isLatestMessage?: boolean;
}

export function MessageBubble({
  message,
  onSendMessage,
  isLatestMessage = true,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showTools, setShowTools] = useState(false);

  // Helper to format simple markdown elements (bold, bullets)
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Bullet points
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        const content = line.trim().substring(1).trim();
        return (
          <div key={idx} className="flex items-start gap-1.5 my-1 ml-1 text-inherit">
            <span className="text-blue-500 font-bold">•</span>
            <span>{renderInlineBold(content)}</span>
          </div>
        );
      }

      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed text-inherit">
          {renderInlineBold(line)}
        </p>
      );
    });
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className={`font-semibold ${isUser ? "text-white" : "text-gray-900"}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`flex items-start gap-2.5 my-3.5 transition-all ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-2xs ${
          isUser
            ? "bg-slate-900 text-white"
            : "bg-blue-600 text-white ring-2 ring-blue-100"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble Content */}
      <div className="max-w-[85%] sm:max-w-[78%] space-y-1">
        <div
          className={`flex items-center gap-2 text-[10.5px] text-gray-400 px-1 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <span className="font-medium text-gray-600">
            {isUser ? "You" : "Nova"}
          </span>
          <span>•</span>
          <span>{message.createdAt}</span>
        </div>

        <div
          className={`p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-2xs ${
            isUser
              ? "bg-blue-600 text-white rounded-tr-xs"
              : "bg-white text-gray-800 border border-gray-200/90 rounded-tl-xs"
          }`}
        >
          <div className="space-y-0.5">{renderFormattedText(message.content)}</div>

          {/* Refund Decision Card if present */}
          {message.decisionCard && (
            <RefundDecisionCard
              decision={message.decisionCard}
              refundId={message.refundId}
              onAction={onSendMessage}
              isLatestMessage={isLatestMessage}
            />
          )}

          {/* Reason Chips for AWAIT_REASON state (Requirement 21) */}
          {!isUser &&
            message.pendingAction === "AWAIT_REASON" &&
            isLatestMessage &&
            onSendMessage && (
              <div className="mt-3 pt-2.5 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">
                  What happened with your order?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Damaged", text: "Damaged" },
                    { label: "Defective", text: "Defective" },
                    { label: "Wrong item", text: "Wrong item" },
                    { label: "Missing item", text: "Missing item" },
                    { label: "Changed my mind", text: "Changed my mind" },
                    { label: "Other", text: "Other" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => onSendMessage(chip.text)}
                      className="text-[11px] bg-blue-50/80 hover:bg-blue-100 text-blue-800 border border-blue-200/80 font-medium px-2.5 py-1 rounded-full shadow-2xs transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Fallback Confirmation Buttons for AWAIT_CONFIRMATION if no decision card */}
          {!isUser &&
            message.pendingAction === "AWAIT_CONFIRMATION" &&
            !message.decisionCard &&
            isLatestMessage &&
            onSendMessage && (
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendMessage("Yes, proceed")}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Yes, proceed</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage("No, cancel")}
                  className="inline-flex items-center gap-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>No, cancel</span>
                </button>
              </div>
            )}

          {/* Discreet Collapsible Agent Activity (Requirement 7) */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-gray-100 text-left">
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <Cpu className="w-3 h-3 text-blue-600" />
                <span>
                  {showTools ? "Hide agent activity" : "View agent activity"}{" "}
                  <span className="text-gray-400 font-normal">
                    ({message.toolCalls.length} tool{message.toolCalls.length === 1 ? "" : "s"})
                  </span>
                </span>
                {showTools ? (
                  <ChevronUp className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                )}
              </button>

              {showTools && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-gray-200 rounded-lg space-y-1 font-mono text-[11px]">
                  {message.toolCalls.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className="flex items-center justify-between text-gray-700 py-0.5"
                    >
                      <span className="flex items-center gap-1 font-medium">
                        {tc.name}
                        {tc.status === "error" ? (
                          <span className="text-rose-600 font-bold ml-0.5">✕</span>
                        ) : (
                          <span className="text-emerald-600 font-bold ml-0.5">✓</span>
                        )}
                      </span>
                      <span
                        className={`text-[9.5px] uppercase font-semibold px-1 py-0.2 rounded ${
                          tc.status === "error"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {tc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
