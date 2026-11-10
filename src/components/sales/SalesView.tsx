"use client";

import React, { useMemo, useState } from "react";
import { ICustomer, ISale, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate, normalizePhoneDigits, phonesMatch } from "@/lib/utils";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  AlertCircle,
  Package,
  Wallet,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { InvoicePrintModal } from "@/components/sales/InvoicePrintModal";

interface SalesViewProps {
  sales: ISale[];
  customers?: ICustomer[];
  settings: IShopSettings;
  onRefresh: () => void;
}

export function SalesView({ sales, customers = [], settings, onRefresh }: SalesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedSaleForView, setSelectedSaleForView] = useState<ISale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<ISale | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  const matchedCustomers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    const qDigits = normalizePhoneDigits(q);
    return customers.filter((c) => {
      if (c.name.toLowerCase().includes(qLower)) return true;
      if (c.phone.toLowerCase().includes(qLower)) return true;
      if (qDigits && phonesMatch(c.phone, q)) return true;
      return false;
    });
  }, [customers, searchQuery]);

  const matchedCustomerIds = useMemo(
    () => new Set(matchedCustomers.map((c) => c._id).filter(Boolean) as string[]),
    [matchedCustomers]
  );

  const filteredSales = sales.filter((s) => {
    if (filterStatus !== "All" && s.paymentStatus !== filterStatus) return false;
    const q = searchQuery.trim();
    if (!q) return true;

    const qLower = q.toLowerCase();
    const qDigits = normalizePhoneDigits(q);

    if (s.invoiceNumber.toLowerCase().includes(qLower)) return true;
    if (s.customerName.toLowerCase().includes(qLower)) return true;
    if (s.customerPhone && s.customerPhone.toLowerCase().includes(qLower)) return true;
    if (qDigits && phonesMatch(s.customerPhone, q)) return true;
    if (s.customerId && matchedCustomerIds.has(s.customerId)) return true;

    // Sale phone missing but customer record phone matches
    if (s.customerId) {
      const linked = customers.find((c) => c._id === s.customerId);
      if (linked && (phonesMatch(linked.phone, q) || linked.phone.toLowerCase().includes(qLower))) {
        return true;
      }
    }

    return false;
  });

  const searchHasCustomerButNoSales =
    searchQuery.trim().length > 0 && matchedCustomers.length > 0 && filteredSales.length === 0;

  const handleProcessReturn = async () => {
    if (!selectedSaleForReturn || !returnReason.trim()) {
      toast.error("Please enter a return reason.");
      return;
    }

    setIsReturning(true);
    try {
      const res = await fetch(`/api/sales/${selectedSaleForReturn._id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: returnReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Sale return done! Stock restored and Khata updated.");
      setShowReturnModal(false);
      setReturnReason("");
      setSelectedSaleForReturn(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-sky-600" /> Sales Invoices & History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Search bills, reprint receipts, or process sale returns
          </p>
        </div>
      </div>

      {/* How to return guide */}
      <div className="mt-4 p-3.5 rounded-xl border border-sky-100 bg-sky-50/80 dark:bg-sky-950/20 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-200">
        <p className="font-bold flex items-center gap-1.5 mb-1">
          <RotateCcw className="w-3.5 h-3.5" /> Sale Return kaise karein
        </p>
        <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-sky-800/90 dark:text-sky-300/90 leading-relaxed">
          <li>Invoice number ya customer name/phone se bill search karein</li>
          <li>Row pe <span className="font-bold">Return</span> button dabayein</li>
          <li>Return reason likhein aur confirm karein — stock wapas, cash refund dikhega, udhaar khata se cut hoga</li>
        </ol>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 text-xs">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Invoice # (e.g. INV-20261027) or customer name/phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="All">All Payment Statuses</option>
          <option value="Paid">Paid (Cash / Online)</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Unpaid">Unpaid / Udhaar</option>
          <option value="Refunded">Refunded / Returned</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Invoice & Date</th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3">Items Sold</th>
              <th className="py-3 px-3 text-right">Bill Total</th>
              <th className="py-3 px-3 text-right">Cash Received</th>
              <th className="py-3 px-3 text-right">Udhaar Owed</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 px-4">
                  {searchHasCustomerButNoSales ? (
                    <div className="max-w-lg mx-auto text-left space-y-2">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        Customer Khata mein mila, lekin koi Sale Invoice nahi
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Number <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{searchQuery.trim()}</span>{" "}
                        se customer{" "}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {matchedCustomers.map((c) => c.name).join(", ")}
                        </span>{" "}
                        Khata mein hai, magar is number pe POS se koi bill save nahi hua.
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        <span className="font-semibold">Return tabhi hota hai</span> jab Sales Invoices mein
                        bill maujood ho. Agar sirf opening balance / manual udhaar hai, to pehle POS se
                        sale banao — uske baad yahan Return chalega. Khata se balance adjust karna ho to
                        Customer Khata → Receive Cash / Adjustment use karein.
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs">
                      No sales invoices found matching your criteria.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {sale.invoiceNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">{formatDate(sale.saleDate, true, settings.timeZone)}</div>
                    {sale.isReturned && sale.returnReason && (
                      <div className="text-[10px] text-purple-600 mt-0.5 line-clamp-1">
                        Return: {sale.returnReason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {sale.customerName}
                    </div>
                    {sale.customerPhone && (
                      <div className="text-[10px] font-mono text-slate-400">{sale.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                    {sale.items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatPKR(sale.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                    {formatPKR(sale.paidAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                    {sale.remainingAmount > 0 ? formatPKR(sale.remainingAmount) : "-"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sale.paymentStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : sale.paymentStatus === "Refunded"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-1.5 items-center">
                      <button
                        onClick={() => {
                          setSelectedSaleForView(sale);
                          setShowPrintModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Print / View Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {!sale.isReturned && (
                        <button
                          onClick={() => {
                            setSelectedSaleForReturn(sale);
                            setShowReturnModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg transition font-bold text-[10px]"
                          title="Process Sale Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Print Modal */}
      <InvoicePrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sale={selectedSaleForView}
        settings={settings}
      />

      {/* MODAL: Return & Refund */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setReturnReason("");
        }}
        title="Sale Return karein"
        subtitle={`Invoice #${selectedSaleForReturn?.invoiceNumber} — ${selectedSaleForReturn?.customerName}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Confirm karne pe yeh hoga
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Saari items stock mein wapas add hongi
              </li>
              <li className="flex items-start gap-1.5">
                <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Agar cash liya tha — customer ko refund dena hai:{" "}
                <span className="font-bold">{formatPKR(selectedSaleForReturn?.paidAmount || 0)}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Agar udhaar tha — Khata se cut:{" "}
                <span className="font-bold">{formatPKR(selectedSaleForReturn?.remainingAmount || 0)}</span>
              </li>
            </ul>
          </div>

          {selectedSaleForReturn && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                Return hone wali items
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
                {selectedSaleForReturn.items.map((item, idx) => (
                  <li key={`${item.productId}-${idx}`} className="px-3 py-2 flex justify-between gap-3">
                    <span className="text-slate-800 dark:text-slate-200">
                      {item.productName}{" "}
                      <span className="text-slate-400 font-mono">×{item.quantity}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatPKR(item.total)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 flex justify-between font-bold">
                <span>Bill Total</span>
                <span className="font-mono">{formatPKR(selectedSaleForReturn.totalAmount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Reason for Return / واپسی کی وجہ *
            </label>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Display flex mismatch / customer ne change mangaya"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleProcessReturn}
            disabled={isReturning}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isReturning ? "Returning..." : "Confirm Return & Restore Stock"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
