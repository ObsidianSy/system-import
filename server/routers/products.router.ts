import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";
import { promises as fs } from "fs";
import path from "path";

const generateId = () => randomBytes(16).toString("hex");

export const productsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.listProducts();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.getProduct(input.id);
    }),

  lastImportPrice: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      const price = await db.getLastImportedUnitPrice(input.productId);
      return price; // unitPriceUSD in cents
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      sku: z.string().optional(),
      ncmCode: z.string().optional(),
      category: z.string().optional(),
      imageUrl: z.string().optional(),
      currentStock: z.number().default(0),
      minStock: z.number().default(0),
      averageCostUSD: z.number().default(0),
      lastImportUnitPriceUSD: z.number().default(0),
      advertisedChannels: z.array(z.string()).default([]),
    }))
    .mutation(async ({ input }) => {
      return db.createProduct({
        id: generateId(),
        ...input,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      sku: z.string().optional(),
      supplierProductCode: z.string().optional(),
      ncmCode: z.string().optional(),
      category: z.string().optional(),
      imageUrl: z.string().optional(),
      currentStock: z.number().optional(),
      minStock: z.number().optional(),
      salePriceBRL: z.number().optional(),
      averageCostBRL: z.number().optional(),
      averageCostUSD: z.number().optional(),
      lastImportUnitPriceUSD: z.number().optional(),
      advertisedChannels: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      
      // Removed automatic price update logic to prevent unwanted changes
      // if (data.averageCostBRL !== undefined && data.salePriceBRL === undefined) {
      //   data.salePriceBRL = data.averageCostBRL + 500; // +R$ 5,00 (500 centavos)
      // }
      
      return db.updateProduct(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.deleteProduct(input.id);
      return { success: true };
    }),

  uploadImage: protectedProcedure
    .input(z.object({
      productId: z.string(),
      imageData: z.string(), // Base64 encoded image
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), "uploads", "products");
        await fs.mkdir(uploadsDir, { recursive: true });

        const timestamp = Date.now();
        const extension = input.mimeType.split("/")[1] || "jpg";
        const filename = `${input.productId}-${timestamp}.${extension}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Decode base64
        const buffer = Buffer.from(input.imageData, 'base64');
        
        // Write file
        await fs.writeFile(filePath, buffer);
        
        const url = `/uploads/products/${filename}`;
        
        await db.updateProduct(input.productId, { imageUrl: url });
        
        return { url };
      } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Failed to upload image");
      }
    }),
});
