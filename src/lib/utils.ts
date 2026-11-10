import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: string | Date | number | undefined | null,
  includeTime = true,
  timeZone = "Asia/Karachi"
): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  };

  return new Intl.DateTimeFormat("en-PK", options).format(d);
}

// Generate unique invoice number: e.g. INV-20261027-8492
export function generateInvoiceNumber(prefix = "INV"): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}${day}-${randomSuffix}`;
}

// Generate unique SKU
export function generateSKU(categoryPrefix = "DMP"): string {
  const cleanPrefix = categoryPrefix.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 3) || "DMP";
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampPart = Date.now().toString().slice(-4);
  return `${cleanPrefix}-${randomPart}-${timestampPart}`;
}

// Truncate text cleanly
export function truncate(text: string, length = 40): string {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "..." : text;
}

/** Digits-only phone for matching (0300... / 300... / +92 300... all compare). */
export function normalizePhoneDigits(phone: string | undefined | null): string {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    digits = digits.slice(1);
  }
  return digits;
}

export function phonesMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}
