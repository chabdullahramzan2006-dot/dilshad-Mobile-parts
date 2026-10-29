"use client";

import React, { useState } from "react";
import { ISale, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { InvoicePrintModal } from "@/components/sales/InvoicePrintModal";

interface SalesViewProps {
  sales: ISale[];
  settings: IShopSettings;
  onRefresh: () => void;
}

export function SalesView({ sales, settings, onRefresh }: SalesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedSaleForView, setSelectedSaleForView] = useState<ISale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<ISale | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  const filteredSales = sales.filter((s) => {
    if (filterStatus !== "All" && s.paymentStatus !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerPhone && s.customerPhone.includes(q))
    );
  });

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

      toast.success("Return processed successfully! Stock restored.");
      setShowReturnModal(false);
      setReturnReason("");
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
            Search previous bills, reprint receipts, or process stock returns & refunds
          </p>
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
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  No sales invoices found matching your criteria.
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
                    <div className="flex justify-end gap-1.5">
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
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Process Return & Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
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
        onClose={() => setShowReturnModal(false)}
        title="Process Return & Refund"
        subtitle={`Invoice #${selectedSaleForReturn?.invoiceNumber} - ${selectedSaleForReturn?.customerName}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Stock Restoration Action
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Processing this return will automatically return all {selectedSaleForReturn?.items.length} items to
              available stock and reverse any Khata credit assigned to {selectedSaleForReturn?.customerName}.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Reason for Return *
            </label>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Technician tested display, flex connector mismatch with customer motherboard"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleProcessReturn}
            disabled={isReturning}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isReturning ? "Restoring Stock..." : "Confirm Return & Restore Inventory"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
