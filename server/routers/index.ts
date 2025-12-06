import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { authRouter } from "./auth.router";
import { usersRouter } from "./users.router";
import { suppliersRouter } from "./suppliers.router";
import { productsRouter } from "./products.router";
import { ordersRouter } from "./orders.router";
import { importationsRouter } from "./importations.router";
import { stockRouter } from "./stock.router";
import { dashboardRouter } from "./dashboard.router";
import { externalRouter } from "./external.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  suppliers: suppliersRouter,
  products: productsRouter,
  orders: ordersRouter,
  importations: importationsRouter,
  stock: stockRouter,
  dashboard: dashboardRouter,
  external: externalRouter,
});

export type AppRouter = typeof appRouter;
