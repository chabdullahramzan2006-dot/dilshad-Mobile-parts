import fs from "fs";
import path from "path";
import {
  IAdmin,
  ICategory,
  IBrand,
  IProduct,
  ISupplier,
  IPurchase,
  ISale,
  ISaleItem,
  ICustomer,
  ICustomerLedgerEntry,
  IPayment,
  IInventoryMovement,
  IExpense,
  ICustomFieldDefinition,
  IProductPost,
  IShopSettings,
  IAuditLog,
  IFinancialSummary,
} from "@/types";
import { hashPassword } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/models";
import { preciseAdd, preciseSubtract, preciseMultiply } from "@/lib/currency";
import { generateInvoiceNumber } from "@/lib/utils";

// Local persistent JSON database path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "dilshad_store.json");

interface DatabaseSchema {
  admins: IAdmin[];
  categories: ICategory[];
  brands: IBrand[];
  products: IProduct[];
  suppliers: ISupplier[];
  purchases: IPurchase[];
  sales: ISale[];
  customers: ICustomer[];
  ledgerEntries: ICustomerLedgerEntry[];
  payments: IPayment[];
  inventoryMovements: IInventoryMovement[];
  expenses: IExpense[];
  customFields: ICustomFieldDefinition[];
  productPosts: IProductPost[];
  settings: IShopSettings;
  auditLogs: IAuditLog[];
}

// In-Memory cache of DB schema
let dbCache: DatabaseSchema | null = null;

