/**
 * Currency and Financial Precision Helper for Dilshad Mobile Parts
 * Standardizes monetary calculations to prevent floating point inaccuracies.
 * All internal financial calculations can be performed in minor units (paisa) or exact rounded decimals.
 */

// Convert Pakistani Rupees (PKR) to Paisas (minor unit: integer)
export function rupeesToPaisa(rupees: number | string): number {
  const num = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

// Convert Paisas back to Rupees
export function paisaToRupees(paisa: number): number {
  return Math.round(paisa) / 100;
}

// Safely format PKR currency string
export function formatPKR(amount: number | string | undefined | null, showDecimals: boolean = false): string {
  if (amount === undefined || amount === null || amount === "") return "Rs. 0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Rs. 0";

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })
    .format(num)
    .replace("PKR", "Rs.");
}

// Format number with Pakistani / South Asian comma separation
export function formatNumber(num: number | string): string {
  const val = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(val)) return "0";
  return new Intl.NumberFormat("en-PK").format(val);
}

// Safe precise addition: round to 2 decimals
export function preciseAdd(...numbers: (number | string)[]): number {
  const totalPaisa = numbers.reduce((acc, curr) => {
    return (acc as number) + rupeesToPaisa(curr);
  }, 0);
  return paisaToRupees(totalPaisa as number);
}

// Safe precise subtraction (a - b)
export function preciseSubtract(a: number | string, b: number | string): number {
  return paisaToRupees(rupeesToPaisa(a) - rupeesToPaisa(b));
}

// Safe precise multiplication (a * b)
export function preciseMultiply(a: number | string, b: number | string): number {
  const numA = typeof a === "string" ? parseFloat(a) : a;
  const numB = typeof b === "string" ? parseFloat(b) : b;
  return Math.round(numA * numB * 100) / 100;
}
