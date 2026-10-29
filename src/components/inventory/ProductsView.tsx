"use client";

import React, { useState } from "react";
import { IProduct, ICategory, IBrand, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  SlidersHorizontal,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  Sparkles,
  Barcode,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import * as XLSX from "xlsx";

interface ProductsViewProps {
  products: IProduct[];
  categories: ICategory[];
  brands: IBrand[];
  settings: IShopSettings;
  onRefresh: () => Promise<void>;
}

export function ProductsView({
  products,
  categories,
  brands,
  settings,
  onRefresh,
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [filterStockStatus, setFilterStockStatus] = useState<"All" | "Low" | "Out">("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProdForStock, setSelectedProdForStock] = useState<IProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustType, setAdjustType] = useState<"DAMAGE" | "LOST" | "ADJUSTMENT">("DAMAGE");
  const [adjustReason, setAdjustReason] = useState("");

  // Product Form State
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0]?.name || "");
  const [formBrand, setFormBrand] = useState(brands[0]?.name || "");
  const [formModel, setFormModel] = useState("");
  const [formPurchasePrice, setFormPurchasePrice] = useState<number | "">("");
  const [formSellingPrice, setFormSellingPrice] = useState<number | "">("");
  const [formWholesalePrice, setFormWholesalePrice] = useState<number | "">("");
  const [formStock, setFormStock] = useState<number | "">("");
  const [formMinAlert, setFormMinAlert] = useState<number | "">(5);
  const [formDesc, setFormDesc] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (p.isArchived) return false;
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (selectedBrand !== "All" && p.brand !== selectedBrand) return false;

    if (filterStockStatus === "Low" && (p.currentStock <= 0 || p.currentStock > p.minStockAlert)) {
      return false;
    }
    if (filterStockStatus === "Out" && p.currentStock > 0) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.modelCompatibility && p.modelCompatibility.toLowerCase().includes(q))
    );
  });

  const handleOpenEdit = (p: IProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormBrand(p.brand);
    setFormModel(p.modelCompatibility || "");
    setFormPurchasePrice(p.purchasePrice);
    setFormSellingPrice(p.sellingPrice);
    setFormWholesalePrice(p.wholesalePrice || "");
    setFormStock(p.currentStock);
    setFormMinAlert(p.minStockAlert);
    setFormDesc(p.description || "");
    setFormImageUrl(p.images[0] || "");
    setShowEditModal(true);
  };

  const handleSaveProduct = async (isEdit: boolean) => {
    if (!formName.trim() || !formSku.trim() || !formCategory.trim() || !formBrand.trim() || !formPurchasePrice || !formSellingPrice) {
      toast.error("Please fill all required fields, including category and brand.");
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        sku: formSku.trim().toUpperCase(),
        category: formCategory.trim(),
        brand: formBrand.trim(),
        modelCompatibility: formModel.trim(),
        purchasePrice: Number(formPurchasePrice),
        sellingPrice: Number(formSellingPrice),
        wholesalePrice: Number(formWholesalePrice) || 0,
        currentStock: Number(formStock) || 0,
        minStockAlert: Number(formMinAlert) || 5,
        description: formDesc.trim(),
        images: formImageUrl ? [formImageUrl.trim()] : [],
      };

      const url = isEdit ? `/api/products/${editingProduct?._id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isEdit ? "Product updated!" : "Product created successfully!");
      setShowAddModal(false);
      setShowEditModal(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to archive this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive product");
      toast.success("Product archived.");
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to archive product");
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProdForStock || !adjustQty || !adjustReason) {
      toast.error("Quantity and reason are required.");
      return;
    }

    try {
      // Damages and losses decrease stock (negative quantity)
      const qtyChange = adjustType === "ADJUSTMENT" ? Number(adjustQty) : -Math.abs(Number(adjustQty));

      const res = await fetch("/api/products/adjust-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProdForStock._id,
          quantityChange: qtyChange,
          type: adjustType,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Stock adjustment recorded!");
      setShowStockModal(false);
      setAdjustQty("");
      setAdjustReason("");
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust stock");
    }
  };

  const exportProductsExcel = () => {
    const exportData = products.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category,
      Brand: p.brand,
      Compatibility: p.modelCompatibility || "",
      "Purchase Cost": p.purchasePrice,
      "Selling Price": p.sellingPrice,
      "Wholesale Price": p.wholesalePrice || 0,
      "Current Stock": p.currentStock,
      "Min Alert": p.minStockAlert,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Dilshad_Mobile_Parts_Inventory.xlsx");
    toast.success("Inventory exported to Excel!");
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-600" /> Inventory & Stock Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage spare parts, SKU barcodes, compatible models, and purchasing/selling rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportProductsExcel}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={() => {
              // Reset form
              setFormName("");
              setFormSku("DMP-" + Math.floor(1000 + Math.random() * 9000));
              setFormCategory(categories[0]?.name || "");
              setFormBrand(brands[0]?.name || "");
              setFormModel("");
              setFormPurchasePrice("");
              setFormSellingPrice("");
              setFormWholesalePrice("");
              setFormStock("");
              setFormMinAlert(5);
              setFormDesc("");
              setFormImageUrl("");
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add New Part
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 my-4 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search part name, SKU, or model compatibility..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="All">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Brand */}
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="All">All Brands</option>
          {brands.map((b) => (
            <option key={b._id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Stock Filter Pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          {(["All", "Low", "Out"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStockStatus(status)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterStockStatus === status
                  ? "bg-white dark:bg-slate-900 text-sky-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {status === "All" ? "All" : status === "Low" ? "Low Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Item & SKU</th>
              <th className="py-3 px-3">Category & Brand</th>
              <th className="py-3 px-3">Model Compatibility</th>
              <th className="py-3 px-3 text-right">Purchase Rate</th>
              <th className="py-3 px-3 text-right">Selling Rate</th>
              <th className="py-3 px-3 text-center">Available Stock</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No parts found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isLow = p.currentStock > 0 && p.currentStock <= p.minStockAlert;
                const isOut = p.currentStock <= 0;

                return (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                        <Barcode className="w-3 h-3" /> {p.sku}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{p.category}</div>
                      <span className="text-[10px] text-sky-600 font-medium">{p.brand}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate">
                      {p.modelCompatibility || "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {formatPKR(p.purchasePrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatPKR(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                          isOut
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                            : isLow
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {p.currentStock} units
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProdForStock(p);
                            setAdjustQty("");
                            setAdjustReason("");
                            setShowStockModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Record Damage or Stock Adjustment"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Edit Part Information"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Archive Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showEditModal ? "Edit Mobile Part" : "Add New Mobile Part"}
        subtitle="Manage product pricing, SKU, and compatibility"
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Part Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Samsung Galaxy A12 Charging Flex (Sub-board)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Product SKU / Barcode *
            </label>
            <input
              type="text"
              value={formSku}
              onChange={(e) => setFormSku(e.target.value)}
              placeholder="e.g. DMP-CHG-A12"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Category *
            </label>
            <input
              type="text"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              list="product-categories"
              placeholder="Type a category or select a saved one"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c._id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Brand *
            </label>
            <input
              type="text"
              value={formBrand}
              onChange={(e) => setFormBrand(e.target.value)}
              list="product-brands"
              placeholder="Type a brand or select a saved one"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <datalist id="product-brands">
              {brands.map((b) => (
                <option key={b._id} value={b.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Model Compatibility
            </label>
            <input
              type="text"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
              placeholder="e.g. Samsung A12, SM-A125F, A02s"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Purchase Cost (PKR) *
            </label>
            <input
              type="number"
              value={formPurchasePrice}
              onChange={(e) => setFormPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="150"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Retail Selling Price (PKR) *
            </label>
            <input
              type="number"
              value={formSellingPrice}
              onChange={(e) => setFormSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="250"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-sky-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Wholesale Price (Optional)
            </label>
            <input
              type="number"
              value={formWholesalePrice}
              onChange={(e) => setFormWholesalePrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="200"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Current Available Stock
            </label>
            <input
              type="number"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="50"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Low Stock Alert Limit
            </label>
            <input
              type="number"
              value={formMinAlert}
              onChange={(e) => setFormMinAlert(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="5"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Image URL (Optional)
            </label>
            <input
              type="text"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Description / Quality Notes
            </label>
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Original tester quality, fast charging, with mic..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              onClick={() => handleSaveProduct(Boolean(showEditModal))}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              {showEditModal ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </div>
      </Modal>

      {/* STOCK ADJUSTMENT (DAMAGE / LOSS / CORRECTION) MODAL */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Record Stock Adjustment"
        subtitle={`Adjust inventory for: ${selectedProdForStock?.name}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
            <span className="text-slate-500">Current Stock:</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
              {selectedProdForStock?.currentStock} units
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Adjustment Type *
            </label>
            <select
              value={adjustType}
              onChange={(e) =>
                setAdjustType(e.target.value as "DAMAGE" | "LOST" | "ADJUSTMENT")
              }
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
            >
              <option value="DAMAGE">Damaged / Broken Part (Recorded in Profit & Loss)</option>
              <option value="LOST">Lost / Missing Part (Recorded in Profit & Loss)</option>
              <option value="ADJUSTMENT">Manual Inventory Correction</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 2"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Reason / Observation *
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Flex cable torn during technician testing"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleAdjustStock}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Confirm Adjustment & Update History
          </button>
        </div>
      </Modal>
    </div>
  );
}
