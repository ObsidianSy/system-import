import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";

const generateId = () => randomBytes(16).toString("hex");

export const ordersRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id as string;
    const order = await db.getOrCreatePendingOrder(userId);
    const items = await db.getOrderItems(order.id);
    return { order, items };
  }),

  addItem: protectedProcedure
    .input(z.object({ orderId: z.string(), productId: z.string().optional(), quantity: z.number().optional(), unitPriceUSD: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const itemId = generateId();
      const { productId, quantity = 1, unitPriceUSD = 0 } = input;
      const product = productId ? await db.getProduct(productId) : undefined;
      const subtotal = Math.round(quantity * unitPriceUSD);
      await db.addOrderItem({
        id: itemId,
        orderId: input.orderId,
        productId: productId || null,
        productName: product?.name || "",
        sku: product?.sku || null,
        imageUrl: product?.imageUrl || null,
        quantity,
        unitPriceUSD: Math.round(unitPriceUSD),
        subtotalUSD: subtotal,
      } as any);
      return { success: true, itemId };
    }),

  updateItem: protectedProcedure
    .input(z.object({ id: z.string(), quantity: z.number().optional(), unitPriceUSD: z.number().optional() }))
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.quantity !== undefined) data.quantity = input.quantity;
      if (input.unitPriceUSD !== undefined) data.unitPriceUSD = Math.round(input.unitPriceUSD);
      if (data.quantity !== undefined && data.unitPriceUSD !== undefined) data.subtotalUSD = Math.round(data.quantity as number * (data.unitPriceUSD as number));
      await db.updateOrderItem(input.id, data);
      return { success: true };
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.deleteOrderItem(input.id);
      return { success: true };
    }),

  clear: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      await db.clearOrder(input.orderId);
      return { success: true };
    }),

  setSupplier: protectedProcedure
    .input(z.object({ orderId: z.string(), supplierId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const supplierId = input.supplierId || null;
      await db.updateOrder(input.orderId, { supplierId: supplierId as any });
      return { success: true };
    }),

  import: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input }) => {
      const imported = await db.importOrderToImportation(input.orderId);
      return { success: true, importationId: imported.id };
    }),
});
