import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { externalSalesService } from "../services/externalSales";

export const externalRouter = router({
  getStock: protectedProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
      return externalSalesService.getStock(input.sku);
    }),

  getSkuData: protectedProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => {
      return externalSalesService.getSkuData(input.sku);
    }),

  getMultipleSkusStock: protectedProcedure
    .input(z.object({ skus: z.array(z.string()) }))
    .query(async ({ input }) => {
      return externalSalesService.getMultipleSkusStock(input.skus);
    }),

  getMultipleSkusData: protectedProcedure
    .input(z.object({ skus: z.array(z.string()) }))
    .query(async ({ input }) => {
      return externalSalesService.getMultipleSkusData(input.skus);
    }),
});
