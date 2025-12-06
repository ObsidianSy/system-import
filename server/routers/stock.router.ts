import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";

const generateId = () => randomBytes(16).toString("hex");

export const stockRouter = router({
  movements: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      return db.getProductStockMovements(input.productId);
    }),

  adjust: protectedProcedure
    .input(z.object({
      productId: z.string(),
      quantity: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const product = await db.getProduct(input.productId);
      if (!product) throw new Error("Product not found");
      
      const newStock = product.currentStock + input.quantity;
      await db.updateProduct(input.productId, { currentStock: newStock });
      
      await db.createStockMovement({
        id: generateId(),
        productId: input.productId,
        movementType: "adjustment",
        quantity: input.quantity,
        previousStock: product.currentStock,
        newStock,
        notes: input.notes,
      });
      
      return { success: true, newStock };
    }),
});
