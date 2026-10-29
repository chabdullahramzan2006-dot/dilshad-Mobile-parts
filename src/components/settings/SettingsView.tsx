"use client";

import React, { useState } from "react";
import { IShopSettings } from "@/types";
import {
  Settings,
  Store,
  FileText,
  Shield,
  Download,
  Upload,
  Lock,
  User,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsViewProps {
  settings: IShopSettings;
  adminEmail: string;
  onRefresh: (timeZone?: string) => void;
  onSettingsChange: (settings: IShopSettings) => void;
}

export function SettingsView({ settings, adminEmail, onRefresh, onSettingsChange }: SettingsViewProps) {
  // Shop Settings State
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopLogo, setShopLogo] = useState(settings.shopLogo || "");
  const [theme, setTheme] = useState<IShopSettings["theme"]>(settings.theme || "sky");
  const [address, setAddress] = useState(settings.address);
  const [timeZone, setTimeZone] = useState(settings.timeZone || "Asia/Karachi");
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email || "");
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || "Rs.");
  const [defaultLowStockAlert, setDefaultLowStockAlert] = useState(settings.defaultLowStockAlert || 5);
  const [terms, setTerms] = useState(settings.termsAndConditions);
  const [footerNotes, setFooterNotes] = useState(settings.invoiceFooterNotes);
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings.allowNegativeStock || false);
  const [isSavingShop, setIsSavingShop] = useState(false);

  // Security & Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Backup & Restore
  const [restoreFileJson, setRestoreFileJson] = useState("");

  const handleSaveShopSettings = async () => {
    if (!shopName.trim()) {
      toast.error("Shop name is required.");
      return;
    }

    setIsSavingShop(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          shopLogo,
          theme,
          address,
          timeZone,
          phone,
          email,
          currencySymbol,
          defaultLowStockAlert: Number(defaultLowStockAlert) || 5,
          termsAndConditions: terms,
          invoiceFooterNotes: footerNotes,
          allowNegativeStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Shop settings updated successfully!");
      onSettingsChange(data.settings);
      onRefresh(data.settings.timeZone);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo image must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setShopLogo(reader.result);
      } else {
        toast.error("Could not read the selected logo.");
      }
    };
    reader.onerror = () => toast.error("Could not read the selected logo.");
    reader.readAsDataURL(file);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch("/api/settings/backup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const blob = new Blob([data.backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dilshad_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Database backup downloaded!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreFileJson(content);
      toast.info("Backup file loaded into memory. Click Restore to apply.");
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFileJson) {
      toast.error("Please upload a backup JSON file first.");
      return;
    }
    if (!confirm("RESTORE WARNING: This will overwrite current products, sales, and khata records with the backup. Continue?")) {
      return;
    }

    try {
      const res = await fetch("/api/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupJson: restoreFileJson }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Database restored successfully!");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" /> Admin Settings & Shop Preferences
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure shop branding, invoice terms, security credentials, and data backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SHOP BRANDING & INVOICE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
            <Store className="w-4 h-4 text-sky-600" /> Shop Details & Invoice Header
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Shop Name
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Shop Logo
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {shopLogo ? (
                  <img src={shopLogo} alt="Shop logo preview" className="h-full w-full object-contain" />
                ) : (
                  <Store className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                />
                <p className="mt-1 text-[10px] text-slate-500">PNG, JPEG, or WebP; maximum 2 MB.</p>
              </div>
              {shopLogo && (
                <button
                  type="button"
                  onClick={() => setShopLogo("")}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold text-slate-700 dark:text-slate-300">
              Accent Color Theme
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "sky", label: "Ocean Blue", color: "bg-sky-600" },
                { id: "emerald", label: "Emerald", color: "bg-emerald-600" },
                { id: "violet", label: "Violet", color: "bg-violet-600" },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={theme === option.id}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 font-semibold transition ${
                    theme === option.id
                      ? "border-slate-900 ring-2 ring-slate-300 dark:border-white dark:ring-slate-600"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${option.color}`} />
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Save Shop Settings to apply the selected theme.</p>
          </fieldset>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Shop Address (Appears on Printable A4 Invoices)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Time Zone / Location
            </label>
            <input
              type="text"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value.trim())}
              placeholder="Asia/Karachi"
              autoComplete="off"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Enter an IANA time zone, e.g. Asia/Karachi, Europe/London, or America/New_York.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Shop Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Default Low Stock Warning Limit (Units)
            </label>
            <input
              type="number"
              value={defaultLowStockAlert}
              onChange={(e) => setDefaultLowStockAlert(Number(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Invoice Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs leading-relaxed"
            />
          </div>

          <button
            onClick={handleSaveShopSettings}
            disabled={isSavingShop}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            {isSavingShop ? "Saving..." : "Save Shop Settings"}
          </button>
        </div>

        {/* SECURITY & BACKUP / RESTORE */}
        <div className="space-y-6">
          {/* Change Password */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
              <Lock className="w-4 h-4 text-emerald-600" /> Admin Security & Password
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Logged In Admin:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{adminEmail}</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                New Password (Min 6 chars)
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
                Confirm New Password
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
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              {isUpdatingPassword ? "Updating..." : "Update Admin Password"}
            </button>
          </div>

          {/* Backup & Restore Data */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-sm">
              <Shield className="w-4 h-4 text-sky-600" /> Database Backup & Disaster Recovery
            </div>

            <p className="text-slate-500 leading-relaxed">
              Export an encrypted JSON snapshot of all inventory, customer Khata ledgers, sales history, and expenses.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadBackup}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Backup JSON
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Restore From Backup File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full text-slate-500 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
              {restoreFileJson && (
                <button
                  onClick={handleExecuteRestore}
                  className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition"
                >
                  Confirm & Execute Database Restore
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
