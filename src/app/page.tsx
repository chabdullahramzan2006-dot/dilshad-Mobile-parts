"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  BookOpen,
  AlertCircle,
  Wallet,
  TrendingUp,
  Sliders,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle,
  Lock,
  Menu,
  X,
  Languages,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Boxes,
  Users,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  IProduct,
  ICustomer,
  ISupplier,
  IPurchase,
  ISale,
  IExpense,
  IShopSettings,
  IFinancialSummary,
} from "@/types";
import { formatPKR } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { PosTerminal } from "@/components/pos/PosTerminal";
import { ProductsView } from "@/components/inventory/ProductsView";
import { PurchasesView } from "@/components/purchases/PurchasesView";
import { SalesView } from "@/components/sales/SalesView";
import { KhataView } from "@/components/khata/KhataView";
import { PendingPaymentsView } from "@/components/pending/PendingPaymentsView";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { ProfitLossView } from "@/components/profit-loss/ProfitLossView";
import { CustomFieldsView } from "@/components/custom-fields/CustomFieldsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { Modal } from "@/components/ui/Modal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const ACTIVE_TABS = [
  "dashboard",
  "pos",
  "products",
  "purchases",
  "sales",
  "khata",
  "pending",
  "expenses",
  "profit-loss",
  "custom-fields",
  "settings",
] as const;

type ActiveTab = (typeof ACTIVE_TABS)[number];

function getTabFromHash(): ActiveTab {
  const hashTab = window.location.hash.slice(1);
  return ACTIVE_TABS.find((tab) => tab === hashTab) ?? "dashboard";
}

function subscribeToTabNavigation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("hashchange", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("hashchange", onStoreChange);
  };
}

