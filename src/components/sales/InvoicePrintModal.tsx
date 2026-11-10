"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ISale, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate, normalizePhoneDigits } from "@/lib/utils";
import { Printer, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: ISale | null;
  settings?: IShopSettings;
}

function toWhatsAppNumber(raw: string): string | null {
  let digits = normalizePhoneDigits(raw);
  if (!digits) return null;
  // Pakistan local 3xx… → 92…
  if (digits.length === 10 && digits.startsWith("3")) {
    digits = `92${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (!digits.startsWith("92") && digits.length >= 10) {
    digits = `92${digits.replace(/^0+/, "")}`;
  }
  if (digits.length < 11) return null;
  return digits;
}

export function InvoicePrintModal({ isOpen, onClose, sale, settings }: InvoicePrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen || !sale) return;
    setWhatsappNumber(sale.customerPhone || "");
  }, [isOpen, sale?._id, sale?.invoiceNumber, sale?.customerPhone]);

  const invoiceText = useMemo(() => {
    if (!sale) return "";
    const shop = settings?.shopName || "Dilshad Mobile Parts";
    const lines = [
      `*${shop}*`,
      `Invoice: ${sale.invoiceNumber}`,
      `Date: ${formatDate(sale.saleDate, true, settings?.timeZone)}`,
      `Customer: ${sale.customerName}`,
      sale.customerPhone ? `Phone: ${sale.customerPhone}` : "",
      "",
      "*Items:*",
      ...(sale.items.length
        ? sale.items.map(
            (item, idx) =>
              `${idx + 1}. ${item.productName} x${item.quantity} = ${formatPKR(item.total)}`
          )
        : ["(Item details not available)"]),
      "",
      `Subtotal: ${formatPKR(sale.subtotal)}`,
      sale.discount > 0 ? `Discount: -${formatPKR(sale.discount)}` : "",
      `*Total: ${formatPKR(sale.totalAmount)}*`,
      `Paid: ${formatPKR(sale.paidAmount)}`,
      sale.remainingAmount > 0
        ? `*Udhaar / Khata: ${formatPKR(sale.remainingAmount)}*`
        : "Balance: Settled",
      "",
      settings?.invoiceFooterNotes || "Thank you for your business!",
    ].filter(Boolean);
    return lines.join("\n");
  }, [sale, settings]);

  if (!isOpen || !sale) return null;

  const handleClose = () => {
    if (isPrinting) return;
    onClose();
  };

  const handlePrint = () => {
    const node = printAreaRef.current;
    if (!node) {
      toast.error("Print area not ready.");
      return;
    }

    setIsPrinting(true);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) {
      setIsPrinting(false);
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }

    const shopName = settings?.shopName || "Invoice";
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${shopName} — ${sale.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { border-bottom: 2px solid #0f172a; text-transform: uppercase; font-size: 11px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 12px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .badge { display: inline-block; background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .box { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; margin: 16px 0; }
    .totals { width: 260px; margin-left: auto; font-size: 12px; }
    .totals div { display: flex; justify-content: space-between; margin: 4px 0; }
    .owed { background: #fff1f2; color: #9f1239; padding: 6px 8px; border-radius: 6px; font-weight: 700; }
    .settled { background: #ecfdf5; color: #047857; padding: 6px 8px; border-radius: 6px; font-weight: 700; }
    @page { size: A4; margin: 12mm; }
  </style>
</head>
<body>${node.innerHTML}</body>
</html>`);
    printWindow.document.close();

    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        // Close after print dialog interaction (or shortly if blocked)
        window.setTimeout(() => {
          try {
            printWindow.close();
          } catch {
            /* ignore */
          }
          setIsPrinting(false);
        }, 400);
      }
    };

    // Wait for content/styles to settle before printing
    if (printWindow.document.readyState === "complete") {
      window.setTimeout(triggerPrint, 150);
    } else {
      printWindow.onload = () => window.setTimeout(triggerPrint, 150);
    }
  };

  const handleWhatsAppShare = () => {
    const wa = toWhatsAppNumber(whatsappNumber);
    if (!wa) {
      toast.error("Valid WhatsApp number likhein (e.g. 03001234567).");
      return;
    }
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(invoiceText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Invoice #${sale.invoiceNumber}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Actions: Print + WhatsApp */}
        <div className="space-y-3 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-sky-800 dark:text-sky-300 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Print karein ya WhatsApp pe share karein
            </div>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? "Opening print..." : "Print Invoice (A4)"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-sky-900/80 dark:text-sky-200/80 block mb-1">
                WhatsApp number
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="0300-1234567"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg text-sm font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="sm:self-end flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp pe Share
            </button>
          </div>
        </div>

        {/* Printable Invoice Container (also cloned into print window) */}
        <div
          ref={printAreaRef}
          className="print-container bg-white p-8 rounded-xl border border-slate-200 text-slate-800 shadow-xs"
        >
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div className="flex items-start gap-3">
              {settings?.shopLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.shopLogo} alt="" className="h-14 w-14 rounded-lg object-contain" />
              ) : null}
              <div>
                <h1 className="title text-2xl font-black text-sky-950 tracking-tight uppercase">
                  {settings?.shopName || "Dilshad Mobile Parts"}
                </h1>
                <p className="muted text-xs text-slate-600 mt-1 max-w-sm">
                  {settings?.address || "Shop # 12, Basement, Mobile City Plaza, Saddar, Karachi"}
                </p>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  Phone: {settings?.phone || "+92 300 2345678"} | Email:{" "}
                  {settings?.email || "dilshad@gmail.com"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="badge inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded uppercase tracking-wider mb-2">
                SALES INVOICE
              </span>
              <p className="text-lg font-mono font-bold text-slate-900">{sale.invoiceNumber}</p>
              <p className="muted text-xs text-slate-500 mt-0.5">
                Date: {formatDate(sale.saleDate, true, settings?.timeZone)}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> {sale.paymentStatus}
              </div>
            </div>
          </div>

          <div className="box grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Customer Details</p>
              <p className="text-sm font-bold text-slate-900">{sale.customerName}</p>
              {sale.customerPhone && (
                <p className="text-slate-600 font-mono mt-0.5">Contact: {sale.customerPhone}</p>
              )}
              <p className="text-slate-500 mt-0.5">
                Payment Method:{" "}
                <span className="font-semibold text-slate-800">{sale.paymentMethod}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-semibold uppercase tracking-wider mb-1">Billing Info</p>
              <p className="text-slate-600">
                Total Items: <span className="font-bold text-slate-900">{sale.items.length}</span>
              </p>
              <p className="text-slate-600 mt-0.5">
                Units Sold:{" "}
                <span className="font-bold text-slate-900">
                  {sale.items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </p>
              {sale.dueDate && (
                <p className="text-amber-700 font-medium mt-1">
                  Due Date: {formatDate(sale.dueDate, false, settings?.timeZone)}
                </p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-700 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Item Description & SKU</th>
                  <th className="py-2.5 px-2 center text-center">Qty</th>
                  <th className="py-2.5 px-2 right text-right">Unit Price</th>
                  <th className="py-2.5 px-2 right text-right">Disc.</th>
                  <th className="py-2.5 px-2 right text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 px-2 text-slate-500">
                      Item details not available for this recovered invoice.
                    </td>
                  </tr>
                ) : (
                  sale.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`}>
                      <td className="py-2.5 px-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-900">
                        <div>{item.productName}</div>
                        <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                      </td>
                      <td className="py-2.5 px-2 center text-center font-bold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-2 right text-right font-mono">
                        {formatPKR(item.unitSellingPrice)}
                      </td>
                      <td className="py-2.5 px-2 right text-right font-mono text-slate-500">
                        {item.discount > 0 ? formatPKR(item.discount) : "-"}
                      </td>
                      <td className="py-2.5 px-2 right text-right font-bold text-slate-900 font-mono">
                        {formatPKR(item.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="totals flex justify-end mb-6">
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
                <div className="owed flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded">
                  <span>Credit / Khata Owed:</span>
                  <span className="font-mono">{formatPKR(sale.remainingAmount)}</span>
                </div>
              ) : (
                <div className="settled flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                  <span>Balance Due:</span>
                  <span className="font-mono">Rs. 0 (Fully Settled)</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">Notice & Terms:</p>
            <p className="whitespace-pre-line leading-relaxed">
              {settings?.termsAndConditions ||
                "1. Return or exchange within 3 days with original seal.\n2. Burnt or physically broken parts carry no warranty."}
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