// Ensure storage file and directory exist
function ensureDB(): DatabaseSchema {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      dbCache = JSON.parse(raw);
      return dbCache!;
    } catch (e) {
      console.error("Error reading database file, recreating...", e);
    }
  }

  // Initial fresh database structure
  const initialData: DatabaseSchema = {
    admins: [],
    categories: [],
    brands: [],
    products: [],
    suppliers: [],
    purchases: [],
    sales: [],
    customers: [],
    ledgerEntries: [],
    payments: [],
    inventoryMovements: [],
    expenses: [],
    customFields: [],
    productPosts: [],
    settings: {
      shopName: "Dilshad Mobile Parts",
      shopLogo: "",
      theme: "sky",
      address: "Shop # 12, Basement, Mobile City Plaza, Saddar, Karachi",
      timeZone: "Asia/Karachi",
      phone: "+92 300 2345678",
      email: "dilshad@gmail.com",
      currencySymbol: "Rs.",
      defaultLowStockAlert: 5,
      invoicePrefix: "INV",
      invoiceFooterNotes: "Mobile parts checked before sale. No warranty on flex cables without tester seal.",
      termsAndConditions: "1. Return or exchange within 3 days with original seal.\n2. Burnt or physically broken parts carry no warranty.",
      allowNegativeStock: false,
      defaultPaymentMethod: "Cash",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    auditLogs: [],
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  dbCache = initialData;
  return dbCache;
}

// Persist cache to disk
function saveDB() {
  if (!dbCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save database file:", error);
  }
}

// Generate simple string ID
function generateId(): string {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
}

// ==========================================
// SEEDING INITIAL DATA
// ==========================================
export async function seedInitialDatabase() {
  const db = ensureDB();

  if (db.admins.length === 0) {
    const adminPasswordHash = await hashPassword("admin123");
    db.admins.push({
      _id: generateId(),
      name: "Dilshad Khan",
      email: "dilshad@gmail.com",
      passwordHash: adminPasswordHash,
      role: "admin",
      mustChangePassword: true,
      securityQuestion: "What is your shop name?",
      securityAnswerHash: await hashPassword("dilshad mobile parts"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDB();
  }

  return db;
}

// ==========================================
// ADMIN USER SERVICES
// ==========================================
export async function getAdminByEmail(email: string): Promise<IAdmin | null> {
  const db = ensureDB();
  return db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

export async function updateAdminPassword(adminId: string, newPasswordHash: string): Promise<boolean> {
  const db = ensureDB();
  const admin = db.admins.find((a) => a._id === adminId);
  if (!admin) return false;

  admin.passwordHash = newPasswordHash;
  admin.mustChangePassword = false;
  admin.updatedAt = new Date().toISOString();
  saveDB();
  return true;
}

export async function updateAdminProfile(adminId: string, name: string, email: string): Promise<boolean> {
  const db = ensureDB();
  const admin = db.admins.find((a) => a._id === adminId);
  if (!admin) return false;

  admin.name = name;
  admin.email = email;
  admin.updatedAt = new Date().toISOString();
  saveDB();
  return true;
}

// ==========================================
// PRODUCTS & INVENTORY SERVICES
// ==========================================
export async function getProducts(options?: {
  search?: string;
  category?: string;
  brand?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}): Promise<IProduct[]> {
  const db = ensureDB();
  let list = db.products.filter((p) => !p.isArchived);

  if (options?.category && options.category !== "All") {
    list = list.filter((p) => p.category.toLowerCase() === options.category!.toLowerCase());
  }
  if (options?.brand && options.brand !== "All") {
    list = list.filter((p) => p.brand.toLowerCase() === options.brand!.toLowerCase());
  }
  if (options?.lowStock) {
    list = list.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockAlert);
  }
  if (options?.outOfStock) {
    list = list.filter((p) => p.currentStock <= 0);
  }
  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.modelCompatibility && p.modelCompatibility.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function getProductById(id: string): Promise<IProduct | null> {
  const db = ensureDB();
  return db.products.find((p) => p._id === id) || null;
}

export async function createProduct(productData: Omit<IProduct, "_id" | "createdAt" | "updatedAt">): Promise<IProduct> {
  const db = ensureDB();
  const newProduct: IProduct = {
    _id: generateId(),
    ...productData,
    currentStock: Number(productData.currentStock) || 0,
    purchasePrice: Number(productData.purchasePrice) || 0,
    sellingPrice: Number(productData.sellingPrice) || 0,
    wholesalePrice: Number(productData.wholesalePrice) || 0,
    minStockAlert: Number(productData.minStockAlert) || 5,
    images: productData.images || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.push(newProduct);

  if (newProduct.currentStock > 0) {
    db.inventoryMovements.push({
      _id: generateId(),
      productId: newProduct._id,
      productName: newProduct.name,
      sku: newProduct.sku,
      type: "PURCHASE",
      quantityChange: newProduct.currentStock,
      previousStock: 0,
      newStock: newProduct.currentStock,
      reason: "Initial Product Creation Stock",
      performedBy: "Admin",
      createdAt: new Date().toISOString(),
    });
  }

  saveDB();
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<IProduct>): Promise<IProduct | null> {
  const db = ensureDB();
  const index = db.products.findIndex((p) => p._id === id);
  if (index === -1) return null;

  const current = db.products[index];
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.products[index] = updated;
  saveDB();
  return updated;
}

export async function deleteProduct(id: string, softDelete = true): Promise<boolean> {
  const db = ensureDB();
  const prod = db.products.find((p) => p._id === id);
  if (!prod) return false;

  if (softDelete) {
    prod.isArchived = true;
    prod.updatedAt = new Date().toISOString();
  } else {
    db.products = db.products.filter((p) => p._id !== id);
  }

  saveDB();
  return true;
}

// Adjust stock (Damage, Loss, Return, Manual correction)
export async function adjustStock(
  productId: string,
  quantityChange: number,
  type: "DAMAGE" | "LOST" | "ADJUSTMENT" | "SALE_RETURN" | "PURCHASE_RETURN",
  reason: string,
  performedBy = "Admin"
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  const db = ensureDB();
  const prod = db.products.find((p) => p._id === productId);
  if (!prod) return { success: false, error: "Product not found" };

  const previousStock = prod.currentStock;
  const newStock = previousStock + quantityChange;

  if (newStock < 0 && !db.settings.allowNegativeStock) {
    return { success: false, error: "Adjustment would result in negative stock." };
  }

  prod.currentStock = newStock;
  prod.updatedAt = new Date().toISOString();

  db.inventoryMovements.push({
    _id: generateId(),
    productId: prod._id,
    productName: prod.name,
    sku: prod.sku,
    type,
    quantityChange,
    previousStock,
    newStock,
    reason,
    performedBy,
    createdAt: new Date().toISOString(),
  });

  saveDB();
  return { success: true, newStock };
}

// ==========================================
// CATEGORIES & BRANDS
// ==========================================
export async function getCategories(): Promise<ICategory[]> {
  const db = ensureDB();
  // Recalculate live product count
  return db.categories.map((c) => {
    const count = db.products.filter((p) => !p.isArchived && p.category.toLowerCase() === c.name.toLowerCase()).length;
    return { ...c, productCount: count };
  });
}

export async function createCategory(name: string, description?: string): Promise<ICategory> {
  const db = ensureDB();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const newCat: ICategory = {
    _id: generateId(),
    name: name.trim(),
    slug,
    description,
    productCount: 0,
    createdAt: new Date().toISOString(),
  };
  db.categories.push(newCat);
  saveDB();
  return newCat;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const db = ensureDB();
  db.categories = db.categories.filter((c) => c._id !== id);
  saveDB();
  return true;
}

export async function getBrands(): Promise<IBrand[]> {
  const db = ensureDB();
  return db.brands;
}

export async function createBrand(name: string, description?: string): Promise<IBrand> {
  const db = ensureDB();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const newBrand: IBrand = {
    _id: generateId(),
    name: name.trim(),
    slug,
    description,
    createdAt: new Date().toISOString(),
  };
  db.brands.push(newBrand);
  saveDB();
  return newBrand;
}

export async function deleteBrand(id: string): Promise<boolean> {
  const db = ensureDB();
  db.brands = db.brands.filter((b) => b._id !== id);
  saveDB();
  return true;
}

// ==========================================
// SUPPLIERS & PURCHASES
// ==========================================
async function seedMongoSuppliersFromLocalFile() {
  const mongo = await connectDB();
  if (!mongo) return null;

  const db = ensureDB();
  if (db.suppliers.length > 0) {
    await Supplier.bulkWrite(
      db.suppliers.map((supplier) => ({
        updateOne: {
          filter: { supplierId: supplier._id },
          update: {
            $setOnInsert: toMongoSupplierRecord(supplier),
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  return mongo;
}

function toSupplierRecord(value: Record<string, unknown>): ISupplier {
  const { _id, supplierId, ...supplier } = value;
  return {
    ...supplier,
    _id: String(supplierId || _id),
  } as ISupplier;
}

function toMongoSupplierRecord(supplier: ISupplier) {
  const { _id, ...supplierData } = supplier;
  return { supplierId: _id, ...supplierData };
}

export async function getSuppliers(): Promise<ISupplier[]> {
  const mongo = await seedMongoSuppliersFromLocalFile();
  if (mongo) {
    const suppliers = await Supplier.find({ isArchived: { $ne: true } }).sort({ createdAt: -1 }).lean();
    return suppliers.map((supplier) => toSupplierRecord(supplier as unknown as Record<string, unknown>));
  }

  const db = ensureDB();
  return db.suppliers.filter((supplier) => !supplier.isArchived);
}

export async function getSupplierById(id: string): Promise<ISupplier | null> {
  const mongo = await seedMongoSuppliersFromLocalFile();
  if (mongo) {
    const supplier = await Supplier.findOne({ supplierId: id, isArchived: { $ne: true } }).lean();
    return supplier
      ? toSupplierRecord(supplier as unknown as Record<string, unknown>)
      : null;
  }

  const db = ensureDB();
  return db.suppliers.find((s) => s._id === id && !s.isArchived) || null;
}

export async function createSupplier(data: Omit<ISupplier, "_id" | "createdAt" | "totalPurchased" | "totalPaid" | "outstandingBalance">): Promise<ISupplier> {
  const mongo = await seedMongoSuppliersFromLocalFile();
  const db = ensureDB();
  const opening = Number(data.openingBalance) || 0;
  const newSup: ISupplier = {
    _id: generateId(),
    ...data,
    openingBalance: opening,
    totalPurchased: 0,
    totalPaid: 0,
    outstandingBalance: opening,
    createdAt: new Date().toISOString(),
  };
  if (mongo) {
    const created = await Supplier.create(toMongoSupplierRecord(newSup));
    return toSupplierRecord(created.toObject() as unknown as Record<string, unknown>);
  }

  db.suppliers.push(newSup);
  saveDB();
  return newSup;
}

export async function archiveSupplier(id: string): Promise<{ success: boolean; error?: string }> {
  const mongo = await seedMongoSuppliersFromLocalFile();
  if (mongo) {
    const result = await Supplier.updateOne(
      { supplierId: id, isArchived: { $ne: true } },
      { $set: { isArchived: true } }
    );
    if (result.matchedCount === 0) return { success: false, error: "Supplier not found." };
    return { success: true };
  }

  const db = ensureDB();
  const supplier = db.suppliers.find((item) => item._id === id);
  if (!supplier) return { success: false, error: "Supplier not found." };
  if (supplier.isArchived) return { success: false, error: "Supplier is already archived." };

  supplier.isArchived = true;
  saveDB();
  return { success: true };
}

export async function getPurchases(): Promise<IPurchase[]> {
  const db = ensureDB();
  return [...db.purchases].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
}

export async function createPurchase(purchaseData: {
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    unitPurchasePrice: number;
    unitSellingPrice?: number;
  }[];
  transportationCost?: number;
  otherCosts?: number;
  paidAmount: number;
  paymentMethod: string;
  notes?: string;
  customFields?: Record<string, any>;
}): Promise<{ success: boolean; purchase?: IPurchase; error?: string }> {
  const db = ensureDB();
  const supplier = db.suppliers.find((s) => s._id === purchaseData.supplierId);
  if (!supplier) return { success: false, error: "Supplier not found." };

  const invoiceNumber = generateInvoiceNumber("PUR");
  let subtotal = 0;
  const processedItems = [];

  for (const item of purchaseData.items) {
    const prod = db.products.find((p) => p._id === item.productId);
    if (!prod) return { success: false, error: `Product ID ${item.productId} not found.` };

    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPurchasePrice) || prod.purchasePrice;
    const totalCost = preciseMultiply(qty, unitPrice);
    subtotal = preciseAdd(subtotal, totalCost);

    // Update product stock and purchase price
    const prevStock = prod.currentStock;
    prod.currentStock = prevStock + qty;
    prod.purchasePrice = unitPrice;
    if (item.unitSellingPrice && item.unitSellingPrice > 0) {
      prod.sellingPrice = item.unitSellingPrice;
    }
    prod.updatedAt = new Date().toISOString();

    // Inventory movement
    db.inventoryMovements.push({
      _id: generateId(),
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      type: "PURCHASE",
      quantityChange: qty,
      previousStock: prevStock,
      newStock: prod.currentStock,
      reason: `Stock Purchase Invoice #${invoiceNumber}`,
      referenceId: invoiceNumber,
      performedBy: "Admin",
      createdAt: new Date().toISOString(),
    });

    processedItems.push({
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      quantity: qty,
      unitPurchasePrice: unitPrice,
      totalCost,
      unitSellingPrice: item.unitSellingPrice || prod.sellingPrice,
    });
  }

  const transCost = Number(purchaseData.transportationCost) || 0;
  const otherCost = Number(purchaseData.otherCosts) || 0;
  const totalAmount = preciseAdd(subtotal, transCost, otherCost);
  const paid = Number(purchaseData.paidAmount) || 0;
  const balance = preciseSubtract(totalAmount, paid);

  // Update Supplier Balances
  supplier.totalPurchased = preciseAdd(supplier.totalPurchased, totalAmount);
  supplier.totalPaid = preciseAdd(supplier.totalPaid, paid);
  supplier.outstandingBalance = preciseAdd(supplier.outstandingBalance, balance);

  const newPurchase: IPurchase = {
    _id: generateId(),
    invoiceNumber,
    supplierId: supplier._id,
    supplierName: supplier.name,
    purchaseDate: new Date().toISOString(),
    items: processedItems,
    transportationCost: transCost,
    otherCosts: otherCost,
    subtotal,
    totalAmount,
    paidAmount: paid,
    balanceAmount: balance,
    paymentMethod: purchaseData.paymentMethod || "Cash",
    status: "Received",
    notes: purchaseData.notes,
    customFields: purchaseData.customFields || {},
    createdAt: new Date().toISOString(),
  };

  db.purchases.push(newPurchase);

  // Record payment if paid > 0
  if (paid > 0) {
    db.payments.push({
      _id: generateId(),
      paymentNumber: generateInvoiceNumber("PAY"),
      type: "SUPPLIER_PAYMENT",
      supplierId: supplier._id,
      supplierName: supplier.name,
      amount: paid,
      paymentMethod: purchaseData.paymentMethod,
      date: new Date().toISOString(),
      reference: `Purchase Invoice #${invoiceNumber}`,
      receivedBy: "Admin",
      createdAt: new Date().toISOString(),
    });
  }

  saveDB();
  return { success: true, purchase: newPurchase };
}

// ==========================================
// SALES & POS SYSTEM
// ==========================================
export async function getSales(options?: {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  search?: string;
  paymentStatus?: string;
}): Promise<ISale[]> {
  const db = ensureDB();
  let list = [...db.sales];

  if (options?.customerId) {
    list = list.filter((s) => s.customerId === options.customerId);
  }
  if (options?.paymentStatus && options.paymentStatus !== "All") {
    list = list.filter((s) => s.paymentStatus === options.paymentStatus);
  }
  if (options?.startDate) {
    const start = new Date(options.startDate).getTime();
    list = list.filter((s) => new Date(s.saleDate).getTime() >= start);
  }
  if (options?.endDate) {
    const end = new Date(options.endDate).getTime();
    list = list.filter((s) => new Date(s.saleDate).getTime() <= end);
  }
  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q))
    );
  }

  return list.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
}

export async function getSaleById(id: string): Promise<ISale | null> {
  const db = ensureDB();
  return db.sales.find((s) => s._id === id || s.invoiceNumber === id) || null;
}

export async function createSale(saleData: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    productId: string;
    quantity: number;
    unitSellingPrice?: number;
    discount?: number;
  }[];
  overallDiscount?: number;
  paidAmount: number;
  paymentMethod: string;
  mixedDetails?: {
    cashAmount?: number;
    onlineAmount?: number;
    creditAmount?: number;
    onlineMethod?: string;
  };
  dueDate?: string;
  notes?: string;
  customFields?: Record<string, any>;
}): Promise<{ success: boolean; sale?: ISale; error?: string }> {
  const db = ensureDB();
  const invoiceNumber = generateInvoiceNumber("INV");
  let subtotal = 0;
  const processedItems: ISaleItem[] = [];

  // 1. Validate all stock availability first (Atomic check)
  for (const item of saleData.items) {
    const prod = db.products.find((p) => p._id === item.productId);
    if (!prod) {
      return { success: false, error: `Product ID ${item.productId} not found.` };
    }
    const qty = Number(item.quantity) || 1;
    if (prod.currentStock < qty && !db.settings.allowNegativeStock) {
      return {
        success: false,
        error: `Insufficient stock for '${prod.name}'. Available: ${prod.currentStock}, Requested: ${qty}.`,
      };
    }
  }

  // 2. Process Items, calculate amounts and deduct stock
  for (const item of saleData.items) {
    const prod = db.products.find((p) => p._id === item.productId)!;
    const qty = Number(item.quantity) || 1;
    const unitPrice = item.unitSellingPrice !== undefined ? Number(item.unitSellingPrice) : prod.sellingPrice;
    const itemDiscount = Number(item.discount) || 0;
    const lineTotal = preciseSubtract(preciseMultiply(qty, unitPrice), itemDiscount);

    subtotal = preciseAdd(subtotal, lineTotal);

    // Snapshot exact purchase cost at moment of sale for accurate COGS
    const unitPurchaseCost = prod.purchasePrice;

    // Deduct stock atomically
    const prevStock = prod.currentStock;
    prod.currentStock = prevStock - qty;
    prod.updatedAt = new Date().toISOString();

    // Inventory movement audit
    db.inventoryMovements.push({
      _id: generateId(),
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      type: "SALE",
      quantityChange: -qty,
      previousStock: prevStock,
      newStock: prod.currentStock,
      reason: `Sale Invoice #${invoiceNumber}`,
      referenceId: invoiceNumber,
      performedBy: "Admin",
      createdAt: new Date().toISOString(),
    });

    processedItems.push({
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      quantity: qty,
      unitPurchaseCost,
      unitSellingPrice: unitPrice,
      discount: itemDiscount,
      total: lineTotal,
    });
  }

  const overallDiscount = Number(saleData.overallDiscount) || 0;
  const totalAmount = Math.max(0, preciseSubtract(subtotal, overallDiscount));
  const paidAmount = Number(saleData.paidAmount) || 0;
  const remainingAmount = Math.max(0, preciseSubtract(totalAmount, paidAmount));

  // Determine Payment Status
  let paymentStatus: ISale["paymentStatus"] = "Paid";
  if (paidAmount === 0) {
    paymentStatus = "Unpaid";
  } else if (remainingAmount > 0) {
    paymentStatus = "Partially Paid";
  }

  // Handle Customer Digital Khata
  let customer: ICustomer | undefined;
  if (saleData.customerId) {
    customer = db.customers.find((c) => c._id === saleData.customerId);
  } else if (saleData.customerName && saleData.customerPhone) {
    // Check if customer exists by phone
    customer = db.customers.find((c) => c.phone.trim() === saleData.customerPhone?.trim());
    if (!customer) {
      // Auto-create customer
      customer = {
        _id: generateId(),
        name: saleData.customerName.trim(),
        phone: saleData.customerPhone.trim(),
        openingBalance: 0,
        totalPurchases: 0,
        totalPayments: 0,
        outstandingBalance: 0,
        status: "Active",
        createdAt: new Date().toISOString(),
      };
      db.customers.push(customer);
    }
  }

  // Update Customer Ledger & Outstanding if customer exists
  if (customer) {
    customer.totalPurchases = preciseAdd(customer.totalPurchases, totalAmount);
    customer.totalPayments = preciseAdd(customer.totalPayments, paidAmount);

    if (remainingAmount > 0) {
      // Debit ledger entry (amount customer owes)
      const prevBal = customer.outstandingBalance;
      customer.outstandingBalance = preciseAdd(prevBal, remainingAmount);
      customer.status = "Active";

      db.ledgerEntries.push({
        _id: generateId(),
        customerId: customer._id,
        date: new Date().toISOString(),
        type: "PURCHASE",
        referenceType: "SALE",
        invoiceNumber,
        description: `Sale Invoice #${invoiceNumber} (Credit Udhaar Amount)`,
        debit: remainingAmount,
        credit: 0,
        balanceAfter: customer.outstandingBalance,
        notes: `Total bill: Rs. ${totalAmount}, Cash paid: Rs. ${paidAmount}`,
        createdAt: new Date().toISOString(),
      });
    }

    if (paidAmount > 0) {
      customer.lastPaymentDate = new Date().toISOString();
      if (customer.outstandingBalance === 0) {
        customer.status = "Settled";
      }
    }
  }

  // Create Sale record
  const newSale: ISale = {
    _id: generateId(),
    invoiceNumber,
    customerId: customer?._id,
    customerName: customer ? customer.name : (saleData.customerName || "Walk-in Customer"),
    customerPhone: customer ? customer.phone : saleData.customerPhone,
    items: processedItems,
    subtotal,
    discount: overallDiscount,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentMethod: saleData.paymentMethod || "Cash",
    mixedDetails: saleData.mixedDetails,
    paymentStatus,
    saleDate: new Date().toISOString(),
    dueDate: saleData.dueDate,
    notes: saleData.notes,
    customFields: saleData.customFields || {},
    isReturned: false,
    createdAt: new Date().toISOString(),
  };

  db.sales.push(newSale);

  // If cash/online paid, record payment receipt
  if (paidAmount > 0) {
    db.payments.push({
      _id: generateId(),
      paymentNumber: generateInvoiceNumber("PAY"),
      type: "CUSTOMER_PAYMENT",
      customerId: customer?._id,
      customerName: newSale.customerName,
      amount: paidAmount,
      paymentMethod: saleData.paymentMethod,
      date: new Date().toISOString(),
      reference: `Invoice #${invoiceNumber}`,
      receivedBy: "Admin",
      createdAt: new Date().toISOString(),
    });
  }

  saveDB();
  return { success: true, sale: newSale };
}

// Process Sale Return & Refund
export async function returnSale(
  saleId: string,
  returnReason: string
): Promise<{ success: boolean; error?: string }> {
  const db = ensureDB();
  const sale = db.sales.find((s) => s._id === saleId || s.invoiceNumber === saleId);
  if (!sale) return { success: false, error: "Sale invoice not found." };
  if (sale.isReturned) return { success: false, error: "This sale has already been returned." };

  // 1. Restore product inventory
  for (const item of sale.items) {
    const prod = db.products.find((p) => p._id === item.productId);
    if (prod) {
      const prevStock = prod.currentStock;
      prod.currentStock = prevStock + item.quantity;
      prod.updatedAt = new Date().toISOString();

      db.inventoryMovements.push({
        _id: generateId(),
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        type: "SALE_RETURN",
        quantityChange: item.quantity,
        previousStock: prevStock,
        newStock: prod.currentStock,
        reason: `Return of Sale Invoice #${sale.invoiceNumber} - ${returnReason}`,
        referenceId: sale.invoiceNumber,
        performedBy: "Admin",
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 2. Reverse customer Khata ledger if credit was assigned
  if (sale.customerId && sale.remainingAmount > 0) {
    const customer = db.customers.find((c) => c._id === sale.customerId);
    if (customer) {
      customer.outstandingBalance = Math.max(0, preciseSubtract(customer.outstandingBalance, sale.remainingAmount));
      if (customer.outstandingBalance === 0) {
        customer.status = "Settled";
      }

      db.ledgerEntries.push({
        _id: generateId(),
        customerId: customer._id,
        date: new Date().toISOString(),
        type: "RETURN",
        referenceType: "RETURN",
        invoiceNumber: sale.invoiceNumber,
        description: `Sale Return & Ledger Credit - Inv #${sale.invoiceNumber}`,
        debit: 0,
        credit: sale.remainingAmount,
        balanceAfter: customer.outstandingBalance,
        notes: returnReason,
        createdAt: new Date().toISOString(),
      });
    }
  }

  sale.isReturned = true;
  sale.returnReason = returnReason;
  sale.paymentStatus = "Refunded";

  saveDB();
  return { success: true };
}

// ==========================================
// CUSTOMER MANAGEMENT & DIGITAL KHATA
// ==========================================
export async function getCustomers(options?: {
  search?: string;
  hasBalance?: boolean;
  isOverdue?: boolean;
  status?: string;
}): Promise<ICustomer[]> {
  const db = ensureDB();
  let list = [...db.customers];

  if (options?.hasBalance) {
    list = list.filter((c) => c.outstandingBalance > 0);
  }
  if (options?.isOverdue) {
    list = list.filter((c) => c.status === "Overdue" || (c.dueDate && new Date(c.dueDate) < new Date() && c.outstandingBalance > 0));
  }
  if (options?.status && options.status !== "All") {
    list = list.filter((c) => c.status === options.status);
  }
  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }

  return list.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
}

export async function getCustomerById(id: string): Promise<ICustomer | null> {
  const db = ensureDB();
  return db.customers.find((c) => c._id === id) || null;
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address?: string;
  openingBalance?: number;
  dueDate?: string;
  notes?: string;
  customFields?: Record<string, any>;
}): Promise<{ success: boolean; customer?: ICustomer; error?: string }> {
  const db = ensureDB();
  const existing = db.customers.find((c) => c.phone.trim() === data.phone.trim());
  if (existing) {
    return { success: false, error: `Customer with phone '${data.phone}' already exists: ${existing.name}.` };
  }

  const opening = Number(data.openingBalance) || 0;
  const newCust: ICustomer = {
    _id: generateId(),
    name: data.name.trim(),
    phone: data.phone.trim(),
    address: data.address,
    openingBalance: opening,
    totalPurchases: 0,
    totalPayments: 0,
    outstandingBalance: opening,
    dueDate: data.dueDate,
    notes: data.notes,
    status: opening > 0 ? "Active" : "Settled",
    customFields: data.customFields || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.customers.push(newCust);

  if (opening > 0) {
    db.ledgerEntries.push({
      _id: generateId(),
      customerId: newCust._id,
      date: new Date().toISOString(),
      type: "OPENING_BALANCE",
      referenceType: "MANUAL",
      description: "Opening Balance Carried Forward",
      debit: opening,
      credit: 0,
      balanceAfter: opening,
      createdAt: new Date().toISOString(),
    });
  }

  saveDB();
  return { success: true, customer: newCust };
}

export async function updateCustomer(id: string, updates: Partial<ICustomer>): Promise<ICustomer | null> {
  const db = ensureDB();
  const index = db.customers.findIndex((c) => c._id === id);
  if (index === -1) return null;

  const current = db.customers[index];
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.customers[index] = updated;
  saveDB();
  return updated;
}

export async function getCustomerLedger(customerId: string): Promise<ICustomerLedgerEntry[]> {
  const db = ensureDB();
  return db.ledgerEntries
    .filter((entry) => entry.customerId === customerId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Receive Khata Payment Against Previous Udhaar
export async function addCustomerPayment(paymentData: {
  customerId: string;
  amount: number;
  paymentMethod: string;
  date?: string;
  reference?: string;
  notes?: string;
  receivedBy?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const db = ensureDB();
  const customer = db.customers.find((c) => c._id === paymentData.customerId);
  if (!customer) return { success: false, error: "Customer not found." };

  const amount = Number(paymentData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  const prevBal = customer.outstandingBalance;
  const newBal = Math.max(0, preciseSubtract(prevBal, amount));

  customer.outstandingBalance = newBal;
  customer.totalPayments = preciseAdd(customer.totalPayments, amount);
  customer.lastPaymentDate = paymentData.date || new Date().toISOString();
  if (newBal === 0) {
    customer.status = "Settled";
  }

  // Immutable Ledger Credit Entry
  db.ledgerEntries.push({
    _id: generateId(),
    customerId: customer._id,
    date: paymentData.date || new Date().toISOString(),
    type: "PAYMENT",
    referenceType: "PAYMENT",
    description: `Khata Payment Received (${paymentData.paymentMethod})`,
    debit: 0,
    credit: amount,
    balanceAfter: newBal,
    notes: paymentData.notes || paymentData.reference,
    createdAt: new Date().toISOString(),
  });

  // Record Payment Transaction
  db.payments.push({
    _id: generateId(),
    paymentNumber: generateInvoiceNumber("REC"),
    type: "CUSTOMER_PAYMENT",
    customerId: customer._id,
    customerName: customer.name,
    amount,
    paymentMethod: paymentData.paymentMethod,
    date: paymentData.date || new Date().toISOString(),
    reference: paymentData.reference,
    notes: paymentData.notes,
    receivedBy: paymentData.receivedBy || "Admin",
    createdAt: new Date().toISOString(),
  });

  saveDB();
  return { success: true, newBalance: newBal };
}

// Manual Debit/Credit Adjustment with Documented Reason
export async function addManualKhataAdjustment(adjustment: {
  customerId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const db = ensureDB();
  const customer = db.customers.find((c) => c._id === adjustment.customerId);
  if (!customer) return { success: false, error: "Customer not found." };

  const amount = Number(adjustment.amount);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Adjustment amount must be positive." };
  }

  let newBal = customer.outstandingBalance;
  let debit = 0;
  let credit = 0;

  if (adjustment.type === "DEBIT") {
    // Increases debt
    debit = amount;
    newBal = preciseAdd(newBal, amount);
    customer.outstandingBalance = newBal;
    customer.status = "Active";
  } else {
    // Decreases debt
    credit = amount;
    newBal = Math.max(0, preciseSubtract(newBal, amount));
    customer.outstandingBalance = newBal;
    if (newBal === 0) customer.status = "Settled";
  }

  db.ledgerEntries.push({
    _id: generateId(),
    customerId: customer._id,
    date: new Date().toISOString(),
    type: "ADJUSTMENT",
    referenceType: "MANUAL",
    description: `Manual Adjustment (${adjustment.type}): ${adjustment.reason}`,
    debit,
    credit,
    balanceAfter: newBal,
    notes: adjustment.notes,
    createdAt: new Date().toISOString(),
  });

  saveDB();
  return { success: true, newBalance: newBal };
}

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================
export async function getExpenses(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<IExpense[]> {
  const db = ensureDB();
  let list = [...db.expenses];

  if (options?.category && options.category !== "All") {
    list = list.filter((e) => e.category === options.category);
  }
  if (options?.startDate) {
    const start = new Date(options.startDate).getTime();
    list = list.filter((e) => new Date(e.date).getTime() >= start);
  }
  if (options?.endDate) {
    const end = new Date(options.endDate).getTime();
    list = list.filter((e) => new Date(e.date).getTime() <= end);
  }

  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createExpense(data: Omit<IExpense, "_id" | "createdAt">): Promise<IExpense> {
  const db = ensureDB();
  const newExp: IExpense = {
    _id: generateId(),
    ...data,
    amount: Number(data.amount) || 0,
    createdAt: new Date().toISOString(),
  };
  db.expenses.push(newExp);
  saveDB();
  return newExp;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = ensureDB();
  db.expenses = db.expenses.filter((e) => e._id !== id);
  saveDB();
  return true;
}

// ==========================================
// FINANCIAL CALCULATIONS & REPORTS
// ==========================================
export async function getFinancialSummary(startDate?: string, endDate?: string): Promise<IFinancialSummary> {
  const db = ensureDB();
  let sales = db.sales.filter((s) => !s.isReturned);
  let expenses = db.expenses;

  if (startDate) {
    const start = new Date(startDate).getTime();
    sales = sales.filter((s) => new Date(s.saleDate).getTime() >= start);
    expenses = expenses.filter((e) => new Date(e.date).getTime() >= start);
  }
  if (endDate) {
    const end = new Date(endDate).getTime();
    sales = sales.filter((s) => new Date(s.saleDate).getTime() <= end);
    expenses = expenses.filter((e) => new Date(e.date).getTime() <= end);
  }

  // 1. Total Sales Revenue
  const totalSales = sales.reduce((sum, s) => preciseAdd(sum, s.totalAmount), 0);
  const totalCashReceived = sales.reduce((sum, s) => preciseAdd(sum, s.paidAmount), 0);
  const totalCreditSales = sales.reduce((sum, s) => preciseAdd(sum, s.remainingAmount), 0);

  // 2. Cost of Goods Sold (COGS)
  let totalCostOfGoodsSold = 0;
  sales.forEach((s) => {
    s.items.forEach((item) => {
      const itemCost = preciseMultiply(item.quantity, item.unitPurchaseCost);
      totalCostOfGoodsSold = preciseAdd(totalCostOfGoodsSold, itemCost);
    });
  });

  // 3. Gross Profit = Sales - COGS
  const grossProfit = preciseSubtract(totalSales, totalCostOfGoodsSold);

  // 4. Operating Expenses
  const totalExpenses = expenses.reduce((sum, e) => preciseAdd(sum, e.amount), 0);

  // 5. Damaged Stock Losses
  let damagedStockLoss = 0;
  db.inventoryMovements
    .filter((m) => m.type === "DAMAGE" || m.type === "LOST")
    .forEach((m) => {
      const prod = db.products.find((p) => p._id === m.productId);
      const cost = prod ? prod.purchasePrice : 0;
      damagedStockLoss = preciseAdd(damagedStockLoss, preciseMultiply(Math.abs(m.quantityChange), cost));
    });

  // 6. Net Profit = Gross Profit - Operating Expenses - Damaged Stock Losses
  const netProfit = preciseSubtract(preciseSubtract(grossProfit, totalExpenses), damagedStockLoss);

  // 7. Balance Sheet Totals
  const totalOutstandingKhata = db.customers.reduce((sum, c) => preciseAdd(sum, c.outstandingBalance), 0);
  const totalSupplierLiabilities = db.suppliers.reduce((sum, s) => preciseAdd(sum, s.outstandingBalance), 0);

  // 8. Inventory Valuation
  let totalInventoryValuationCost = 0;
  let totalInventoryValuationRetail = 0;
  db.products
    .filter((p) => !p.isArchived)
    .forEach((p) => {
      totalInventoryValuationCost = preciseAdd(
        totalInventoryValuationCost,
        preciseMultiply(p.currentStock, p.purchasePrice)
      );
      totalInventoryValuationRetail = preciseAdd(
        totalInventoryValuationRetail,
        preciseMultiply(p.currentStock, p.sellingPrice)
      );
    });

  return {
    totalSales,
    totalCostOfGoodsSold,
    grossProfit,
    totalExpenses,
    damagedStockLoss,
    netProfit,
    totalCashReceived,
    totalCreditSales,
    totalOutstandingKhata,
    totalSupplierLiabilities,
    totalInventoryValuationCost,
    totalInventoryValuationRetail,
  };
}

// Get Dashboard Statistics & Charts Data
export async function getDashboardStats(timeZone = "Asia/Karachi") {
  const db = ensureDB();
  const summary = await getFinancialSummary();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const getDateInTimeZone = (date: Date) => {
    const parts = dateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
  };

  const totalProducts = db.products.filter((p) => !p.isArchived).length;
  const totalStock = db.products.filter((p) => !p.isArchived).reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = db.products.filter((p) => !p.isArchived && p.currentStock > 0 && p.currentStock <= p.minStockAlert).length;
  const outOfStockCount = db.products.filter((p) => !p.isArchived && p.currentStock <= 0).length;

  // Today's Sales
  const todayStr = getDateInTimeZone(new Date());
  const todaySalesList = db.sales.filter(
    (sale) => !sale.isReturned && getDateInTimeZone(new Date(sale.saleDate)) === todayStr
  );
  const todaySales = todaySalesList.reduce((sum, s) => preciseAdd(sum, s.totalAmount), 0);

  // Current Month's Sales
  const currentMonthStr = todayStr.substring(0, 7);
  const monthlySalesList = db.sales.filter(
    (sale) => !sale.isReturned && getDateInTimeZone(new Date(sale.saleDate)).startsWith(currentMonthStr)
  );
  const monthlySales = monthlySalesList.reduce((sum, s) => preciseAdd(sum, s.totalAmount), 0);

  // Total Customer Payments Received (directly through payment records)
  const totalCustomerPaymentsReceived = db.payments
    .filter((p) => p.type === "CUSTOMER_PAYMENT")
    .reduce((sum, p) => preciseAdd(sum, p.amount), 0);

  // Daily Sales Trend (Last 7 Days)
  const last7Days: { date: string; sales: number; profit: number; cash: number; credit: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const todayDate = new Date(`${todayStr}T12:00:00Z`);
    todayDate.setUTCDate(todayDate.getUTCDate() - i);
    const dStr = todayDate.toISOString().slice(0, 10);
    const displayLabel = todayDate.toLocaleDateString("en-PK", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    });

    const daySales = db.sales.filter(
      (sale) => !sale.isReturned && getDateInTimeZone(new Date(sale.saleDate)) === dStr
    );
    const daySalesTotal = daySales.reduce((sum, s) => preciseAdd(sum, s.totalAmount), 0);
    const dayCash = daySales.reduce((sum, s) => preciseAdd(sum, s.paidAmount), 0);
    const dayCredit = daySales.reduce((sum, s) => preciseAdd(sum, s.remainingAmount), 0);

    let dayCOGS = 0;
    daySales.forEach((s) => {
      s.items.forEach((item) => {
        dayCOGS = preciseAdd(dayCOGS, preciseMultiply(item.quantity, item.unitPurchaseCost));
      });
    });
    const dayProfit = preciseSubtract(daySalesTotal, dayCOGS);

    last7Days.push({
      date: displayLabel,
      sales: daySalesTotal,
      profit: dayProfit,
      cash: dayCash,
      credit: dayCredit,
    });
  }

  // Top Selling Products
  const productSalesMap = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  db.sales.filter((s) => !s.isReturned).forEach((s) => {
    s.items.forEach((item) => {
      const existing = productSalesMap.get(item.productId) || {
        name: item.productName,
        sku: item.sku,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue = preciseAdd(existing.revenue, item.total);
      productSalesMap.set(item.productId, existing);
    });
  });

  const topSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Recent Sales
  const recentSales = [...db.sales]
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
    .slice(0, 6);

  // Low Stock Items for Quick Alert
  const lowStockItems = db.products
    .filter((p) => !p.isArchived && p.currentStock <= p.minStockAlert)
    .slice(0, 6);

  return {
    summary,
    totalProducts,
    totalStock,
    lowStockCount,
    outOfStockCount,
    todaySales,
    monthlySales,
    totalCustomerPaymentsReceived,
    last7Days,
    topSellingProducts,
    recentSales,
    lowStockItems,
  };
}

// ==========================================
// DYNAMIC CUSTOM FIELDS
// ==========================================
export async function getCustomFields(entityType?: string): Promise<ICustomFieldDefinition[]> {
  const db = ensureDB();
  let list = db.customFields.filter((cf) => cf.isActive);
  if (entityType) {
    list = list.filter((cf) => cf.entityType === entityType);
  }
  return list.sort((a, b) => a.order - b.order);
}

export async function createCustomField(data: Omit<ICustomFieldDefinition, "_id" | "createdAt">): Promise<ICustomFieldDefinition> {
  const db = ensureDB();
  const newField: ICustomFieldDefinition = {
    _id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  db.customFields.push(newField);
  saveDB();
  return newField;
}

export async function deleteCustomField(id: string): Promise<boolean> {
  const db = ensureDB();
  db.customFields = db.customFields.filter((cf) => cf._id !== id);
  saveDB();
  return true;
}

// ==========================================
// PRODUCT POSTS (SHOWROOM / CATALOG)
// ==========================================
export async function getProductPosts(): Promise<IProductPost[]> {
  const db = ensureDB();
  return [...db.productPosts].sort((a, b) => a.order - b.order);
}

export async function createProductPost(data: Omit<IProductPost, "_id" | "createdAt">): Promise<IProductPost> {
  const db = ensureDB();
  const newPost: IProductPost = {
    _id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  db.productPosts.push(newPost);
  saveDB();
  return newPost;
}

export async function updateProductPost(id: string, updates: Partial<IProductPost>): Promise<IProductPost | null> {
  const db = ensureDB();
  const index = db.productPosts.findIndex((p) => p._id === id);
  if (index === -1) return null;

  db.productPosts[index] = { ...db.productPosts[index], ...updates };
  saveDB();
  return db.productPosts[index];
}

export async function deleteProductPost(id: string): Promise<boolean> {
  const db = ensureDB();
  db.productPosts = db.productPosts.filter((p) => p._id !== id);
  saveDB();
  return true;
}

// ==========================================
// SETTINGS & BACKUP / RESTORE
// ==========================================
export async function getShopSettings(): Promise<IShopSettings> {
  const db = ensureDB();
  db.settings.timeZone ||= "Asia/Karachi";
  db.settings.theme ||= "sky";
  return db.settings;
}

export async function updateShopSettings(updates: Partial<IShopSettings>): Promise<IShopSettings> {
  const db = ensureDB();
  db.settings = {
    ...db.settings,
    ...updates,
    timeZone: updates.timeZone || db.settings.timeZone || "Asia/Karachi",
    theme: updates.theme || db.settings.theme || "sky",
    updatedAt: new Date().toISOString(),
  };
  saveDB();
  return db.settings;
}

export async function exportDatabaseBackup(): Promise<string> {
  const db = ensureDB();
  return JSON.stringify(db, null, 2);
}

export async function restoreDatabaseBackup(jsonData: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = JSON.parse(jsonData);
    if (!parsed.products || !parsed.customers || !parsed.sales) {
      return { success: false, error: "Invalid backup JSON structure. Missing required collections." };
    }
    dbCache = parsed;
    saveDB();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "JSON Parse error: " + err.message };
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================
export async function logAudit(data: {
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = ensureDB();
  const newLog: IAuditLog = {
    _id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500); // keep last 500 logs
  }
  saveDB();
}

export async function getAuditLogs(): Promise<IAuditLog[]> {
  const db = ensureDB();
  return db.auditLogs.slice(0, 100);
}

export async function getInventoryMovements(productId?: string): Promise<IInventoryMovement[]> {
  const db = ensureDB();
  let list = db.inventoryMovements;
  if (productId) {
    list = list.filter((m) => m.productId === productId);
  }
  return [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}
