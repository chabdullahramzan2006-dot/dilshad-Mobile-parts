"use client";

import React, { useState, useEffect } from "react";
import { ICustomer, ICustomerLedgerEntry, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Search,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import * as XLSX from "xlsx";

interface KhataViewProps {
  customers: ICustomer[];
  settings: IShopSettings;
  onRefresh: () => void;
}

export function KhataView({ customers, settings, onRefresh }: KhataViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers.length > 0 ? customers[0]._id : null
  );
  const [ledgerEntries, setLedgerEntries] = useState<ICustomerLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjType, setAdjType] = useState<"DEBIT" | "CREDIT">("CREDIT");
  const [adjAmount, setAdjAmount] = useState<number | "">("");
  const [adjReason, setAdjReason] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustOpeningBal, setNewCustOpeningBal] = useState<number | "">("");

  // Filtered customer list
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId) || null;

  // Fetch Ledger for selected customer
  useEffect(() => {
    if (!selectedCustomerId) {
      setLedgerEntries([]);
      return;
    }

    const fetchLedger = async () => {
      setIsLoadingLedger(true);
      try {
        const res = await fetch(`/api/customers/${selectedCustomerId}/ledger`);
        const data = await res.json();
        if (res.ok) {
          setLedgerEntries(data.ledger || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingLedger(false);
      }
    };

    fetchLedger();
  }, [selectedCustomerId]);

  // Handle Receive Payment
  const handleReceivePayment = async () => {
    if (!selectedCustomerId || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
          notes: paymentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Payment of Rs. ${paymentAmount} recorded successfully!`);
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      onRefresh();

      // Refresh local ledger
      const ledgerRes = await fetch(`/api/customers/${selectedCustomerId}/ledger`);
      const ledgerData = await ledgerRes.json();
      if (ledgerRes.ok) setLedgerEntries(ledgerData.ledger || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    }
  };

  // Handle Manual Adjustment
  const handleManualAdjustment = async () => {
    if (!selectedCustomerId || !adjAmount || !adjReason) {
      toast.error("Amount and reason are required.");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}/adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: adjType,
          amount: Number(adjAmount),
          reason: adjReason,
          notes: adjNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${adjType} adjustment recorded!`);
      setShowAdjustmentModal(false);
      setAdjAmount("");
      setAdjReason("");
      setAdjNotes("");
      onRefresh();

      const ledgerRes = await fetch(`/api/customers/${selectedCustomerId}/ledger`);
      const ledgerData = await ledgerRes.json();
      if (ledgerRes.ok) setLedgerEntries(ledgerData.ledger || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Export Customer Ledger to Excel
  const exportToExcel = () => {
    if (!selectedCustomer) return;

    const data = ledgerEntries.map((e, idx) => ({
      "#": idx + 1,
      Date: formatDate(e.date, true, settings.timeZone),
      Type: e.type,
      Description: e.description,
      "Debit (+ Udhaar)": e.debit,
      "Credit (- Payment)": e.credit,
      "Running Balance": e.balanceAfter,
      Notes: e.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khata Statement");
    XLSX.writeFile(wb, `${selectedCustomer.name.replace(/\s+/g, "_")}_Khata.xlsx`);
    toast.success("Excel statement downloaded!");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* LEFT: Customer List & Balances */}
      <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Customer Accounts</h3>
          </div>
          <button
            onClick={() => setShowNewCustomerModal(true)}
            className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition"
            title="Add New Customer"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Customer Accounts Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[600px]">
          {filteredCustomers.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">No customers found.</p>
          ) : (
            filteredCustomers.map((cust) => {
              const isSelected = cust._id === selectedCustomerId;
              return (
                <button
                  key={cust._id}
                  onClick={() => setSelectedCustomerId(cust._id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500 shadow-xs"
                      : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{cust.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        cust.outstandingBalance > 0
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                    >
                      {cust.outstandingBalance > 0 ? "Pending" : "Settled"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span className="font-mono">{cust.phone}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {formatPKR(cust.outstandingBalance)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Individual Customer Statement & Actions */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs overflow-hidden">
        {selectedCustomer ? (
          <>
            {/* Customer Summary Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950 flex items-center justify-center font-bold text-sky-700 dark:text-sky-400 text-base">
                    {selectedCustomer.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedCustomer.name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                      </span>
                      {selectedCustomer.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {selectedCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Card & Action Buttons */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Current Balance</p>
                  <p
                    className={`text-2xl font-black font-mono ${
                      selectedCustomer.outstandingBalance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatPKR(selectedCustomer.outstandingBalance)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Receive Cash
                  </button>
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                    title="Manual Debit/Credit Adjustment"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                    title="Export Statement to Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition no-print"
                    title="Print Statement"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 my-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Purchases</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {formatPKR(selectedCustomer.totalPurchases)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Payments Paid</span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {formatPKR(selectedCustomer.totalPayments)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Last Payment</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
                  {selectedCustomer.lastPaymentDate ? formatDate(selectedCustomer.lastPaymentDate, false, settings.timeZone) : "None"}
                </p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Entry Type</th>
                    <th className="py-3 px-3">Description / Invoice</th>
                    <th className="py-3 px-3 text-right">Debit (+ Udhaar)</th>
                    <th className="py-3 px-3 text-right">Credit (- Paid)</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingLedger ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Loading customer ledger...
                      </td>
                    </tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono text-slate-500">{formatDate(entry.date, true, settings.timeZone)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.type === "PURCHASE"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : entry.type === "PAYMENT"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                          <div>{entry.description}</div>
                          {entry.notes && <span className="text-[10px] text-slate-400">{entry.notes}</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {entry.debit > 0 ? formatPKR(entry.debit) : "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? formatPKR(entry.credit) : "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatPKR(entry.balanceAfter)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
            Please select a customer from the left list to view their ledger statement.
          </div>
        )}
      </div>

      {/* MODAL: Receive Payment */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Receive Customer Payment"
        subtitle={`Collect cash/online payment against ${selectedCustomer?.name}'s balance`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center text-xs">
            <span className="text-slate-500">Current Outstanding Balance:</span>
            <span className="font-bold text-rose-600 text-sm font-mono">
              {formatPKR(selectedCustomer?.outstandingBalance)}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Amount (PKR) *
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="Cash">Cash at Counter</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Notes / Cheque / Txn ID
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Received via shop counter / TRX-94827"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleReceivePayment}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Confirm & Update Ledger
          </button>
        </div>
      </Modal>

      {/* MODAL: Manual Khata Adjustment */}
      <Modal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        title="Manual Ledger Adjustment"
        subtitle={`Adjust balance for ${selectedCustomer?.name} with documented reason`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjType("DEBIT")}
              className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                adjType === "DEBIT"
                  ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40"
                  : "border-slate-200 dark:border-slate-700 text-slate-600"
              }`}
            >
              Debit (+ Increase Debt)
            </button>
            <button
              type="button"
              onClick={() => setAdjType("CREDIT")}
              className={`py-2 text-xs font-bold rounded-lg border text-center transition ${
                adjType === "CREDIT"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40"
                  : "border-slate-200 dark:border-slate-700 text-slate-600"
              }`}
            >
              Credit (- Decrease Debt)
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Adjustment Amount (Rs.) *
            </label>
            <input
              type="number"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Documented Reason *
            </label>
            <input
              type="text"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="e.g. Previous ledger reconciliation / special settlement"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleManualAdjustment}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
          >
            Apply Adjustment Entry
          </button>
        </div>
      </Modal>

      {/* MODAL: New Customer */}
      <Modal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="Add New Customer Account"
        subtitle="Create Khata profile with opening balance"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Customer / Shop Name *
            </label>
            <input
              type="text"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Bilal Mobile Lab"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Mobile Phone Number *
            </label>
            <input
              type="text"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="0300-1234567"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Shop Address
            </label>
            <input
              type="text"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="e.g. Saddar Mobile Market"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Opening Balance (Rs.)
            </label>
            <input
              type="number"
              value={newCustOpeningBal}
              onChange={(e) => setNewCustOpeningBal(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0 (Initial Udhaar if any)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>
          <button
            onClick={async () => {
              if (!newCustName || !newCustPhone) {
                toast.error("Name and Phone are required");
                return;
              }
              try {
                const res = await fetch("/api/customers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: newCustName,
                    phone: newCustPhone,
                    address: newCustAddress,
                    openingBalance: Number(newCustOpeningBal) || 0,
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                toast.success("Customer account created!");
                setShowNewCustomerModal(false);
                setNewCustName("");
                setNewCustPhone("");
                setNewCustAddress("");
                setNewCustOpeningBal("");
                onRefresh();
                setSelectedCustomerId(data.customer._id);
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
          >
            Create Customer Profile
          </button>
        </div>
      </Modal>
    </div>
  );
}
