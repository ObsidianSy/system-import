import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"), // bcrypt hash
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // Permissões
  canViewCostUSD: boolean("canViewCostUSD").default(false).notNull(),
  canViewCostBRL: boolean("canViewCostBRL").default(false).notNull(),
  canViewImportTaxes: boolean("canViewImportTaxes").default(false).notNull(),
  canEditProducts: boolean("canEditProducts").default(false).notNull(),
  canEditImportations: boolean("canEditImportations").default(false).notNull(),
  canManageUsers: boolean("canManageUsers").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Suppliers/Exporters table
 */
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("companyName"),
  address: text("address"),
  country: text("country"),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  contactPerson: text("contactPerson"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Products table - stores product master data
 */
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  supplierProductCode: text("supplierProductCode"),
  lastSupplierId: text("lastSupplierId"),
  ncmCode: text("ncmCode"),
  category: text("category"),
  imageUrl: text("imageUrl"),
  currentStock: integer("currentStock").default(0).notNull(),
  minStock: integer("minStock").default(0),
  averageCostBRL: integer("averageCostBRL").default(0).notNull(),
  averageCostUSD: integer("averageCostUSD").default(0).notNull(),
  salePriceBRL: integer("salePriceBRL").default(0).notNull(),
  lastImportUnitPriceUSD: integer("lastImportUnitPriceUSD").default(0).notNull(),
  advertisedChannels: text("advertisedChannels").array().default([]).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Importations table - main import records
 */
export const importations = pgTable("importations", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoiceNumber"),
  supplierId: text("supplierId").notNull(),
  importDate: timestamp("importDate").notNull(),
  status: text("status", { enum: ["pending", "in_transit", "customs", "delivered", "cancelled"] }).default("pending").notNull(),
  
  exchangeRate: integer("exchangeRate").notNull(),
  
  subtotalUSD: integer("subtotalUSD").notNull(),
  freightUSD: integer("freightUSD").notNull(),
  totalUSD: integer("totalUSD").notNull(),
  
  subtotalBRL: integer("subtotalBRL").notNull(),
  freightBRL: integer("freightBRL").notNull(),
  importTax: integer("importTax").notNull(),
  icms: integer("icms").notNull(),
  otherTaxes: integer("otherTaxes").default(0).notNull(),
  totalCostBRL: integer("totalCostBRL").notNull(),
  
  shippingMethod: text("shippingMethod"),
  trackingNumber: text("trackingNumber"),
  estimatedDelivery: timestamp("estimatedDelivery"),
  actualDelivery: timestamp("actualDelivery"),
  
  transactionNumber: text("transactionNumber"),
  paymentMethod: text("paymentMethod"),
  
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Importation = typeof importations.$inferSelect;
export type InsertImportation = typeof importations.$inferInsert;

/**
 * Importation items - individual products in each import
 */
export const importationItems = pgTable("importationItems", {
  id: text("id").primaryKey(),
  importationId: text("importationId").notNull(),
  productId: text("productId"),
  
  productName: text("productName").notNull(),
  productDescription: text("productDescription"),
  supplierProductCode: text("supplierProductCode"),
  color: text("color"),
  size: text("size"),
  
  quantity: integer("quantity").notNull(),
  
  unitPriceUSD: integer("unitPriceUSD").notNull(),
  totalUSD: integer("totalUSD").notNull(),
  
  unitCostBRL: integer("unitCostBRL").notNull(),
  totalCostBRL: integer("totalCostBRL").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type ImportationItem = typeof importationItems.$inferSelect;
export type InsertImportationItem = typeof importationItems.$inferInsert;

/**
 * Orders - temporary store for purchase orders
 */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  supplierId: text("supplierId").notNull(),
  status: text("status", { enum: ["pending", "imported"] }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("orderItems", {
  id: text("id").primaryKey(),
  orderId: text("orderId").notNull(),
  productId: text("productId"),

  productName: text("productName").notNull(),
  sku: text("sku"),
  imageUrl: text("imageUrl"),

  quantity: integer("quantity").notNull(),
  unitPriceUSD: integer("unitPriceUSD").notNull(),
  subtotalUSD: integer("subtotalUSD").notNull(),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Stock movements - track all stock changes
 */
export const stockMovements = pgTable("stockMovements", {
  id: text("id").primaryKey(),
  productId: text("productId").notNull(),
  importationId: text("importationId"),
  
  movementType: text("movementType", { enum: ["import", "sale", "adjustment", "return"] }).notNull(),
  quantity: integer("quantity").notNull(),
  
  previousStock: integer("previousStock").notNull(),
  newStock: integer("newStock").notNull(),
  
  // Custo médio antes e depois da movimentação
  previousAverageCostBRL: integer("previousAverageCostBRL").default(0).notNull(),
  newAverageCostBRL: integer("newAverageCostBRL").default(0).notNull(),
  
  previousAverageCostUSD: integer("previousAverageCostUSD").default(0).notNull(),
  newAverageCostUSD: integer("newAverageCostUSD").default(0).notNull(),
  
  // Custo unitário desta movimentação específica (em BRL, centavos)
  unitCostBRL: integer("unitCostBRL").default(0).notNull(),
  unitCostUSD: integer("unitCostUSD").default(0).notNull(),
  
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

/**
 * Tax configuration - store tax rates and settings
 */
export const taxConfig = pgTable("taxConfig", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  importTaxRate: integer("importTaxRate").notNull(),
  icmsRate: integer("icmsRate").notNull(),
  
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type TaxConfig = typeof taxConfig.$inferSelect;
export type InsertTaxConfig = typeof taxConfig.$inferInsert;

