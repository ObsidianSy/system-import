#!/usr/bin/env tsx
/**
 * Script para adicionar índices de performance no banco de dados
 * Executa: pnpm tsx scripts/add-indexes.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import { logger, logInfo, logError, logWarn } from "../server/_core/logger";

interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  type?: 'btree' | 'hash';
  unique?: boolean;
  concurrent?: boolean;
}

// Definicao de todos os indices para otimizacao
// IMPORTANTE: Nomes de tabelas e colunas usam camelCase conforme definido no Drizzle schema
// PostgreSQL requer aspas duplas para identificadores case-sensitive
const indexes: IndexDefinition[] = [
  // Products - buscas frequentes por SKU e categoria
  {
    name: 'idx_products_sku',
    table: '"products"',
    columns: ['"sku"'],
    unique: true,
    concurrent: true,
  },
  {
    name: 'idx_products_category',
    table: '"products"',
    columns: ['"category"'],
    concurrent: true,
  },
  {
    name: 'idx_products_category_stock',
    table: '"products"',
    columns: ['"category"', '"currentStock"'],
    concurrent: true,
  },

  // Importations - filtros por fornecedor e status
  {
    name: 'idx_importations_supplier',
    table: '"importations"',
    columns: ['"supplierId"'],
    concurrent: true,
  },
  {
    name: 'idx_importations_status',
    table: '"importations"',
    columns: ['"status"'],
    concurrent: true,
  },
  {
    name: 'idx_importations_date',
    table: '"importations"',
    columns: ['"importDate"'],
    concurrent: true,
  },

  // ImportationItems - joins frequentes
  {
    name: 'idx_importation_items_importation',
    table: '"importationItems"',
    columns: ['"importationId"'],
    concurrent: true,
  },
  {
    name: 'idx_importation_items_product',
    table: '"importationItems"',
    columns: ['"productId"'],
    concurrent: true,
  },

  // StockMovements - queries por produto e importacao
  {
    name: 'idx_stock_movements_product',
    table: '"stockMovements"',
    columns: ['"productId"'],
    concurrent: true,
  },
  {
    name: 'idx_stock_movements_importation',
    table: '"stockMovements"',
    columns: ['"importationId"'],
    concurrent: true,
  },
  {
    name: 'idx_stock_movements_date',
    table: '"stockMovements"',
    columns: ['"createdAt"'],
    concurrent: true,
  },

  // Orders - filtros por status e data
  {
    name: 'idx_orders_status',
    table: '"orders"',
    columns: ['"status"'],
    concurrent: true,
  },
  {
    name: 'idx_orders_user',
    table: '"orders"',
    columns: ['"userId"'],
    concurrent: true,
  },

  // OrderItems - joins
  {
    name: 'idx_order_items_order',
    table: '"orderItems"',
    columns: ['"orderId"'],
    concurrent: true,
  },
  {
    name: 'idx_order_items_product',
    table: '"orderItems"',
    columns: ['"productId"'],
    concurrent: true,
  },
];

async function checkIndexExists(db: any, indexName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 
      FROM pg_indexes 
      WHERE indexname = ${indexName}
    `);
    return result.rows.length > 0;
  } catch (error) {
    logWarn(`Erro ao verificar índice ${indexName}`, { error });
    return false;
  }
}

async function createIndex(db: any, index: IndexDefinition): Promise<void> {
  const exists = await checkIndexExists(db, index.name);
  
  if (exists) {
    logInfo(`⏭️  Índice ${index.name} já existe, pulando`);
    return;
  }

  const concurrent = index.concurrent ? 'CONCURRENTLY' : '';
  const unique = index.unique ? 'UNIQUE' : '';
  const columns = index.columns.join(', ');
  const query = sql.raw(`
    CREATE ${unique} INDEX ${concurrent} IF NOT EXISTS ${index.name}
    ON ${index.table} (${columns})
  `);

  try {
    logInfo(`📌 Criando índice: ${index.name} em ${index.table}(${columns})`);
    await db.execute(query);
    logInfo(`✅ Índice ${index.name} criado com sucesso`);
  } catch (error) {
    logError(`❌ Erro ao criar índice ${index.name}`, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function main() {
  logInfo('🚀 Iniciando criação de índices de performance');
  
  try {
    const db = await getDb();
    logInfo(`📊 Total de índices a criar: ${indexes.length}`);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const index of indexes) {
      try {
        const existsBefore = await checkIndexExists(db, index.name);
        await createIndex(db, index);
        const existsAfter = await checkIndexExists(db, index.name);
        
        if (existsBefore) {
          skipped++;
        } else if (existsAfter) {
          created++;
        }
      } catch (error) {
        failed++;
        logError(`Falha ao processar índice ${index.name}`, error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    logInfo('✅ Processo de criação de índices concluído');
    logInfo(`📈 Resumo: ${created} criados, ${skipped} já existiam, ${failed} falharam`);
    
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    logError('💥 Erro fatal ao criar índices', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Executar script
main();
