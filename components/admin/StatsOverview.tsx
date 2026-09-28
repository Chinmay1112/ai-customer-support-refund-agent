"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, Activity, Database, Wrench } from "lucide-react";

interface StatsProps {
  stats: {
    totalEvents: number;
    totalSessions: number;
    refundsApproved: number;
    refundsDenied: number;
    manualReviews: number;
    toolFailures: number;
  };
}

export function StatsOverview({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Sessions */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
          <span>Agent Sessions</span>
          <Activity className="w-4 h-4 text-blue-500" />
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalSessions}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">Distinct user conversations</div>
      </div>

      {/* Refunds Approved */}
      <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
          <span>Approved</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.refundsApproved}</div>
        <div className="text-[11px] text-emerald-600/80 mt-0.5">Automated policy approval</div>
      </div>

      {/* Refunds Denied */}
      <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
          <span>Denied</span>
          <XCircle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="mt-2 text-2xl font-bold text-rose-700">{stats.refundsDenied}</div>
        <div className="text-[11px] text-rose-600/80 mt-0.5">Enforced policy denials</div>
      </div>

      {/* Manual Reviews */}
      <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
          <span>Manual Reviews</span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-700">{stats.manualReviews}</div>
        <div className="text-[11px] text-amber-600/80 mt-0.5">&gt; ₹10,000 threshold tickets</div>
      </div>

      {/* Tool Failures */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
          <span>Tool Errors</span>
          <Wrench className="w-4 h-4 text-purple-500" />
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{stats.toolFailures}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">Gracefully caught errors</div>
      </div>

      {/* Total Audit Events */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
          <span>Audit Events</span>
          <Database className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">Logged in database</div>
      </div>
    </div>
  );
}
