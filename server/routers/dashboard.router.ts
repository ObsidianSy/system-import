import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { products, importations } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

import { centsToDecimal } from "../../shared/utils/currency";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const db = await getDb();

    // Run aggregation queries in parallel instead of loading all rows
    const [productStats, importationStats, topProducts] = await Promise.all([
      // Product aggregates in a single query
      db
        .select({
          totalProducts: sql<number>`COUNT(*)`,
          totalStock: sql<number>`COALESCE(SUM(${products.currentStock}), 0)`,
          lowStockProducts: sql<number>`COUNT(*) FILTER (WHERE ${products.currentStock} <= COALESCE(${products.minStock}, 0))`,
        })
        .from(products)
        .then(rows => rows[0]),

      // Importation aggregates in a single query
      db
        .select({
          totalImportations: sql<number>`COUNT(*)`,
          pendingImportations: sql<number>`COUNT(*) FILTER (WHERE ${importations.status} = 'pending')`,
          inTransitImportations: sql<number>`COUNT(*) FILTER (WHERE ${importations.status} = 'in_transit')`,
          totalInvestedBRL: sql<number>`COALESCE(SUM(${importations.totalCostBRL}), 0)`,
        })
        .from(importations)
        .then(rows => rows[0]),

      // Top products by stock value
      db
        .select({
          name: products.name,
          value: sql<number>`(${products.currentStock} * ${products.averageCostBRL})`,
        })
        .from(products)
        .where(sql`${products.currentStock} > 0 AND ${products.averageCostBRL} > 0`)
        .orderBy(sql`${products.currentStock} * ${products.averageCostBRL} DESC`)
        .limit(5),
    ]);

    // Monthly stats: still need importations list for date grouping
    // but only select the fields we need
    const recentImportations = await db
      .select({
        importDate: importations.importDate,
        totalCostBRL: importations.totalCostBRL,
      })
      .from(importations);

    const monthlyImportations = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyImportations.set(key, 0);
    }

    recentImportations.forEach(imp => {
      const d = new Date(imp.importDate);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (monthlyImportations.has(key)) {
        monthlyImportations.set(key, (monthlyImportations.get(key) || 0) + imp.totalCostBRL);
      }
    });

    const monthlyStats = Array.from(monthlyImportations.entries()).map(([month, total]) => ({
      month,
      total: centsToDecimal(total)
    }));

    const topProductsByStockValue = topProducts.map(p => ({
      name: p.name,
      value: centsToDecimal(Number(p.value)),
    }));

    return {
      totalProducts: Number(productStats.totalProducts),
      totalStock: Number(productStats.totalStock),
      lowStockProducts: Number(productStats.lowStockProducts),
      totalImportations: Number(importationStats.totalImportations),
      pendingImportations: Number(importationStats.pendingImportations),
      inTransitImportations: Number(importationStats.inTransitImportations),
      totalInvestedBRL: centsToDecimal(Number(importationStats.totalInvestedBRL)),
      monthlyStats,
      topProductsByStockValue,
    };
  }),
});
