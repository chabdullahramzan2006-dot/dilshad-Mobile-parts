import mongoose, { Schema, Document, Model } from "mongoose";

// --- 1. ADMIN MODEL ---
export interface IAdminDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  mustChangePassword: boolean;
  securityQuestion?: string;
  securityAnswerHash?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdminDoc>(
  {
    name: { type: String, required: true, default: "Dilshad Admin" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "admin" },
    mustChangePassword: { type: Boolean, default: true },
    securityQuestion: { type: String },
    securityAnswerHash: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// --- 2. CATEGORY MODEL ---
const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- 3. BRAND MODEL ---
const BrandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
  },
  { timestamps: true }
);

// --- 4. PRODUCT MODEL ---
const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    modelCompatibility: { type: String, default: "" },
    description: { type: String, default: "" },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, default: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    minStockAlert: { type: Number, default: 5 },
    supplierName: { type: String, default: "" },
    purchaseDate: { type: Date },
    images: [{ type: String }],
    notes: { type: String },
    isArchived: { type: Boolean, default: false },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// --- 5. SUPPLIER MODEL ---
const SupplierSchema = new Schema(
  {
    supplierId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String },
    address: { type: String },
    openingBalance: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// --- 6. PURCHASE MODEL ---
const PurchaseItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPurchasePrice: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  unitSellingPrice: { type: Number, default: 0 },
});

const PurchaseSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: String, required: true },
    supplierName: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    items: [PurchaseItemSchema],
    transportationCost: { type: Number, default: 0 },
    otherCosts: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Cash" },
    status: { type: String, default: "Received", enum: ["Received", "Pending", "Returned", "Canceled"] },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// --- 7. SALE MODEL ---
const SaleItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPurchaseCost: { type: Number, required: true }, // exact historical cost at sale
  unitSellingPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const SaleSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: String },
    customerName: { type: String, required: true, default: "Walk-in Customer" },
    customerPhone: { type: String },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true, default: "Cash" },
    mixedDetails: {
      cashAmount: { type: Number },
      onlineAmount: { type: Number },
      creditAmount: { type: Number },
      onlineMethod: { type: String },
    },
    paymentStatus: {
      type: String,
      required: true,
      default: "Paid",
      enum: ["Paid", "Unpaid", "Partially Paid", "Overdue", "Refunded", "Canceled"],
    },
    saleDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
    isReturned: { type: Boolean, default: false },
    returnReason: { type: String },
  },
  { timestamps: true }
);

// --- 8. CUSTOMER MODEL ---
const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String },
    openingBalance: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
    dueDate: { type: Date },
    notes: { type: String },
    status: { type: String, default: "Active", enum: ["Active", "Settled", "Overdue", "Blocked"] },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// --- 9. CUSTOMER LEDGER ENTRY MODEL ---
const CustomerLedgerEntrySchema = new Schema(
  {
    customerId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      required: true,
      enum: ["OPENING_BALANCE", "PURCHASE", "PAYMENT", "RETURN", "ADJUSTMENT", "REVERSAL"],
    },
    referenceType: { type: String, enum: ["SALE", "PAYMENT", "MANUAL", "RETURN"] },
    referenceId: { type: String },
    invoiceNumber: { type: String },
    description: { type: String, required: true },
    debit: { type: Number, default: 0 }, // increases customer debt
    credit: { type: Number, default: 0 }, // decreases customer debt
    balanceAfter: { type: Number, required: true },
    notes: { type: String },
    isReversed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// --- 10. PAYMENT MODEL ---
const PaymentSchema = new Schema(
  {
    paymentNumber: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ["CUSTOMER_PAYMENT", "SUPPLIER_PAYMENT"] },
    customerId: { type: String },
    customerName: { type: String },
    supplierId: { type: String },
    supplierName: { type: String },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    date: { type: Date, default: Date.now },
    reference: { type: String },
    notes: { type: String },
    receivedBy: { type: String },
  },
  { timestamps: true }
);

// --- 11. INVENTORY MOVEMENT MODEL ---
const InventoryMovementSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["PURCHASE", "SALE", "SALE_RETURN", "PURCHASE_RETURN", "DAMAGE", "LOST", "ADJUSTMENT"],
    },
    quantityChange: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, required: true },
    referenceId: { type: String },
    performedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

// --- 12. EXPENSE MODEL ---
const ExpenseSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: "Cash" },
    description: { type: String },
    receiptUrl: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// --- 13. CUSTOM FIELD DEFINITION MODEL ---
const CustomFieldDefinitionSchema = new Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["Product", "Customer", "Sale", "Purchase", "Supplier", "Expense"],
    },
    fieldName: { type: String, required: true },
    fieldLabel: { type: String, required: true },
    fieldType: {
      type: String,
      required: true,
      enum: ["text", "number", "currency", "date", "dropdown", "checkbox", "textarea", "boolean"],
    },
    options: [{ type: String }],
    isRequired: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// --- 14. PRODUCT POST (SHOWROOM) MODEL ---
const ProductPostSchema = new Schema(
  {
    title: { type: String, required: true },
    productId: { type: String },
    images: [{ type: String }],
    description: { type: String },
    price: { type: Number },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    bannerText: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- 15. SHOP SETTINGS MODEL ---
const ShopSettingsSchema = new Schema(
  {
    shopName: { type: String, default: "Dilshad Mobile Parts" },
    shopLogo: { type: String, default: "" },
    address: { type: String, default: "Shop # 12, Mobile Market, Saddar, Karachi" },
    phone: { type: String, default: "+92 300 1234567" },
    email: { type: String, default: "dilshad@gmail.com" },
    currencySymbol: { type: String, default: "Rs." },
    defaultLowStockAlert: { type: Number, default: 5 },
    invoicePrefix: { type: String, default: "INV" },
    invoiceFooterNotes: { type: String, default: "Mobile parts checked before sale. No warranty on flex cables without tester seal." },
    termsAndConditions: { type: String, default: "1. All disputes subject to Karachi jurisdiction.\n2. Returns accepted within 3 days in original condition." },
    allowNegativeStock: { type: Boolean, default: false },
    defaultPaymentMethod: { type: String, default: "Cash" },
  },
  { timestamps: true }
);

// --- 16. AUDIT LOG MODEL ---
const AuditLogSchema = new Schema(
  {
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    details: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Prevent model overwrite in development hot reloading
export const Admin = mongoose.models.Admin || mongoose.model<IAdminDoc>("Admin", AdminSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Brand = mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
export const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);
export const Sale = mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
export const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
export const CustomerLedgerEntry =
  mongoose.models.CustomerLedgerEntry || mongoose.model("CustomerLedgerEntry", CustomerLedgerEntrySchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const InventoryMovement =
  mongoose.models.InventoryMovement || mongoose.model("InventoryMovement", InventoryMovementSchema);
export const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const CustomFieldDefinition =
  mongoose.models.CustomFieldDefinition ||
  mongoose.model("CustomFieldDefinition", CustomFieldDefinitionSchema);
export const ProductPost =
  mongoose.models.ProductPost || mongoose.model("ProductPost", ProductPostSchema);
export const ShopSettings =
  mongoose.models.ShopSettings || mongoose.model("ShopSettings", ShopSettingsSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
