import "dotenv/config";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import * as db from "./server/db";

async function importProducts() {
  const csvPath = path.join(process.cwd(), "products_20251111_113707.csv");
  
  console.log(`📂 Reading CSV file: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`📊 Found ${records.length} products to import`);

  let imported = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Converter campos numéricos (CSV tem valores em centavos)
      const product = {
        id: record.id,
        name: record.name,
        description: record.description || null,
        sku: record.sku || null,
        supplierProductCode: record.supplierProductCode || null,
        lastSupplierId: record.lastSupplierId || null,
        ncmCode: record.ncmCode || null,
        category: record.category || null,
        imageUrl: record.imageUrl || null,
        currentStock: parseInt(record.currentStock) || 0,
        minStock: parseInt(record.minStock) || 0,
        averageCostBRL: parseInt(record.averageCostBRL) || 0,
        salePriceBRL: parseInt(record.salePriceBRL) || 0,
      };

      await db.upsertProduct(product);
      imported++;
      console.log(`✅ Imported: ${product.name} (${product.sku})`);
    } catch (error) {
      errors++;
      console.error(`❌ Error importing ${record.name}:`, error);
    }
  }

  console.log(`\n📈 Import completed:`);
  console.log(`   ✅ Success: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${records.length}`);
}

importProducts()
  .then(() => {
    console.log("\n✅ Import finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Import failed:", error);
    process.exit(1);
  });