export default function ShopApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const activeTab = useSyncExternalStore(
    subscribeToTabNavigation,
    getTabFromHash,
    () => "dashboard"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUrdu, setShowUrdu] = useState(false);

  const navigateToTab = (tab: ActiveTab) => {
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState(null, "", `#${tab}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  // Core Data
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [sales, setSales] = useState<ISale[]>([]);
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<IShopSettings>({
    shopName: "Dilshad Mobile Parts",
    shopLogo: "",
    theme: "sky",
    address: "Shop # 12, Mobile Market, Saddar, Karachi",
    timeZone: "Asia/Karachi",
    phone: "+92 300 2345678",
    email: "dilshad@gmail.com",
    currencySymbol: "Rs.",
    defaultLowStockAlert: 5,
    invoicePrefix: "INV",
    invoiceFooterNotes: "Mobile parts checked before sale.",
    termsAndConditions: "1. Return or exchange within 3 days with original seal.",
    allowNegativeStock: false,
    defaultPaymentMethod: "Cash",
  });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("dilshad@gmail.com");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forced Password Change Modal State
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Global Search
  const [globalSearch, setGlobalSearch] = useState("");

  // Check auth session
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        if (data.settings) setShopSettings(data.settings);
        if (data.user?.mustChangePassword) {
          setMustChangePassword(true);
        }
        fetchAllData(data.settings?.timeZone);
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    document.title = `${shopSettings.shopName} — Complete Shop Management System`;
  }, [shopSettings.shopName]);

  const fetchAllData = async (timeZone = shopSettings.timeZone || "Asia/Karachi") => {
    try {
      const [dashRes, prodRes, custRes, supRes, purRes, saleRes, expRes, catRes, brandRes] =
        await Promise.all([
          fetch(`/api/dashboard?timeZone=${encodeURIComponent(timeZone)}`),
          fetch("/api/products"),
          fetch("/api/customers"),
          fetch("/api/suppliers"),
          fetch("/api/purchases"),
          fetch("/api/sales"),
          fetch("/api/expenses"),
          fetch("/api/categories"),
          fetch("/api/brands"),
        ]);

      if (dashRes.ok) setDashboardStats(await dashRes.json());
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      } else {
        const data = await prodRes.json().catch(() => ({}));
        toast.error(data.error || "Could not refresh inventory. Please try again.");
      }
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data.customers || []);
      } else {
        const data = await custRes.json().catch(() => ({}));
        toast.error(data.error || "Could not refresh customer accounts. Please try again.");
      }
      if (supRes.ok) {
        const data = await supRes.json();
        setSuppliers(data.suppliers || []);
      }
      if (purRes.ok) {
        const data = await purRes.json();
        setPurchases(data.purchases || []);
      }
      if (saleRes.ok) {
        const data = await saleRes.json();
        setSales(data.sales || []);
      }
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
      if (brandRes.ok) {
        const data = await brandRes.json();
        setBrands(data.brands || []);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      toast.success("Welcome back to Dilshad Mobile Parts!");
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      if (data.user?.mustChangePassword) {
        setMustChangePassword(true);
      }
      fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setCurrentUser(null);
      toast.info("Logged out successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password updated successfully! Welcome to your dashboard.");
      setMustChangePassword(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  // 1. Loading screen
  if (isAuthenticated === null) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <p className="text-sm font-semibold tracking-wide text-sky-400" role="status">
          Loading Dilshad Mobile Parts...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen
  if (!isAuthenticated) {
    return (
      <div data-theme={shopSettings.theme || "sky"} className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-slate-100">
        <Toaster position="top-right" richColors />
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 overflow-hidden rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              {shopSettings.shopLogo ? (
                <img src={shopSettings.shopLogo} alt="" className="h-full w-full bg-white object-contain p-1" />
              ) : (
                <Boxes className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{shopSettings.shopName}</h1>
            <p className="text-xs text-slate-400 mt-1">Complete Shop Management &amp; Digital Khata System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Admin Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-500/25 transition disabled:opacity-50"
            >
              {isLoggingIn ? "Authenticating..." : "Sign In to Admin Dashboard"}
            </button>
          </form>

          {/* Development credentials helper pill */}
          <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-slate-400">
            <p className="font-semibold text-sky-400 mb-1">Initial Development Credentials:</p>
            <p className="font-mono text-[11px]">Email: dilshad@gmail.com</p>
            <p className="font-mono text-[11px]">Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated App Layout
  const summary: IFinancialSummary = dashboardStats?.summary || {
    totalSales: 0,
    totalCostOfGoodsSold: 0,
    grossProfit: 0,
    totalExpenses: 0,
    damagedStockLoss: 0,
    netProfit: 0,
    totalCashReceived: 0,
    totalCreditSales: 0,
    totalOutstandingKhata: 0,
    totalSupplierLiabilities: 0,
    totalInventoryValuationCost: 0,
    totalInventoryValuationRetail: 0,
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", urdu: "ڈیش بورڈ", icon: LayoutDashboard },
    { id: "pos", label: "POS / New Sale", urdu: "فروخت / بل بنائیں", icon: ShoppingCart, highlight: true },
    { id: "products", label: "Parts Inventory", urdu: "موبائل پارٹس", icon: Package },
    { id: "purchases", label: "Purchasing", urdu: "اسٹاک خریداری", icon: Truck },
    { id: "sales", label: "Sales Invoices", urdu: "سیلز رسیدیں", icon: Receipt },
    { id: "khata", label: "Customer Khata", urdu: "کسٹمر کھاتہ / ادھار", icon: BookOpen, badge: customers.filter((c) => c.outstandingBalance > 0).length },
    { id: "pending", label: "Credit Recovery", urdu: "ادھار وصولی", icon: AlertCircle, alert: true },
    { id: "expenses", label: "Shop Expenses", urdu: "دکان کے اخراجات", icon: Wallet },
    { id: "profit-loss", label: "Profit & Loss", urdu: "نفع و نقصان", icon: TrendingUp },
    { id: "custom-fields", label: "Custom Fields", urdu: "کسٹم فیلڈز", icon: Sliders },
    { id: "settings", label: "Shop Settings", urdu: "سیٹنگز", icon: Settings },
  ];

  return (
    <div data-theme={shopSettings.theme || "sky"} className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" richColors />

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Branding */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20 overflow-hidden">
              {shopSettings.shopLogo ? (
                <img src={shopSettings.shopLogo} alt="" className="h-full w-full object-contain bg-white" />
              ) : (
                <Boxes className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="max-w-40 truncate font-bold text-white text-sm tracking-tight leading-tight">{shopSettings.shopName}</h2>
              <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">
                Management System
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigateToTab(item.id as ActiveTab);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : item.highlight
                    ? "bg-sky-950/40 text-sky-400 hover:bg-sky-900/50"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                  <span>{showUrdu ? item.urdu : item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isActive ? "bg-white text-sky-700" : "bg-slate-800 text-sky-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-[11px]">
                D
              </div>
              <div>
                <p className="font-bold text-white leading-tight">Dilshad Khan</p>
                <p className="text-[10px] text-slate-400">Shop Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* TOP HEADER */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{shopSettings.shopName}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">{shopSettings.timeZone || "Asia/Karachi"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Urdu / English Language Toggle */}
            <button
              onClick={() => setShowUrdu(!showUrdu)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Urdu / English Toggle"
            >
              <Languages className="w-3.5 h-3.5 text-sky-600" />
              <span>{showUrdu ? "English" : "اردو"}</span>
            </button>

            {/* Quick POS Sale Button */}
            <button
              onClick={() => navigateToTab("pos")}
              className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>New Sale (POS)</span>
            </button>

            {/* Low stock alert count indicator */}
            {dashboardStats?.lowStockCount > 0 && (
              <button
                onClick={() => navigateToTab("products")}
                className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Low stock parts require reordering"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{dashboardStats.lowStockCount} Low Stock</span>
              </button>
            )}

            <button
              onClick={() => fetchAllData()}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* TAB CONTENT CONTAINER */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Banner Welcome */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                    Real-time Business Dashboard
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                  {shopSettings.shopLogo && (
                    <img src={shopSettings.shopLogo} alt="" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
                  )}
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                    {shopSettings.shopName} — Management System
                  </h1>
                  </div>
                  <p className="text-xs text-sky-100 mt-1 max-w-xl">
                    Live inventory tracking, digital customer credit (Khata), cash sales, and financial profit calculations.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigateToTab("pos")}
                    className="px-4 py-2.5 bg-white text-sky-700 hover:bg-sky-50 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" /> Make Quick Sale
                  </button>
                  <button
                    onClick={() => navigateToTab("khata")}
                    className="px-4 py-2.5 bg-sky-900/40 hover:bg-sky-900/60 border border-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" /> Open Khata
                  </button>
                </div>
              </div>

              {/* 16 REAL-TIME STAT CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* 1. Total Products */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Products</span>
                  <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {dashboardStats?.totalProducts || 0}
                  </p>
                  <span className="text-[10px] text-slate-500">Distinct spare parts catalogued</span>
                </div>

                {/* 2. Total Available Stock */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Available Stock</span>
                  <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {dashboardStats?.totalStock || 0} units
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold">Physical pieces in shop</span>
                </div>

                {/* 3. Total Inventory Purchase Cost */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Inventory Cost (Purchase)</span>
                  <p className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-1">
                    {formatPKR(summary.totalInventoryValuationCost)}
                  </p>
                  <span className="text-[10px] text-slate-400">Total invested in stock</span>
                </div>

                {/* 4. Total Inventory Value at Selling Price */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Inventory Retail Value</span>
                  <p className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
                    {formatPKR(summary.totalInventoryValuationRetail)}
                  </p>
                  <span className="text-[10px] text-sky-500">At current selling rates</span>
                </div>

                {/* 5. Total Sales */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Sales Revenue</span>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatPKR(summary.totalSales)}
                  </p>
                  <span className="text-[10px] text-slate-400">{sales.length} invoices generated</span>
                </div>

                {/* 6. Today's Sales */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Today's Sales</span>
                  <p className="text-xl font-black font-mono text-emerald-600 mt-1">
                    {formatPKR(dashboardStats?.todaySales || 0)}
                  </p>
                  <span className="text-[10px] text-emerald-500">Counter sales today</span>
                </div>

                {/* 7. Total Cash Received */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Cash Collected</span>
                  <p className="text-xl font-black font-mono text-emerald-600 mt-1">
                    {formatPKR(summary.totalCashReceived)}
                  </p>
                  <span className="text-[10px] text-slate-400">Direct cash / online</span>
                </div>

                {/* 8. Total Credit Sales (Udhaar) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Credit Sales (Udhaar)</span>
                  <p className="text-xl font-black font-mono text-amber-600 mt-1">
                    {formatPKR(summary.totalCreditSales)}
                  </p>
                  <span className="text-[10px] text-amber-500">Billed on credit</span>
                </div>

                {/* 9. Customer Outstanding Balance (Khata) */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-xs bg-rose-50/20">
                  <span className="text-[11px] font-semibold text-rose-600 uppercase">Customer Udhaar Balance</span>
                  <p className="text-xl font-black font-mono text-rose-600 mt-1">
                    {formatPKR(summary.totalOutstandingKhata)}
                  </p>
                  <span className="text-[10px] text-rose-500 font-semibold">Total recoverable debt</span>
                </div>

                {/* 10. Total Customer Payments Received */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Khata Recoveries</span>
                  <p className="text-xl font-black font-mono text-emerald-600 mt-1">
                    {formatPKR(dashboardStats?.totalCustomerPaymentsReceived || 0)}
                  </p>
                  <span className="text-[10px] text-slate-400">Paid against credit</span>
                </div>

                {/* 11. Total Expenses */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Shop Expenses</span>
                  <p className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-1">
                    {formatPKR(summary.totalExpenses)}
                  </p>
                  <span className="text-[10px] text-slate-400">Rent, electricity, packaging</span>
                </div>

                {/* 12. Gross Profit */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Profit</span>
                  <p className="text-xl font-black font-mono text-emerald-600 mt-1">
                    {formatPKR(summary.grossProfit)}
                  </p>
                  <span className="text-[10px] text-emerald-500">Sales - COGS</span>
                </div>

                {/* 13. Net Clean Profit */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 shadow-xs bg-emerald-50/20">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Net Clean Profit</span>
                  <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatPKR(summary.netProfit)}
                  </p>
                  <span className="text-[10px] text-emerald-500 font-semibold">After expenses &amp; damage</span>
                </div>

                {/* 14. Supplier Liabilities */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Supplier Payables</span>
                  <p className="text-xl font-black font-mono text-amber-600 mt-1">
                    {formatPKR(summary.totalSupplierLiabilities)}
                  </p>
                  <span className="text-[10px] text-slate-400">Owed to wholesale vendors</span>
                </div>

                {/* 15. Low Stock Products */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900 shadow-xs bg-amber-50/20">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase">Low Stock Alerts</span>
                  <p className="text-2xl font-black font-mono text-amber-700 mt-1">
                    {dashboardStats?.lowStockCount || 0}
                  </p>
                  <span className="text-[10px] text-amber-600">Items under threshold</span>
                </div>

                {/* 16. Out-of-Stock Products */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-xs bg-rose-50/20">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase">Out of Stock</span>
                  <p className="text-2xl font-black font-mono text-rose-700 mt-1">
                    {dashboardStats?.outOfStockCount || 0}
                  </p>
                  <span className="text-[10px] text-rose-600">Zero inventory items</span>
                </div>
              </div>

              {/* INTERACTIVE CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales & Profit Trend (Last 7 Days) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        Daily Sales &amp; Profit Trends (Last 7 Days)
                      </h3>
                      <p className="text-xs text-slate-400">Sales volume and gross profit margin</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    {dashboardStats?.last7Days && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardStats.last7Days}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: any) => [formatPKR(value), ""]}
                            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                          />
                          <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                          <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Top Selling Products List */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                      Top Selling Mobile Parts
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Fastest moving replacement items</p>

                    <div className="space-y-3 text-xs">
                      {dashboardStats?.topSellingProducts?.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No sale records yet.</p>
                      ) : (
                        dashboardStats?.topSellingProducts?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.name}</p>
                              <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono text-sky-600">{item.qty} sold</p>
                              <span className="text-[10px] font-mono text-slate-500">{formatPKR(item.revenue)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigateToTab("products")}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    View All Products Inventory →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POS TERMINAL */}
          {activeTab === "pos" && (
            <PosTerminal
              products={products}
              customers={customers}
              settings={shopSettings}
              onSaleComplete={fetchAllData}
            />
          )}

          {/* TAB 3: PRODUCTS & INVENTORY */}
          {activeTab === "products" && (
            <ProductsView
              products={products}
              categories={categories}
              brands={brands}
              settings={shopSettings}
              onRefresh={fetchAllData}
            />
          )}

          {/* TAB 4: PURCHASES & SUPPLIERS */}
          {activeTab === "purchases" && (
            <PurchasesView
              purchases={purchases}
              suppliers={suppliers}
              products={products}
              settings={shopSettings}
              onRefresh={fetchAllData}
              onSupplierAdded={(supplier) => {
                setSuppliers((current) =>
                  current.some((existing) => existing._id === supplier._id)
                    ? current
                    : [...current, supplier]
                );
              }}
              onSupplierArchived={(supplierId) => {
                setSuppliers((current) => current.filter((supplier) => supplier._id !== supplierId));
              }}
            />
          )}

          {/* TAB 5: SALES INVOICES */}
          {activeTab === "sales" && (
            <SalesView sales={sales} settings={shopSettings} onRefresh={fetchAllData} />
          )}

          {/* TAB 6: CUSTOMER KHATA (DIGITAL LEDGER) */}
          {activeTab === "khata" && (
            <KhataView customers={customers} settings={shopSettings} onRefresh={fetchAllData} />
          )}

          {/* TAB 7: PENDING PAYMENTS (CREDIT RECOVERY) */}
          {activeTab === "pending" && (
            <PendingPaymentsView customers={customers} settings={shopSettings} onRefresh={fetchAllData} />
          )}

          {/* TAB 8: SHOP EXPENSES */}
          {activeTab === "expenses" && (
            <ExpensesView expenses={expenses} settings={shopSettings} onRefresh={fetchAllData} />
          )}

          {/* TAB 9: PROFIT & LOSS STATEMENT */}
          {activeTab === "profit-loss" && <ProfitLossView />}

          {/* TAB 10: CUSTOM FIELDS */}
          {activeTab === "custom-fields" && <CustomFieldsView />}

          {/* TAB 11: SHOP SETTINGS */}
          {activeTab === "settings" && (
            <SettingsView
              settings={shopSettings}
              adminEmail={currentUser?.email || "dilshad@gmail.com"}
              onRefresh={fetchAllData}
              onSettingsChange={setShopSettings}
            />
          )}
        </main>
      </div>

      {/* MANDATORY PASSWORD CHANGE MODAL (Prompt requirement 3: Force admin to change initial password at first login) */}
      <Modal
        isOpen={mustChangePassword}
        onClose={() => {}}
        title="Mandatory Security Update"
        subtitle="You are using the initial setup password. For security, please set your personal password."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> First-Time Login Protection
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Your account currently uses default credentials. Enter a new, secure password to continue managing Dilshad Mobile Parts.
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              New Password (Min 6 characters) *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleForceChangePassword}
            disabled={isChangingPass}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isChangingPass ? "Securing Account..." : "Save Password & Enter Dashboard"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
