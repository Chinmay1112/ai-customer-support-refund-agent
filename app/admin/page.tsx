"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatsOverview } from "@/components/admin/StatsOverview";
import { AgentLogPanel } from "@/components/admin/AgentLogPanel";
import { CrmInspector } from "@/components/admin/CrmInspector";
import { REFUND_RULES, POLICY_CONSTANTS } from "@/policy/refundPolicy";
import {
  ShieldCheck,
  Activity,
  ArrowLeft,
  Users,
  FileText,
  Info,
} from "lucide-react";
import Link from "next/link";

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");

  const [activeTab, setActiveTab] = useState<"logs" | "crm" | "policy">("logs");
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalSessions: 0,
    refundsApproved: 0,
    refundsDenied: 0,
    manualReviews: 0,
    toolFailures: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/logs?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load admin stats:", e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-12">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Chat</span>
            </Link>

            <div className="h-4 w-px bg-gray-300" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                AI
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">
                  Admin Audit & Telemetry Dashboard
                </h1>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Real-time Policy Enforcement & Agent Event Stream
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "logs"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Event Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("crm")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "crm"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mock CRM (15 Customers)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("policy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "policy"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>12-Rule Policy</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* KPI Metrics Overview */}
        <StatsOverview stats={stats} />

        {/* Tab 1: Live Event Timeline */}
        {activeTab === "logs" && (
          <div className="h-[750px]">
            <AgentLogPanel initialSessionId={sessionIdParam} />
          </div>
        )}

        {/* Tab 2: Mock CRM Database Explorer */}
        {activeTab === "crm" && <CrmInspector />}

        {/* Tab 3: Official Policy Document Viewer */}
        {activeTab === "policy" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Store Refund Policy Specification (12 Deterministic Rules)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enforced server-side via TypeScript engine (`policy/refundValidator.ts`). The LLM
                cannot approve refunds independently.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {REFUND_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="border border-gray-200 rounded-xl p-4 bg-slate-50/50 hover:border-gray-300 transition-colors text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-700 font-mono">
                      Rule {rule.number}: {rule.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                      {rule.id}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{rule.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Policy Engine Constants & Escalation Boundaries
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800">
                <li>
                  <strong>Refund Window:</strong> {POLICY_CONSTANTS.REFUND_WINDOW_DAYS} calendar days
                  post-delivery.
                </li>
                <li>
                  <strong>High-Value Review Cap:</strong> Orders above ₹
                  {POLICY_CONSTANTS.HIGH_VALUE_THRESHOLD.toLocaleString("en-IN")} trigger mandatory{" "}
                  <code>MANUAL_REVIEW</code> status (no autonomous release).
                </li>
                <li>
                  <strong>Digital Goods Excluded:</strong> Software licenses, digital codes, gift cards
                  are permanently non-refundable once delivered.
                </li>
                <li>
                  <strong>Independent Verification:</strong> <code>process_refund</code> re-evaluates all
                  12 rules before committing any database refund record.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-gray-500">Loading Admin Dashboard...</div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
