"use client";

import React, { useState, useEffect } from "react";
import { IFinancialSummary } from "@/types";
import { formatPKR } from "@/lib/currency";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

export function ProfitLossView() {
  const [summary, setSummary] = useState<IFinancialSummary | null>(null);
  const [period, setPeriod] = useState<"TODAY" | "7DAYS" | "MONTH" | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        let startDate: string | undefined;
        let endDate: string | undefined;

        const now = new Date();
        if (period === "TODAY") {
          startDate = now.toISOString().split("T")[0];
        } else if (period === "7DAYS") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          startDate = d.toISOString();
        } else if (period === "MONTH") {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = d.toISOString();
        }

        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const res = await fetch(`/api/reports/financial?${params.toString()}`);
        const data = await res.json();
        if (res.ok) setSummary(data.summary);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [period]);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Profit & Loss Statement (Financial Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Calculated using exact historical cost of goods sold (COGS), operating expenses, and stock losses
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          {(["TODAY", "7DAYS", "MONTH", "ALL"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                period === p
                  ? "bg-white dark:bg-slate-900 text-sky-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p === "TODAY" ? "Today" : p === "7DAYS" ? "Last 7 Days" : p === "MONTH" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Profit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatPKR(summary.totalSales)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Cash: {formatPKR(summary.totalCashReceived)} | Udhaar: {formatPKR(summary.totalCreditSales)}
          </p>
        </div>

        {/* Cost of Goods Sold */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-700 dark:text-slate-300">
            {formatPKR(summary.totalCostOfGoodsSold)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Direct inventory purchase cost of sold parts</p>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit (Margin)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatPKR(summary.grossProfit)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Margin: {summary.totalSales > 0 ? ((summary.grossProfit / summary.totalSales) * 100).toFixed(1) : 0}%
          </p>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs ring-1 ring-emerald-500/30">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Clean Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatPKR(summary.netProfit)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">After expenses &amp; damaged stock deductions</p>
        </div>
      </div>

      {/* Breakdown Equation Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Detailed Financial Deduction Breakdown
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Total Net Sales Revenue:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              +{formatPKR(summary.totalSales)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-500">
            <span>Less: Cost of Goods Sold (COGS):</span>
            <span className="font-mono text-rose-600 font-semibold">
              -{formatPKR(summary.totalCostOfGoodsSold)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50 dark:bg-slate-800/40 px-3 rounded-lg">
            <span>Equals: Gross Profit:</span>
            <span className="font-mono text-emerald-600">{formatPKR(summary.grossProfit)}</span>
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-500">
            <span>Less: Operating Expenses (Rent, Bills, Salaries):</span>
            <span className="font-mono text-rose-600 font-semibold">-{formatPKR(summary.totalExpenses)}</span>
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-500">
            <span>Less: Damaged / Lost Mobile Parts Loss:</span>
            <span className="font-mono text-rose-600 font-semibold">-{formatPKR(summary.damagedStockLoss)}</span>
          </div>

          <div className="flex justify-between items-center py-3 border-t-2 border-slate-800 dark:border-slate-200 text-base font-black">
            <span className="text-slate-900 dark:text-white">Net Clean Business Profit:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatPKR(summary.netProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Sheet Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Customer Outstanding Receivables (Khata)</span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-2">
            {formatPKR(summary.totalOutstandingKhata)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pending payments due from technicians &amp; shops</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Supplier Outstanding Liabilities</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-2">
            {formatPKR(summary.totalSupplierLiabilities)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Payables owed to wholesale parts importers</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Current Inventory Valuation</span>
          <p className="text-xl font-bold font-mono text-sky-600 mt-2">
            {formatPKR(summary.totalInventoryValuationCost)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Retail Selling Value: {formatPKR(summary.totalInventoryValuationRetail)}
          </p>
        </div>
      </div>
    </div>
  );
}
