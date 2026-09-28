"use client";

import React, { useState } from "react";
import { ChatInterface, DEMO_PROMPTS } from "@/components/chat/ChatInterface";
import {
  ShoppingBag,
  ExternalLink,
  Sparkles,
  FileText,
  X,
  Layers,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { REFUND_RULES, POLICY_CONSTANTS } from "@/policy/refundPolicy";

export default function HomePage() {
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("CUST-001");
  const [externalPrompt, setExternalPrompt] = useState<{
    prompt: string;
    customerId: string;
    ts: number;
  } | null>(null);

  const handleTriggerDemoScenario = (prompt: string, customerId: string) => {
    setSelectedCustomerId(customerId);
    setDemoMode(true);
    setExternalPrompt({ prompt, customerId, ts: Date.now() });
    setShowDemoModal(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* Top Application Navigation */}
      <header className="bg-white border-b border-gray-200/90 flex-shrink-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 tracking-tight text-sm">
                  Nova Support AI
                </span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.2 rounded-full">
                  Customer Care
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-gray-500 -mt-0.5">
                Instant returns, refunds & order support
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            {/* Demo Mode Toggle (Requirement 18: Demo Mode explicitly for recruiter/testing) */}
            <button
              type="button"
              onClick={() => setDemoMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer ${
                demoMode
                  ? "bg-purple-600 text-white shadow-purple-500/20"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
              }`}
              title="Toggle Demo Mode with mock CRM account switcher"
            >
              <FlaskConical className={`w-3.5 h-3.5 ${demoMode ? "text-purple-200" : "text-purple-600"}`} />
              <span>Demo Mode</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  demoMode ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
                }`}
              >
                {demoMode ? "ON" : "OFF"}
              </span>
            </button>

            {/* Recruiter Evaluation Scenarios Modal Button (Active when Demo Mode is ON) */}
            {demoMode && (
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="View recruiter hiring scenarios"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Scenarios</span>
                <span className="bg-purple-200/70 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                  7
                </span>
              </button>
            )}

            {/* Refund Policy Button */}
            <button
              type="button"
              onClick={() => setShowPolicyModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Refund Policy</span>
            </button>

            {/* Admin Telemetry Link */}
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Admin Telemetry</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Mode Notice Banner (Requirement 18) */}
      {demoMode && (
        <div className="bg-purple-50 border-b border-purple-200/90 px-4 py-1.5 text-[11.5px] text-purple-900 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-600 animate-pulse flex-shrink-0" />
            <span className="font-semibold">Demo environment active — mock CRM data</span>
            <span className="hidden sm:inline text-purple-600">
              • Account switching and test scenarios enabled for recruiter evaluation
            </span>
          </div>
        </div>
      )}

      {/* Main Support Workspace (Requirement 4: Focused Centered Layout) */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-4xl mx-auto w-full min-h-0 overflow-hidden">
        <div className="w-full h-full flex flex-col min-h-0">
          <ChatInterface
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            externalPrompt={externalPrompt}
            demoMode={demoMode}
          />
        </div>
      </main>

      {/* Demo Mode Modal (Requirement 3) */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    🧪 Hiring Evaluation Demo Scenarios
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Click any scenario to auto-select persona and test deterministic policy rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {DEMO_PROMPTS.map((dp, idx) => {
                const isApprove = dp.badge === "APPROVE";
                const isDeny = dp.badge === "DENY";
                const isReview = dp.badge === "MANUAL_REVIEW";

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTriggerDemoScenario(dp.prompt, dp.customerId)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-start justify-between gap-3 group cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-xs text-gray-900 group-hover:text-blue-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        {dp.label}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {dp.scenario}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">
                        Prompt: &quot;{dp.prompt}&quot;
                      </div>
                    </div>

                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 mt-0.5 ${
                        isApprove
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isDeny
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : isReview
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {dp.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal (Requirement 8) */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Store Return & Refund Policy (12 Rules)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Window: {POLICY_CONSTANTS.REFUND_WINDOW_DAYS} Days • Auto-Approval Threshold: ₹10,000
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-700">
              {REFUND_RULES.map((rule) => (
                <div key={rule.id} className="p-2.5 border rounded-xl bg-gray-50/70">
                  <div className="font-bold text-gray-900 text-xs">
                    Rule {rule.number}: {rule.name}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1 leading-snug">
                    {rule.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
