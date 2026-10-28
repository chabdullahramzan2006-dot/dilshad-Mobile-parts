"use client";

import React, { useState } from "react";
import { IPurchase, ISupplier, IProduct } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import {
  Truck,
  Plus,
  Search,
  Building2,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";

interface PurchasesViewProps {
  purchases: IPurchase[];
  suppliers: ISupplier[];
  products: IProduct[];
  onRefresh: () => void;
}

export function PurchasesView({
  purchases,
  suppliers,
  products,
  onRefresh,
}: PurchasesViewProps) {
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // New Purchase State
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?._id || "");
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; unitPurchasePrice: number; unitSellingPrice: number }[]
  >([{ productId: products[0]?._id || "", quantity: 10, unitPurchasePrice: products[0]?.purchasePrice || 100, unitSellingPrice: products[0]?.sellingPrice || 150 }]);
  const [transportCost, setTransportCost] = useState<number | "">("");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  // New Supplier State
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supOpening, setSupOpening] = useState<number | "">("");

  // Calculate Subtotal & Total
  const subtotal = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitPurchasePrice, 0);
  const totalAmount = subtotal + (Number(transportCost) || 0);
  const balanceAmount = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: firstProd?._id || "",
        quantity: 1,
        unitPurchasePrice: firstProd?.purchasePrice || 0,
        unitSellingPrice: firstProd?.sellingPrice || 0,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplierId || purchaseItems.length === 0) {
      toast.error("Please select a supplier and add at least one item.");
      return;
    }

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          items: purchaseItems,
          transportationCost: Number(transportCost) || 0,
          paidAmount: Number(paidAmount) || 0,
          paymentMethod,
          notes: purchaseNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Purchase Invoice #${data.purchase.invoiceNumber} recorded! Stock updated.`);
      setShowAddPurchaseModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to record purchase");
    }
  };

  const handleSaveSupplier = async () => {
    if (!supName || !supPhone) {
      toast.error("Supplier name and phone are required.");
      return;
    }

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supName,
          phone: supPhone,
          address: supAddress,
          openingBalance: Number(supOpening) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Supplier created!");
      setShowSupplierModal(false);
      setSupName("");
      setSupPhone("");
      setSupAddress("");
      setSupOpening("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-600" /> Purchasing & Supplier Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Record supplier orders, track outstanding payables, and automatically update stock
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" /> Add Supplier
          </button>
          <button
            onClick={() => {
              setPaidAmount(0);
              setShowAddPurchaseModal(true);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Record New Purchase
          </button>
        </div>
      </div>

      {/* Supplier Outstanding Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {suppliers.map((sup) => (
          <div
            key={sup._id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">{sup.name}</h4>
                <span className="text-[10px] font-mono text-slate-400">{sup.phone}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{sup.address || "Wholesale Market"}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="text-slate-400">Payable:</span>
              <span
                className={`font-mono font-bold ${
                  sup.outstandingBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatPKR(sup.outstandingBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Invoices Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Date & Invoice</th>
              <th className="py-3 px-3">Supplier</th>
              <th className="py-3 px-3">Items Purchased</th>
              <th className="py-3 px-3 text-right">Total Amount</th>
              <th className="py-3 px-3 text-right">Amount Paid</th>
              <th className="py-3 px-3 text-right">Balance Due</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  No purchase invoices recorded yet. Click &quot;Record New Purchase&quot; to add stock.
                </td>
              </tr>
            ) : (
              purchases.map((pur) => (
                <tr key={pur._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {pur.invoiceNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">{formatDate(pur.purchaseDate)}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {pur.supplierName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-600 dark:text-slate-400">
                      {pur.items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatPKR(pur.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                    {formatPKR(pur.paidAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                    {formatPKR(pur.balanceAmount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {pur.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Record New Purchase */}
      <Modal
        isOpen={showAddPurchaseModal}
        onClose={() => setShowAddPurchaseModal(false)}
        title="Record Stock Purchase"
        subtitle="Purchased items will automatically increment available inventory"
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Supplier Selection */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Supplier *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.phone}) — Balance: Rs. {s.outstandingBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Items Grid */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 dark:text-slate-300">Purchase Items Grid</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-sky-600 hover:text-sky-700 font-bold"
              >
                + Add Item
              </button>
            </div>

            {purchaseItems.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
              >
                {/* Product Dropdown */}
                <div className="col-span-5">
                  <select
                    value={row.productId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const prod = products.find((p) => p._id === pid);
                      setPurchaseItems((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                productId: pid,
                                unitPurchasePrice: prod?.purchasePrice || item.unitPurchasePrice,
                                unitSellingPrice: prod?.sellingPrice || item.unitSellingPrice,
                              }
                            : item
                        )
                      );
                    }}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                  >
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty */}
                <div className="col-span-2">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setPurchaseItems((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                      );
                    }}
                    placeholder="Qty"
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-center font-mono font-bold"
                  />
                </div>

                {/* Purchase Cost */}
                <div className="col-span-2">
                  <input
                    type="number"
                    value={row.unitPurchasePrice}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setPurchaseItems((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, unitPurchasePrice: val } : item))
                      );
                    }}
                    placeholder="Cost (Rs)"
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-right font-mono"
                  />
                </div>

                {/* Total */}
                <div className="col-span-2 text-right font-mono font-bold text-slate-800 dark:text-white">
                  {formatPKR(row.quantity * row.unitPurchasePrice)}
                </div>

                {/* Remove */}
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={purchaseItems.length === 1}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Costs & Payment */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-slate-500 block mb-1">Transport / Other Costs</label>
              <input
                type="number"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Paid Amount (Rs.)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-600"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Easypaisa">Easypaisa</option>
                <option value="JazzCash">JazzCash</option>
              </select>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Cost:</span>
              <span className="font-mono">{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-sky-600">{formatPKR(totalAmount)}</span>
            </div>
            {balanceAmount > 0 && (
              <div className="flex justify-between font-bold text-rose-600">
                <span>Added to Supplier Payable:</span>
                <span className="font-mono">{formatPKR(balanceAmount)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSavePurchase}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Save Purchase & Increment Stock
          </button>
        </div>
      </Modal>

      {/* MODAL: New Supplier */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Add New Supplier"
        subtitle="Manage wholesale vendor details and opening balance"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Supplier / Company Name *
            </label>
            <input
              type="text"
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              placeholder="e.g. Star Parts Importers"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Contact Phone *
            </label>
            <input
              type="text"
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              placeholder="0321-1234567"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Market / City Address
            </label>
            <input
              type="text"
              value={supAddress}
              onChange={(e) => setSupAddress(e.target.value)}
              placeholder="Hall Road Lahore / Star City Karachi"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Opening Balance (Rs.)
            </label>
            <input
              type="number"
              value={supOpening}
              onChange={(e) => setSupOpening(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0 (Initial Payable if any)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>
          <button
            onClick={handleSaveSupplier}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Create Supplier Account
          </button>
        </div>
      </Modal>
    </div>
  );
}
