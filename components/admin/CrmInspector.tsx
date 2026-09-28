"use client";

import React, { useState, useEffect } from "react";
import { formatINR, formatDate } from "@/lib/utils";
import { Users, Package, ShieldCheck, Search } from "lucide-react";

interface CrmCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: Array<{
    id: string;
    productName: string;
    productCategory: string;
    amount: number;
    purchaseDate: string;
    deliveryDate: string | null;
    status: string;
    isRefundable: boolean;
    isDefective: boolean;
    condition: string;
    refundStatus: string;
    refund?: {
      id: string;
      amount: number;
      status: string;
      reason: string;
    } | null;
  }>;
}

export function CrmInspector() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) {
          setCustomers(data.customers);
          if (data.customers.length > 0) {
            setSelectedCustomerId(data.customers[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading CRM customers:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.orders.some((o) => o.id.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0];

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 text-xs">
        Loading CRM mock database...
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      {/* Customer List Sidebar */}
      <div className="w-full md:w-80 border-r border-gray-200 bg-slate-50/50 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search 15 demo customers or orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[550px]">
          {filteredCustomers.map((cust) => (
            <button
              key={cust.id}
              type="button"
              onClick={() => setSelectedCustomerId(cust.id)}
              className={`w-full text-left p-3 text-xs transition-colors flex items-start justify-between ${
                activeCustomer?.id === cust.id
                  ? "bg-blue-50/80 border-l-4 border-blue-600"
                  : "hover:bg-gray-100/70"
              }`}
            >
              <div>
                <div className="font-semibold text-gray-900">{cust.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">{cust.id}</div>
                <div className="text-[11px] text-gray-400">{cust.email}</div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded">
                {cust.orders.length} order{cust.orders.length > 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Orders & Refund Details */}
      <div className="flex-1 p-5 overflow-y-auto">
        {activeCustomer ? (
          <div>
            {/* Customer Header */}
            <div className="border-b border-gray-200 pb-4 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  {activeCustomer.name}
                  <span className="text-xs font-mono font-normal text-gray-500">
                    ({activeCustomer.id})
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Email: {activeCustomer.email} • Phone: {activeCustomer.phone}
                </p>
              </div>
            </div>

            {/* Orders Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-gray-500" />
                Customer Order History ({activeCustomer.orders.length})
              </h4>

              {activeCustomer.orders.map((ord) => (
                <div
                  key={ord.id}
                  className="border border-gray-200 rounded-xl p-4 bg-slate-50/30 text-xs space-y-2 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-gray-900">{ord.id}</span>
                      <h5 className="font-medium text-gray-800 text-sm mt-0.5">
                        {ord.productName}
                      </h5>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 block">
                        {formatINR(ord.amount)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase inline-block mt-0.5 ${
                          ord.refundStatus === "REFUNDED"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.refundStatus === "PENDING_REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : ord.refundStatus === "DENIED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Refund: {ord.refundStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Meta Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 pt-1">
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">
                      Category: <strong>{ord.productCategory}</strong>
                    </span>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">
                      Status: <strong>{ord.status}</strong>
                    </span>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">
                      Condition: <strong>{ord.condition}</strong>
                    </span>
                    {ord.isDefective && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                        Defective: YES
                      </span>
                    )}
                    {!ord.isRefundable && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                        Non-Refundable Catalog Item
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-400 flex items-center gap-3 pt-1">
                    <span>Purchased: {formatDate(ord.purchaseDate)}</span>
                    <span>•</span>
                    <span>
                      Delivered: {ord.deliveryDate ? formatDate(ord.deliveryDate) : "Not Delivered"}
                    </span>
                  </div>

                  {/* Prior Refund Record */}
                  {ord.refund && (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-950 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Existing Refund Record: </strong>
                        <span className="font-mono">{ord.refund.id}</span> (
                        {formatINR(ord.refund.amount)}) - Status: {ord.refund.status}
                        <div className="text-emerald-800 text-[10px] mt-0.5">
                          Reason: {ord.refund.reason}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-xs">
            Select a customer from the left to view their profile and orders.
          </div>
        )}
      </div>
    </div>
  );
}
