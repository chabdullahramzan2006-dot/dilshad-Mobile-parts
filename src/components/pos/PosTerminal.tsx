"use client";

import React, { useState, useEffect, useRef } from "react";
import { IProduct, ICustomer, ISale, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Printer,
  Sparkles,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { InvoicePrintModal } from "@/components/sales/InvoicePrintModal";
import { Modal } from "@/components/ui/Modal";

interface PosTerminalProps {
  products: IProduct[];
  customers: ICustomer[];
  settings: IShopSettings;
  onSaleComplete: () => void;
}

interface CartItem {
  product: IProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function PosTerminal({ products, customers, settings, onSaleComplete }: PosTerminalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<ISale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtered Products for Live Search Grid
  const filteredProducts = products.filter((p) => {
    if (p.isArchived) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.modelCompatibility && p.modelCompatibility.toLowerCase().includes(q))
    );
  });

  // Calculate Totals
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0);
  const finalTotal = Math.max(0, subtotal - (Number(overallDiscount) || 0));
  const remainingAmount = Math.max(0, finalTotal - (Number(paidAmount) || 0));

  // Sync paidAmount default to full total when cash or online is selected, or 0 when Credit is selected
  useEffect(() => {
    if (paymentMethod === "Credit / Udhaar") {
      setPaidAmount(0);
    } else if (paidAmount === 0 && finalTotal > 0 && paymentMethod !== "Credit / Udhaar") {
      setPaidAmount(finalTotal);
    }
  }, [finalTotal, paymentMethod]);

  // Keyboard shortcut listener (F2: search, Ctrl+Enter: checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addToCart = (product: IProduct) => {
    if (product.currentStock <= 0 && !settings.allowNegativeStock) {
      toast.error(`'${product.name}' is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.currentStock && !settings.allowNegativeStock) {
          toast.warning(`Cannot exceed available stock of ${product.currentStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.currentStock && !settings.allowNegativeStock) {
              toast.warning(`Maximum available stock is ${item.product.currentStock}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => (item.product._id === productId ? { ...item, unitPrice: newPrice } : item))
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty! Please add products.");
      return;
    }

    if (paymentMethod === "Credit / Udhaar" && !selectedCustomerId && (!customerName || customerName === "Walk-in Customer")) {
      toast.error("Please select or enter a specific Customer for Credit (Udhaar) sales.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || undefined,
        items: cart.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
          unitSellingPrice: i.unitPrice,
          discount: i.discount,
        })),
        overallDiscount: Number(overallDiscount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        notes,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sale failed");
      }

      toast.success(`Invoice #${data.sale.invoiceNumber} created successfully!`);
      setLastCompletedSale(data.sale);
      setShowPrintModal(true);

      // Reset cart
      setCart([]);
      setOverallDiscount(0);
      setPaidAmount(0);
      setNotes("");
      setSelectedCustomerId("");
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");

      onSaleComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Customer Creation
  const handleQuickAddCustomer = async () => {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Customer added!");
      setSelectedCustomerId(data.customer._id);
      setCustomerName(data.customer.name);
      setCustomerPhone(data.customer.phone);
      setShowNewCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      onSaleComplete();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* LEFT: Product Catalog & Search Terminal */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan barcode or search by part name, SKU, model (e.g. A12, battery, flex)... [F2]"
            className="w-full pl-12 pr-28 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-slate-200/60 dark:bg-slate-700 rounded text-[11px] font-mono text-slate-500">
            <Barcode className="w-3.5 h-3.5" /> F2
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 auto-rows-max">
          {filteredProducts.map((p) => {
            const inCart = cart.find((i) => i.product._id === p._id);
            const isLowStock = p.currentStock > 0 && p.currentStock <= p.minStockAlert;
            const isOut = p.currentStock <= 0;

            return (
              <button
                key={p._id}
                onClick={() => addToCart(p)}
                disabled={isOut && !settings.allowNegativeStock}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs group relative ${
                  inCart
                    ? "border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 ring-1 ring-sky-500"
                    : isOut
                    ? "opacity-50 border-slate-200 bg-slate-100/50 cursor-not-allowed"
                    : "border-slate-200 dark:border-slate-800 hover:border-sky-400 hover:shadow-xs bg-white dark:bg-slate-900"
                }`}
              >
                {/* Stock Badge */}
                <div className="flex justify-between items-center mb-1.5 w-full">
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-sky-600 transition">
                    {p.sku}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isOut
                        ? "bg-rose-100 text-rose-700"
                        : isLowStock
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Stock: {p.currentStock}
                  </span>
                </div>

                {/* Name */}
                <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-1">
                  {p.name}
                </h4>

                {/* Model Compatibility */}
                {p.modelCompatibility && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                    {p.modelCompatibility}
                  </p>
                )}

                {/* Price */}
                <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center w-full">
                  <span className="font-bold text-sky-700 dark:text-sky-400 text-sm font-mono">
                    {formatPKR(p.sellingPrice)}
                  </span>
                  {p.wholesalePrice ? (
                    <span className="text-[10px] text-slate-400 font-mono" title="Wholesale Price">
                      WS: {p.wholesalePrice}
                    </span>
                  ) : null}
                </div>

                {/* Active in-cart indicator */}
                {inCart && (
                  <div className="absolute top-2 right-2 bg-sky-600 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-xs">
                    {inCart.quantity}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Active Cart, Customer Selection & Checkout */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">Sale Invoice</h3>
          </div>
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-mono">
            {cart.length} Items
          </span>
        </div>

        {/* Customer Selector */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Customer Account
            </label>
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              + Quick Add
            </button>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => {
              const cid = e.target.value;
              setSelectedCustomerId(cid);
              if (cid) {
                const found = customers.find((c) => c._id === cid);
                if (found) {
                  setCustomerName(found.name);
                  setCustomerPhone(found.phone);
                }
              } else {
                setCustomerName("Walk-in Customer");
                setCustomerPhone("");
              }
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Walk-in Customer (Instant Cash)</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.phone}) — Due: Rs. {c.outstandingBalance}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1 mb-4">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Cart is currently empty. Click parts or scan SKU to add.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product._id}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {item.product.name}
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400">{item.product.sku}</span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product._id)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  {/* Quantity Changer */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product._id, -1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-800 dark:text-white font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product._id, 1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price input */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Rs.</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updatePrice(item.product._id, Number(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono text-xs font-semibold"
                    />
                  </div>

                  {/* Item Total */}
                  <span className="font-bold font-mono text-slate-900 dark:text-white">
                    {formatPKR(item.quantity * item.unitPrice)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment & Totals */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
              {["Cash", "Credit / Udhaar", "Easypaisa", "JazzCash", "Bank Transfer", "Mixed Payment"].map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition ${
                      paymentMethod === method
                        ? "bg-sky-600 text-white border-sky-600 font-bold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {method}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Discount & Amount Inputs */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-500 font-medium block mb-1">Overall Discount (Rs.)</label>
              <input
                type="number"
                value={overallDiscount || ""}
                onChange={(e) => setOverallDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Cash Paid (Rs.)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          {/* Balance Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono">{formatPKR(subtotal)}</span>
            </div>
            {overallDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-{formatPKR(overallDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-1.5">
              <span>Net Payable:</span>
              <span className="font-mono text-sky-600">{formatPKR(finalTotal)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/30 p-1 rounded">
                <span>Remaining (Udhaar / Khata):</span>
                <span className="font-mono">{formatPKR(remainingAmount)}</span>
              </div>
            )}
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              "Processing Sale..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Complete Sale & Print Invoice (Rs. {finalTotal})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invoice Print Modal */}
      <InvoicePrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        sale={lastCompletedSale}
        settings={settings}
      />

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="Quick Add Customer"
        subtitle="Add technician or shopkeeper to Digital Khata"
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
              placeholder="e.g. Asif Mobile Center"
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
              Shop Address (Optional)
            </label>
            <input
              type="text"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="Market / Plaza / City"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
          <button
            onClick={handleQuickAddCustomer}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition"
          >
            Save Customer & Select
          </button>
        </div>
      </Modal>
    </div>
  );
}
