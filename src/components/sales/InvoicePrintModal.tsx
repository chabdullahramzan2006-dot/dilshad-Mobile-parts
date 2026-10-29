"use client";

import React, { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { ISale, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { Printer, Download, CheckCircle, Clock } from "lucide-react";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: ISale | null;
  settings?: IShopSettings;
}

export function InvoicePrintModal({ isOpen, onClose, sale, settings }: InvoicePrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invoice #${sale.invoiceNumber}`} maxWidth="3xl">
      <div className="space-y-6">
        {/* Print Action Bar */}
        <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl no-print">
          <div className="flex items-center gap-2 text-sm text-sky-800 dark:text-sky-300 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Receipt ready to print on standard A4 or thermal paper
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" /> Print Invoice (A4)
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={printAreaRef}
          className="print-container bg-white p-8 rounded-xl border border-slate-200 text-slate-800 shadow-xs"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black text-sky-950 tracking-tight uppercase">
                {settings?.shopName || "Dilshad Mobile Parts"}
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                {settings?.address || "Shop # 12, Basement, Mobile City Plaza, Saddar, Karachi"}
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Phone: {settings?.phone || "+92 300 2345678"} | Email: {settings?.email || "dilshad@gmail.com"}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded uppercase tracking-wider mb-2">
                SALES INVOICE
              </span>
              <p className="text-lg font-mono font-bold text-slate-900">{sale.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {formatDate(sale.saleDate, true, settings?.timeZone)}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> {sale.paymentStatus}
              </div>
            </div>
          </div>

          {/* Customer & Bill Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Customer Details</p>
              <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
              {sale.customerPhone && <p className="text-slate-600 font-mono mt-0.5">Contact: {sale.customerPhone}</p>}
              <p className="text-slate-500 mt-0.5">Payment Method: <span className="font-semibold text-slate-800">{sale.paymentMethod}</span></p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Billing Info</p>
              <p className="text-slate-600">Total Items: <span className="font-bold text-slate-900">{sale.items.length}</span></p>
              <p className="text-slate-600 mt-0.5">Units Sold: <span className="font-bold text-slate-900">{sale.items.reduce((acc, i) => acc + i.quantity, 0)}</span></p>
              {sale.dueDate && (
                <p className="text-amber-700 font-medium mt-1">Due Date: {formatDate(sale.dueDate, false, settings?.timeZone)}</p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-700 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Item Description & SKU</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Disc.</th>
                  <th className="py-2.5 px-2 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-medium text-slate-900">
                      <div>{item.productName}</div>
                      <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{formatPKR(item.unitSellingPrice)}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                      {item.discount > 0 ? formatPKR(item.discount) : "-"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono">
                      {formatPKR(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2 text-xs border-t border-slate-200 pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{formatPKR(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Special Discount:</span>
                  <span className="font-mono">-{formatPKR(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Final Total:</span>
                <span className="font-mono text-sky-700">{formatPKR(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono text-emerald-600">{formatPKR(sale.paidAmount)}</span>
              </div>
              {sale.remainingAmount > 0 ? (
                <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded">
                  <span>Credit / Khata Owed:</span>
                  <span className="font-mono">{formatPKR(sale.remainingAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                  <span>Balance Due:</span>
                  <span className="font-mono">Rs. 0 (Fully Settled)</span>
                </div>
              )}
            </div>
          </div>

          {/* Terms & Footer */}
          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Notice & Terms:</p>
            <p className="whitespace-pre-line leading-relaxed">
              {settings?.termsAndConditions || "1. Return or exchange within 3 days with original seal.\n2. Burnt or physically broken parts carry no warranty."}
            </p>
            <p className="italic text-center text-slate-400 pt-3">
              {settings?.invoiceFooterNotes || "Thank you for your business at Dilshad Mobile Parts!"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
