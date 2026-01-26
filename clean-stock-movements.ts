import { getDb } from "./server/db";
import { stockMovements, products } from "./drizzle/schema";

async function cleanStockMovements() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log("🧹 LIMPANDO MOVIMENTAÇÕES DE ESTOQUE E RESETANDO CUSTOS...\n");

  // 1. Deletar TODOS os movimentos de estoque
  const deleted = await db.delete(stockMovements);
  console.log(`✅ Deletados todos os movimentos de estoque`);

  // 2. Resetar custos médios de todos os produtos para 0
  await db.update(products).set({
    averageCostBRL: 0,
    averageCostUSD: 0,
  });
  console.log(`✅ Resetados todos os custos médios para 0`);

  console.log("\n✨ LIMPEZA COMPLETA!");
  console.log("⚠️  Agora você precisa:");
  console.log("   1. Ir em cada importação");
  console.log("   2. Mudar o status para algo diferente de 'delivered'");
  console.log("   3. Mudar de volta para 'delivered'");
  console.log("   4. Isso vai recalcular tudo do zero!\n");

  process.exit(0);
}

cleanStockMovements().catch(console.error);
