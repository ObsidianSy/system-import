import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const centsToDecimal = (cents: number) => cents / 100;

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const products = await db.listProducts();
    const importations = await db.listImportations();
    
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const lowStockProducts = products.filter(p => p.currentStock <= (p.minStock ?? 0)).length;
    
    const totalImportations = importations.length;
    const pendingImportations = importations.filter(i => i.status === "pending").length;
    const inTransitImportations = importations.filter(i => i.status === "in_transit").length;
    
    const totalInvestedBRL = importations.reduce((sum, i) => sum + i.totalCostBRL, 0);

    // Monthly Importations (Last 6 months)
    const monthlyImportations = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyImportations.set(key, 0);
    }

    importations.forEach(imp => {
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

    // Top Products by Stock Value
    const topProductsByStockValue = products
      .map(p => ({
        name: p.name,
        value: centsToDecimal(p.currentStock * p.averageCostBRL)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return {
      totalProducts,
      totalStock,
      lowStockProducts,
      totalImportations,
      pendingImportations,
      inTransitImportations,
      totalInvestedBRL: centsToDecimal(totalInvestedBRL),
      monthlyStats,
      topProductsByStockValue
    };
  }),
});
