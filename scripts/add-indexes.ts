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

// Definição de todos os índices para otimização
const indexes: IndexDefinition[] = [
  // Products - buscas frequentes por SKU e categoria
  {
    name: 'idx_products_sku',
    table: 'products',
    columns: ['sku'],
    unique: true,
    concurrent: true,
  },
  {
    name: 'idx_products_category',
    table: 'products',
    columns: ['category'],
    concurrent: true,
  },
  {
    name: 'idx_products_category_stock',
    table: 'products',
    columns: ['category', 'current_stock'],
    concurrent: true,
  },
  
  // Importations - filtros por fornecedor e status
  {
    name: 'idx_importations_supplier',
    table: 'importations',
    columns: ['supplier_id'],
    concurrent: true,
  },
  {
    name: 'idx_importations_status',
    table: 'importations',
    columns: ['status'],
    concurrent: true,
  },
  {
    name: 'idx_importations_date',
    table: 'importations',
    columns: ['import_date'],
    concurrent: true,
  },
  
  // ImportationItems - joins frequentes
  {
    name: 'idx_importation_items_importation',
    table: 'importation_items',
    columns: ['importation_id'],
    concurrent: true,
  },
  {
    name: 'idx_importation_items_product',
    table: 'importation_items',
    columns: ['product_id'],
    concurrent: true,
  },
  
  // StockMovements - queries por produto e importação
  {
    name: 'idx_stock_movements_product',
    table: 'stock_movements',
    columns: ['product_id'],
    concurrent: true,
  },
  {
    name: 'idx_stock_movements_importation',
    table: 'stock_movements',
    columns: ['importation_id'],
    concurrent: true,
  },
  {
    name: 'idx_stock_movements_date',
    table: 'stock_movements',
    columns: ['movement_date'],
    concurrent: true,
  },
  
  // Orders - filtros por status e data
  {
    name: 'idx_orders_status',
    table: 'orders',
    columns: ['status'],
    concurrent: true,
  },
  {
    name: 'idx_orders_date',
    table: 'orders',
    columns: ['order_date'],
    concurrent: true,
  },
  
  // OrderItems - joins
  {
    name: 'idx_order_items_order',
    table: 'order_items',
    columns: ['order_id'],
    concurrent: true,
  },
  {
    name: 'idx_order_items_product',
    table: 'order_items',
    columns: ['product_id'],
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
