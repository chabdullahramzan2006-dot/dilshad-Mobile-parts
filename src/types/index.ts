export type UserRole = "admin" | "manager" | "staff";

export interface IAdmin {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword?: boolean;
  securityQuestion?: string;
  securityAnswerHash?: string;
  lastLoginAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
  createdAt?: string;
}

export interface IBrand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: string;
}

export interface IProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  modelCompatibility?: string; // e.g. "Samsung A12 / A13 / A02s"
  description?: string;
  purchasePrice: number; // in PKR
  sellingPrice: number; // in PKR
  wholesalePrice?: number; // in PKR
  currentStock: number;
  minStockAlert: number;
  supplierName?: string;
  purchaseDate?: string;
  images: string[];
  notes?: string;
  isArchived?: boolean;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ISupplier {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  openingBalance: number;
  totalPurchased: number;
  totalPaid: number;
  outstandingBalance: number;
  notes?: string;
  customFields?: Record<string, any>;
  createdAt?: string;
}

export interface IPurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPurchasePrice: number;
  totalCost: number;
  unitSellingPrice?: number;
}

export type PurchaseStatus = "Received" | "Pending" | "Returned" | "Canceled";

export interface IPurchase {
  _id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  items: IPurchaseItem[];
  transportationCost: number;
  otherCosts: number;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  status: PurchaseStatus;
  notes?: string;
  customFields?: Record<string, any>;
  createdAt?: string;
}

export interface ISaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPurchaseCost: number; // Historical snapshot for exact COGS & gross profit
  unitSellingPrice: number;
  discount: number;
  total: number;
}

export type PaymentMethod =
  | "Cash"
  | "Credit / Udhaar"
  | "Bank Transfer"
  | "Easypaisa"
  | "JazzCash"
  | "Mixed Payment"
  | string;

export type PaymentStatus =
  | "Paid"
  | "Unpaid"
  | "Partially Paid"
  | "Overdue"
  | "Refunded"
  | "Canceled";

export interface ISale {
  _id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number; // Goes to Khata if > 0
  paymentMethod: PaymentMethod;
  mixedDetails?: {
    cashAmount?: number;
    onlineAmount?: number;
    creditAmount?: number;
    onlineMethod?: string;
  };
  paymentStatus: PaymentStatus;
  saleDate: string;
  dueDate?: string;
  notes?: string;
  customFields?: Record<string, any>;
  isReturned?: boolean;
  returnReason?: string;
  createdAt?: string;
}

export type CustomerAccountStatus = "Active" | "Settled" | "Overdue" | "Blocked";

export interface ICustomer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  outstandingBalance: number; // Debit balance (owed to shop)
  lastPaymentDate?: string;
  dueDate?: string;
  notes?: string;
  status: CustomerAccountStatus;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type LedgerEntryType =
  | "OPENING_BALANCE"
  | "PURCHASE"
  | "PAYMENT"
  | "RETURN"
  | "ADJUSTMENT"
  | "REVERSAL";

export interface ICustomerLedgerEntry {
  _id: string;
  customerId: string;
  date: string;
  type: LedgerEntryType;
  referenceType?: "SALE" | "PAYMENT" | "MANUAL" | "RETURN";
  referenceId?: string;
  invoiceNumber?: string;
  description: string;
  debit: number; // Increases customer debt
  credit: number; // Decreases customer debt
  balanceAfter: number;
  notes?: string;
  isReversed?: boolean;
  createdAt?: string;
}

export interface IPayment {
  _id: string;
  paymentNumber: string;
  type: "CUSTOMER_PAYMENT" | "SUPPLIER_PAYMENT";
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  reference?: string; // Cheque / Txn ID / Receipt #
  notes?: string;
  receivedBy?: string;
  createdAt?: string;
}

export type InventoryMovementType =
  | "PURCHASE"
  | "SALE"
  | "SALE_RETURN"
  | "PURCHASE_RETURN"
  | "DAMAGE"
  | "LOST"
  | "ADJUSTMENT";

export interface IInventoryMovement {
  _id: string;
  productId: string;
  productName: string;
  sku: string;
  type: InventoryMovementType;
  quantityChange: number; // e.g. -5 or +10
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;
  performedBy?: string;
  createdAt?: string;
}

export interface IExpense {
  _id: string;
  title: string;
  category:
    | "Shop Rent"
    | "Electricity"
    | "Internet"
    | "Salaries"
    | "Transportation"
    | "Repairs"
    | "Packaging"
    | "Tea & Refreshments"
    | "Other"
    | string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string;
  receiptUrl?: string;
  customFields?: Record<string, any>;
  createdAt?: string;
}

export type CustomFieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "dropdown"
  | "checkbox"
  | "textarea"
  | "boolean";

export interface ICustomFieldDefinition {
  _id: string;
  entityType: "Product" | "Customer" | "Sale" | "Purchase" | "Supplier" | "Expense";
  fieldName: string; // e.g. "warrantyMonths"
  fieldLabel: string; // e.g. "Product Warranty (Months)"
  fieldType: CustomFieldType;
  options?: string[]; // for dropdown
  isRequired?: boolean;
  defaultValue?: any;
  order: number;
  isActive: boolean;
  createdAt?: string;
}

export interface IProductPost {
  _id: string;
  title: string;
  productId?: string;
  images: string[];
  description?: string;
  price?: number;
  isFeatured: boolean;
  isPublished: boolean;
  bannerText?: string;
  order: number;
  createdAt?: string;
}

export interface IShopSettings {
  _id?: string;
  shopName: string;
  shopLogo?: string;
  address: string;
  phone: string;
  email?: string;
  currencySymbol: string;
  defaultLowStockAlert: number;
  invoicePrefix: string;
  invoiceFooterNotes: string;
  termsAndConditions: string;
  allowNegativeStock: boolean;
  defaultPaymentMethod: PaymentMethod;
  createdAt?: string;
  updatedAt?: string;
}

export interface IAuditLog {
  _id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}

// Financial Summary / P&L Types
export interface IFinancialSummary {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  damagedStockLoss: number;
  netProfit: number;
  totalCashReceived: number;
  totalCreditSales: number;
  totalOutstandingKhata: number;
  totalSupplierLiabilities: number;
  totalInventoryValuationCost: number;
  totalInventoryValuationRetail: number;
}
