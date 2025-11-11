import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, 
  users, 
  suppliers, 
  InsertSupplier,
  Supplier,
  products,
  InsertProduct,
  Product,
  importations,
  InsertImportation,
  Importation,
  importationItems,
  InsertImportationItem,
  ImportationItem,
  stockMovements,
  InsertStockMovement,
  StockMovement,
  taxConfig,
  InsertTaxConfig,
  TaxConfig
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    if (!ENV.databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    try {
      console.log("[Database] Connecting to PostgreSQL...");
      const client = postgres(ENV.databaseUrl);
      _db = drizzle(client);
      console.log("[Database] ✓ Connected successfully");
    } catch (error) {
      console.error("[Database] ✗ Failed to connect:", error);
      throw error;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: Partial<InsertUser> = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    // Default role is 'user' unless explicitly specified
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL upsert syntax - cast values to any to bypass strict type checking
    await db.insert(users).values(values as any).onConflictDoUpdate({
      target: users.id,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values(user);
  const result = await db.select().from(users).where(eq(users.id, user.id!)).limit(1);
  return result[0];
}

export async function updateUser(id: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, id));
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

// ========== Suppliers ==========

export async function createSupplier(supplier: InsertSupplier): Promise<Supplier> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(suppliers).values(supplier);
  const result = await db.select().from(suppliers).where(eq(suppliers.id, supplier.id!)).limit(1);
  return result[0]!;
}

export async function updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0]!;
}

export async function deleteSupplier(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(suppliers).where(eq(suppliers.id, id));
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function listSuppliers(): Promise<Supplier[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
}

// ========== Products ==========

export async function upsertProduct(product: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to get existing product
  const existing = await db.select().from(products).where(eq(products.id, product.id!)).limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db.update(products).set({ ...product, updatedAt: new Date() }).where(eq(products.id, product.id!));
  } else {
    // Insert new
    await db.insert(products).values(product);
  }
  
  const result = await db.select().from(products).where(eq(products.id, product.id!)).limit(1);
  return result[0]!;
}

export async function createProduct(product: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(products).values(product);
  const result = await db.select().from(products).where(eq(products.id, product.id!)).limit(1);
  return result[0]!;
}

export async function updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(data).where(eq(products.id, id));
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0]!;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(products).where(eq(products.id, id));
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products).orderBy(products.sku);
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result[0];
}

// ========== Importations ==========

export async function createImportation(importation: InsertImportation): Promise<Importation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(importations).values(importation);
  const result = await db.select().from(importations).where(eq(importations.id, importation.id!)).limit(1);
  return result[0]!;
}

export async function updateImportation(id: string, data: Partial<InsertImportation>): Promise<Importation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(importations).set(data).where(eq(importations.id, id));
  const result = await db.select().from(importations).where(eq(importations.id, id)).limit(1);
  return result[0]!;
}

export async function deleteImportation(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete items first
  await db.delete(importationItems).where(eq(importationItems.importationId, id));
  // Then delete importation
  await db.delete(importations).where(eq(importations.id, id));
}

export async function getImportation(id: string): Promise<Importation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(importations).where(eq(importations.id, id)).limit(1);
  return result[0];
}

export async function listImportations(): Promise<Importation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(importations).orderBy(desc(importations.importDate));
}

// ========== Importation Items ==========

export async function createImportationItem(item: InsertImportationItem): Promise<ImportationItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(importationItems).values(item);
  const result = await db.select().from(importationItems).where(eq(importationItems.id, item.id!)).limit(1);
  return result[0]!;
}

export async function updateImportationItem(id: string, data: Partial<InsertImportationItem>): Promise<ImportationItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(importationItems).set(data).where(eq(importationItems.id, id));
  const result = await db.select().from(importationItems).where(eq(importationItems.id, id)).limit(1);
  return result[0]!;
}

export async function deleteImportationItem(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(importationItems).where(eq(importationItems.id, id));
}

export async function getImportationItems(importationId: string): Promise<ImportationItem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(importationItems).where(eq(importationItems.importationId, importationId));
}

// ========== Stock Movements ==========

export async function createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(stockMovements).values(movement);
  const result = await db.select().from(stockMovements).where(eq(stockMovements.id, movement.id!)).limit(1);
  return result[0]!;
}

export async function getProductStockMovements(productId: string): Promise<StockMovement[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt));
}

export async function getImportationStockMovements(importationId: string): Promise<StockMovement[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(stockMovements)
    .where(eq(stockMovements.importationId, importationId))
    .orderBy(desc(stockMovements.createdAt));
}

// ========== Tax Config ==========

export async function createTaxConfig(config: InsertTaxConfig): Promise<TaxConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(taxConfig).values(config);
  const result = await db.select().from(taxConfig).where(eq(taxConfig.id, config.id!)).limit(1);
  return result[0]!;
}

export async function updateTaxConfig(id: string, data: Partial<InsertTaxConfig>): Promise<TaxConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(taxConfig).set(data).where(eq(taxConfig.id, id));
  const result = await db.select().from(taxConfig).where(eq(taxConfig.id, id)).limit(1);
  return result[0]!;
}

export async function getActiveTaxConfig(): Promise<TaxConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(taxConfig)
    .where(eq(taxConfig.isActive, true))
    .orderBy(desc(taxConfig.createdAt))
    .limit(1);
  return result[0];
}

export async function listTaxConfigs(): Promise<TaxConfig[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(taxConfig).orderBy(desc(taxConfig.createdAt));
}

