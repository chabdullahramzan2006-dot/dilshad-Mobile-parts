"use client";

import React, { useState } from "react";
import { IExpense, IShopSettings } from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";

interface ExpensesViewProps {
  expenses: IExpense[];
  settings: IShopSettings;
  onRefresh: () => void;
}

export function ExpensesView({ expenses, settings, onRefresh }: ExpensesViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form State
  const [expTitle, setExpTitle] = useState("");
  const [expCategory, setExpCategory] = useState("Shop Rent");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expPaymentMethod, setExpPaymentMethod] = useState("Cash");
  const [expDesc, setExpDesc] = useState("");

  const categories = [
    "Shop Rent",
    "Electricity",
    "Internet",
    "Salaries",
    "Transportation",
    "Repairs",
    "Packaging",
    "Tea & Refreshments",
    "Other",
  ];

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory !== "All" && e.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    return (
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCreateExpense = async () => {
    if (!expTitle || !expCategory || !expAmount || Number(expAmount) <= 0) {
      toast.error("Please provide title, category, and valid amount.");
      return;
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expTitle.trim(),
          category: expCategory,
          amount: Number(expAmount),
          paymentMethod: expPaymentMethod,
          description: expDesc.trim(),
          date: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Expense recorded successfully!");
      setShowAddModal(false);
      setExpTitle("");
      setExpAmount("");
      setExpDesc("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Expense deleted.");
        onRefresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-sky-600" /> Shop Expense Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track daily operating costs, rent, electricity, courier, and salaries
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Expenses</span>
            <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
              {formatPKR(totalExpenseAmount)}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 text-xs">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses List */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Expense Title & Description</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Payment Method</th>
              <th className="py-3 px-3 text-right">Amount</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  No expenses recorded matching your filter.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-mono text-slate-500">{formatDate(exp.date, true, settings.timeZone)}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                    {exp.description && (
                      <div className="text-[11px] text-slate-400">{exp.description}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{exp.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 text-sm">
                    {formatPKR(exp.amount)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteExpense(exp._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add Expense */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Shop Expense"
        subtitle="This will automatically deduct from Gross Profit in P&L"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="e.g. Monthly Electricity Bill"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Category *
            </label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Amount (Rs.) *
            </label>
            <input
              type="number"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-rose-600"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Payment Method
            </label>
            <select
              value={expPaymentMethod}
              onChange={(e) => setExpPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Description / Receipt Details (Optional)
            </label>
            <textarea
              rows={2}
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Paid to plaza administration / Consumer account #"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleCreateExpense}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Save Expense Record
          </button>
        </div>
      </Modal>
    </div>
  );
}
