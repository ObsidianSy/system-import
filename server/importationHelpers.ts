import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { products, stockMovements, importationItems, importations } from "../drizzle/schema";
import { randomBytes } from "crypto";

function generateId() {
  return randomBytes(16).toString("hex");
}

/**
 * Processa a entrada de estoque quando uma importação é marcada como "delivered"
 * Atualiza o estoque e calcula o custo médio ponderado
 */
export async function processImportationDelivery(importationId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    const [importation] = await tx
      .select()
      .from(importations)
      .where(eq(importations.id, importationId))
      .limit(1);

    if (!importation) {
      throw new Error("Importacao nao encontrada");
    }

    const items = await tx
      .select()
      .from(importationItems)
      .where(eq(importationItems.importationId, importationId));

    for (const item of items) {
      if (!item.productId) continue;

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) continue;

      const previousStock = product.currentStock;
      const newStock = previousStock + item.quantity;
      const previousAverageCost = product.averageCostBRL;
      const previousAverageCostUSD = product.averageCostUSD;

      const averageCostBRL = item.unitCostBRL;
      const averageCostUSD = item.unitPriceUSD;

      await tx
        .update(products)
        .set({
          currentStock: newStock,
          averageCostBRL,
          averageCostUSD,
          lastImportUnitPriceUSD: item.unitPriceUSD,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      await tx.insert(stockMovements).values({
        id: generateId(),
        productId: item.productId,
        importationId: importationId,
        movementType: "import",
        quantity: item.quantity,
        previousStock,
        newStock,
        previousAverageCostBRL: previousAverageCost,
        newAverageCostBRL: averageCostBRL,
        previousAverageCostUSD: previousAverageCostUSD,
        newAverageCostUSD: averageCostUSD,
        unitCostBRL: item.unitCostBRL,
        unitCostUSD: item.unitPriceUSD,
        reference: importation.invoiceNumber || `Importacao ${importationId}`,
        notes: `Entrada de estoque - Importacao ${importation.invoiceNumber || importationId}`,
        createdAt: new Date(),
      });
    }
  });
}

/**
 * Reverte a entrada de estoque quando uma importação é desmarcada como "delivered"
 */
export async function revertImportationDelivery(importationId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    const movements = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.importationId, importationId),
          eq(stockMovements.movementType, "import")
        )
      );

    for (const movement of movements) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, movement.productId))
        .limit(1);

      if (!product) continue;

      const newStock = product.currentStock - movement.quantity;
      const restoredAverageCostBRL = movement.previousAverageCostBRL;
      const restoredAverageCostUSD = movement.previousAverageCostUSD;

      await tx
        .update(products)
        .set({
          currentStock: Math.max(0, newStock),
          averageCostBRL: restoredAverageCostBRL,
          averageCostUSD: restoredAverageCostUSD,
          updatedAt: new Date(),
        })
        .where(eq(products.id, movement.productId));

      await tx.insert(stockMovements).values({
        id: generateId(),
        productId: movement.productId,
        importationId: importationId,
        movementType: "adjustment",
        quantity: -movement.quantity,
        previousStock: product.currentStock,
        newStock: Math.max(0, newStock),
        previousAverageCostBRL: product.averageCostBRL,
        newAverageCostBRL: restoredAverageCostBRL,
        previousAverageCostUSD: product.averageCostUSD,
        newAverageCostUSD: restoredAverageCostUSD,
        unitCostBRL: 0,
        unitCostUSD: 0,
        reference: `Reversao de importacao`,
        notes: `Reversao de entrada - Importacao ${importationId}`,
        createdAt: new Date(),
      });
    }
  });
}

/**
 * Vincula um item de importação a um produto existente
 */
export async function linkImportationItemToProduct(
  itemId: string,
  productId: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(importationItems)
    .set({ productId, updatedAt: new Date() })
    .where(eq(importationItems.id, itemId));
}

