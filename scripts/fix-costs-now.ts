import { getDb } from "./server/db";
import { importationItems, importations, products } from "./drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

async function fixCostsNow() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("🔧 CORRIGINDO CUSTOS MÉDIOS...\n");

  // Buscar todos os produtos
  const allProducts = await db.select().from(products);

  for (const product of allProducts) {
    // Buscar a ÚLTIMA importação entregue deste produto (mais recente)
    const [lastImport] = await db
      .select({
        unitCostBRL: importationItems.unitCostBRL,
        unitPriceUSD: importationItems.unitPriceUSD,
        importDate: importations.importDate,
      })
      .from(importationItems)
      .innerJoin(importations, eq(importations.id, importationItems.importationId))
      .where(
        and(
          eq(importationItems.productId, product.id),
          eq(importations.status, "delivered")
        )
      )
      .orderBy(desc(importations.importDate))
      .limit(1);

    if (!lastImport) {
      console.log(`⏭️  ${product.sku || product.name}: Sem importações entregues`);
      continue;
    }

    // Atualizar custo médio = custo da última importação
    await db
      .update(products)
      .set({
        averageCostBRL: lastImport.unitCostBRL,
        averageCostUSD: lastImport.unitPriceUSD,
      })
      .where(eq(products.id, product.id));

    const oldCost = (product.averageCostBRL / 100).toFixed(2);
    const newCost = (lastImport.unitCostBRL / 100).toFixed(2);

    console.log(
      `✅ ${product.sku || product.name}: R$ ${oldCost} → R$ ${newCost}`
    );
  }

  console.log("\n✨ CORREÇÃO COMPLETA!");
  process.exit(0);
}

fixCostsNow().catch(console.error);
