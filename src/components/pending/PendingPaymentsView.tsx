"use client";

import React, { useState } from "react";
import { ICustomer, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Search,
  MessageCircle,
  Phone,
  Printer,
  ArrowDownLeft,
  Calendar,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";

interface PendingPaymentsViewProps {
  customers: ICustomer[];
  settings: IShopSettings;
  onRefresh: () => void;
}

export function PendingPaymentsView({ customers, settings, onRefresh }: PendingPaymentsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "OVERDUE">("ALL");

  const [selectedCustForPay, setSelectedCustForPay] = useState<ICustomer | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payNotes, setPayNotes] = useState("");
  const [showPayModal, setShowPayModal] = useState(false);

  // Filter only customers with outstanding balance > 0
  const pendingCustomers = customers
    .filter((c) => c.outstandingBalance > 0)
    .filter((c) => {
      if (filterType === "OVERDUE") {
        return c.status === "Overdue" || (c.dueDate && new Date(c.dueDate) < new Date());
      }
      return true;
    })
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

  const totalOutstanding = pendingCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  const handleOpenPay = (c: ICustomer) => {
    setSelectedCustForPay(c);
    setPayAmount(c.outstandingBalance);
    setPayNotes("");
    setShowPayModal(true);
  };

  const handleCollectPayment = async () => {
    if (!selectedCustForPay || !payAmount || Number(payAmount) <= 0) {
      toast.error("Valid amount required.");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustForPay._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Collected Rs. ${payAmount} from ${selectedCustForPay.name}!`);
      setShowPayModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendReminder = (c: ICustomer) => {
    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${c.name}, this is a gentle reminder from Dilshad Mobile Parts regarding your outstanding Khata balance of ${formatPKR(
        c.outstandingBalance
      )}. Kindly arrange payment at your earliest convenience. Thank you!`
    );
    const cleanPhone = c.phone.replace(/[^0-9]/g, "");
    const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" /> Customer Credit Recovery (Pending Khata)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track unpaid technician credit, overdue aging, send WhatsApp reminders, and collect payments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Recoverable Credit</span>
            <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {formatPKR(totalOutstanding)}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 no-print"
          >
            <Printer className="w-4 h-4" /> Print Recovery List
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 text-xs">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pending customer by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setFilterType("ALL")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === "ALL" ? "bg-white dark:bg-slate-900 text-sky-600 shadow-xs" : "text-slate-500"
            }`}
          >
            All Pending ({customers.filter((c) => c.outstandingBalance > 0).length})
          </button>
          <button
            onClick={() => setFilterType("OVERDUE")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterType === "OVERDUE" ? "bg-white dark:bg-slate-900 text-rose-600 shadow-xs" : "text-slate-500"
            }`}
          >
            Overdue Only
          </button>
        </div>
      </div>

      {/* Pending Balances Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Customer & Shop</th>
              <th className="py-3 px-3">Phone</th>
              <th className="py-3 px-3 text-right">Total Purchases</th>
              <th className="py-3 px-3 text-right">Total Paid</th>
              <th className="py-3 px-3 text-right">Outstanding Due</th>
              <th className="py-3 px-3">Last Payment</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                  Great! No customers with overdue credit found matching criteria.
                </td>
              </tr>
            ) : (
              pendingCustomers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.address || "Saddar"}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{c.phone}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                    {formatPKR(c.totalPurchases)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600">
                    {formatPKR(c.totalPayments)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 text-sm">
                    {formatPKR(c.outstandingBalance)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                    {c.lastPaymentDate ? formatDate(c.lastPaymentDate, false, settings.timeZone) : "No payment yet"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === "Overdue"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleSendReminder(c)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition"
                        title="Send WhatsApp Reminder Message"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenPay(c)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <ArrowDownLeft className="w-3 h-3" /> Receive
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Receive Pending Payment */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Collect Credit Payment"
        subtitle={`Receive cash against ${selectedCustForPay?.name}'s balance`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
            <span className="text-slate-500">Total Udhaar Balance:</span>
            <span className="font-bold text-rose-600 font-mono text-base">
              {formatPKR(selectedCustForPay?.outstandingBalance)}
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Amount to Collect (Rs.) *
            </label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-emerald-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Method
            </label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="Cash">Cash at Shop Counter</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Notes
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Received weekly installment"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleCollectPayment}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Confirm Cash Received & Update Khata
          </button>
        </div>
      </Modal>
    </div>
  );
}
