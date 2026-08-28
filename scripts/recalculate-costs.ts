import { getDb } from "./server/db";
import { importationItems, importations, products } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function recalculateAllCosts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("🔄 RECALCULANDO CUSTOS MÉDIOS...\n");

  // Buscar todos os produtos
  const allProducts = await db.select().from(products);

  for (const product of allProducts) {
    // Buscar TODAS as importações entregues deste produto
    const deliveredImports = await db
      .select({
        unitCostBRL: importationItems.unitCostBRL,
        unitPriceUSD: importationItems.unitPriceUSD,
      })
      .from(importationItems)
      .innerJoin(importations, eq(importations.id, importationItems.importationId))
      .where(
        and(
          eq(importationItems.productId, product.id),
          eq(importations.status, "delivered")
        )
      );

    if (deliveredImports.length === 0) {
      console.log(`⏭️  ${product.sku || product.name}: Sem importações entregues`);
      continue;
    }

    // Filtrar custos válidos (> 0)
    const validCostsBRL = deliveredImports.map(i => i.unitCostBRL).filter(c => c > 0);
    const validCostsUSD = deliveredImports.map(i => i.unitPriceUSD).filter(c => c > 0);

    if (validCostsBRL.length === 0) {
      console.log(`⚠️  ${product.sku || product.name}: Sem custos válidos`);
      continue;
    }

    // Calcular média simples
    const averageCostBRL = Math.round(
      validCostsBRL.reduce((sum, cost) => sum + cost, 0) / validCostsBRL.length
    );

    const averageCostUSD = Math.round(
      validCostsUSD.reduce((sum, cost) => sum + cost, 0) / validCostsUSD.length
    );

    // Atualizar produto
    await db
      .update(products)
      .set({
        averageCostBRL,
        averageCostUSD,
      })
      .where(eq(products.id, product.id));

    const oldCostBRL = product.averageCostBRL / 100;
    const newCostBRL = averageCostBRL / 100;

    console.log(
      `✅ ${product.sku || product.name}: ` +
      `R$ ${oldCostBRL.toFixed(2)} → R$ ${newCostBRL.toFixed(2)} ` +
      `(${validCostsBRL.length} importações)`
    );
  }

  console.log("\n✨ RECÁLCULO COMPLETO!");
  process.exit(0);
}

recalculateAllCosts().catch(console.error);
