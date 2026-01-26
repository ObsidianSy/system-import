import { getDb } from "./server/db";
import { importationItems, importations, products } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function diagnoseCost() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar produto COL-009
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.sku, "COL-009"))
    .limit(1);

  if (!product) {
    console.log("❌ Produto COL-009 não encontrado");
    return;
  }

  console.log("\n📦 PRODUTO:", product.name);
  console.log("   SKU:", product.sku);
  console.log("   Custo Médio Atual (BRL):", (product.averageCostBRL / 100).toFixed(2));
  console.log("   Estoque Atual:", product.currentStock);

  // Buscar TODAS as importações entregues deste produto
  const deliveredImports = await db
    .select({
      importationId: importations.id,
      invoiceNumber: importations.invoiceNumber,
      importDate: importations.importDate,
      status: importations.status,
      unitCostBRL: importationItems.unitCostBRL,
      quantity: importationItems.quantity,
    })
    .from(importationItems)
    .innerJoin(importations, eq(importations.id, importationItems.importationId))
    .where(
      and(
        eq(importationItems.productId, product.id),
        eq(importations.status, "delivered")
      )
    );

  console.log("\n📋 IMPORTAÇÕES ENTREGUES:");
  console.log(`   Total: ${deliveredImports.length}`);
  
  deliveredImports.forEach((imp, index) => {
    console.log(`\n   ${index + 1}. ${imp.invoiceNumber || imp.importationId}`);
    console.log(`      Data: ${new Date(imp.importDate).toLocaleDateString("pt-BR")}`);
    console.log(`      Quantidade: ${imp.quantity}`);
    console.log(`      Custo Unit. BRL: R$ ${(imp.unitCostBRL / 100).toFixed(2)}`);
  });

  // Calcular média
  const costs = deliveredImports.map(i => i.unitCostBRL);
  const average = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;

  console.log("\n🧮 CÁLCULO DA MÉDIA:");
  console.log(`   Custos: ${costs.map(c => `R$ ${(c / 100).toFixed(2)}`).join(", ")}`);
  console.log(`   Média Calculada: R$ ${(average / 100).toFixed(2)}`);
  console.log(`   Média Armazenada: R$ ${(product.averageCostBRL / 100).toFixed(2)}`);
  console.log(`   Diferença: ${average !== product.averageCostBRL ? "❌ INCORRETO" : "✅ CORRETO"}`);

  process.exit(0);
}

diagnoseCost().catch(console.error);
