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

  // Buscar a importação
  const [importation] = await db
    .select()
    .from(importations)
    .where(eq(importations.id, importationId))
    .limit(1);

  if (!importation) {
    throw new Error("Importação não encontrada");
  }

  // Buscar os itens da importação
  const items = await db
    .select()
    .from(importationItems)
    .where(eq(importationItems.importationId, importationId));

  // Processar cada item
  for (const item of items) {
    if (!item.productId) continue; // Pular itens sem produto vinculado

    // Buscar o produto atual
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!product) continue;

    const previousStock = product.currentStock;
    const newStock = previousStock + item.quantity;
    const previousAverageCost = product.averageCostBRL;
    const previousAverageCostUSD = product.averageCostUSD;

    // Calcular custo médio ponderado (BRL)
    // Fórmula: ((estoque_anterior * custo_médio_anterior) + (quantidade_nova * custo_novo)) / estoque_total
    const previousTotalCost = previousStock * product.averageCostBRL;
    const newTotalCost = item.quantity * item.unitCostBRL;
    const averageCostBRL = newStock > 0 
      ? Math.round((previousTotalCost + newTotalCost) / newStock)
      : item.unitCostBRL;

    // Calcular custo médio ponderado (USD)
    const previousTotalCostUSD = previousStock * product.averageCostUSD;
    const newTotalCostUSD = item.quantity * item.unitPriceUSD;
    const averageCostUSD = newStock > 0
      ? Math.round((previousTotalCostUSD + newTotalCostUSD) / newStock)
      : item.unitPriceUSD;

    // Atualizar o produto
    await db
      .update(products)
      .set({
        currentStock: newStock,
        averageCostBRL,
        averageCostUSD,
        lastImportUnitPriceUSD: item.unitPriceUSD,
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.productId));

    // Registrar movimentação de estoque com histórico de custo médio
    await db.insert(stockMovements).values({
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
      reference: importation.invoiceNumber || `Importação ${importationId}`,
      notes: `Entrada de estoque - Importação ${importation.invoiceNumber || importationId}`,
      createdAt: new Date(),
    });
  }
}

/**
 * Reverte a entrada de estoque quando uma importação é desmarcada como "delivered"
 */
export async function revertImportationDelivery(importationId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar movimentações relacionadas a esta importação
  const movements = await db
    .select()
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.importationId, importationId),
        eq(stockMovements.movementType, "import")
      )
    );

  // Reverter cada movimentação
  for (const movement of movements) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, movement.productId))
      .limit(1);

    if (!product) continue;

    const newStock = product.currentStock - movement.quantity;
    
    // Restore previous average costs from the movement record
    const restoredAverageCostBRL = movement.previousAverageCostBRL;
    const restoredAverageCostUSD = movement.previousAverageCostUSD;

    // Recalcular custo médio (voltar ao custo anterior se possível)
    await db
      .update(products)
      .set({
        currentStock: Math.max(0, newStock),
        averageCostBRL: restoredAverageCostBRL,
        averageCostUSD: restoredAverageCostUSD,
        updatedAt: new Date(),
      })
      .where(eq(products.id, movement.productId));

    // Registrar movimentação de ajuste
    await db.insert(stockMovements).values({
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
      reference: `Reversão de importação`,
      notes: `Reversão de entrada - Importação ${importationId}`,
      createdAt: new Date(),
    });
  }
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

