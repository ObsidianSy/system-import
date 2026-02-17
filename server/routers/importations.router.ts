import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";

import { centsToDecimal, decimalToCents } from "../../shared/utils/currency";

const generateId = () => randomBytes(16).toString("hex");

export const importationsRouter = router({
  list: protectedProcedure.query(async () => {
    const [imports, allItems] = await Promise.all([
      db.listImportations(),
      db.getAllImportationItems(),
    ]);

    // Group items by importationId in a single pass (2 queries instead of N+1)
    const itemsByImportation = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const existing = itemsByImportation.get(item.importationId);
      if (existing) {
        existing.push(item);
      } else {
        itemsByImportation.set(item.importationId, [item]);
      }
    }

    return imports.map((imp) => {
      const items = itemsByImportation.get(imp.id) || [];
      return {
        ...imp,
        items: items.map(item => ({
          ...item,
          unitPriceUSD: centsToDecimal(item.unitPriceUSD),
          totalUSD: centsToDecimal(item.totalUSD),
          unitCostBRL: centsToDecimal(item.unitCostBRL),
          totalCostBRL: centsToDecimal(item.totalCostBRL),
        })),
        exchangeRate: centsToDecimal(imp.exchangeRate),
        subtotalUSD: centsToDecimal(imp.subtotalUSD),
        freightUSD: centsToDecimal(imp.freightUSD),
        totalUSD: centsToDecimal(imp.totalUSD),
        subtotalBRL: centsToDecimal(imp.subtotalBRL),
        freightBRL: centsToDecimal(imp.freightBRL),
        importTax: centsToDecimal(imp.importTax),
        icms: centsToDecimal(imp.icms),
        otherTaxes: centsToDecimal(imp.otherTaxes),
        totalCostBRL: centsToDecimal(imp.totalCostBRL),
      };
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const importation = await db.getImportation(input.id);
      if (!importation) return null;
      
      const items = await db.getImportationItems(input.id);
      const supplier = await db.getSupplier(importation.supplierId);
      
      return {
        ...importation,
        exchangeRate: centsToDecimal(importation.exchangeRate),
        subtotalUSD: centsToDecimal(importation.subtotalUSD),
        freightUSD: centsToDecimal(importation.freightUSD),
        totalUSD: centsToDecimal(importation.totalUSD),
        subtotalBRL: centsToDecimal(importation.subtotalBRL),
        freightBRL: centsToDecimal(importation.freightBRL),
        importTax: centsToDecimal(importation.importTax),
        icms: centsToDecimal(importation.icms),
        otherTaxes: centsToDecimal(importation.otherTaxes),
        totalCostBRL: centsToDecimal(importation.totalCostBRL),
        supplier,
        items: items.map(item => ({
          ...item,
          unitPriceUSD: centsToDecimal(item.unitPriceUSD),
          totalUSD: centsToDecimal(item.totalUSD),
          unitCostBRL: centsToDecimal(item.unitCostBRL),
          totalCostBRL: centsToDecimal(item.totalCostBRL),
        })),
      };
    }),

  create: protectedProcedure
    .input(z.object({
      invoiceNumber: z.string().optional(),
      supplierId: z.string(),
      importDate: z.date(),
      status: z.enum(["pending", "in_transit", "customs", "delivered", "cancelled"]).default("pending"),
      exchangeRate: z.number().positive(),
      subtotalUSD: z.number().min(0),
      freightUSD: z.number().min(0),
      importTaxRate: z.number().min(0).max(100),
      icmsRate: z.number().min(0).max(100),
      otherTaxes: z.number().min(0).default(0),
      shippingMethod: z.string().optional(),
      trackingNumber: z.string().optional(),
      estimatedDelivery: z.date().optional(),
      transactionNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string().optional(),
        productName: z.string(),
        productDescription: z.string().optional(),
        color: z.string().optional(),
        size: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPriceUSD: z.number().min(0),
      })),
    }))
    .mutation(async ({ input }) => {
      const { items, importTaxRate, icmsRate, ...importData } = input;
      
      // Calculate totals
      const totalUSD = importData.subtotalUSD + importData.freightUSD;
      const subtotalBRL = importData.subtotalUSD * importData.exchangeRate;
      const freightBRL = importData.freightUSD * importData.exchangeRate;
      const totalBeforeTaxBRL = totalUSD * importData.exchangeRate;
      
      // Calculate taxes
      const importTax = totalBeforeTaxBRL * (importTaxRate / 100);
      const icms = totalBeforeTaxBRL * (icmsRate / 100);
      const totalCostBRL = totalBeforeTaxBRL + importTax + icms + importData.otherTaxes;
      
      // Create importation
      const importationId = generateId();
      const importation = await db.createImportation({
        id: importationId,
        ...importData,
        totalUSD: decimalToCents(totalUSD),
        subtotalUSD: decimalToCents(importData.subtotalUSD),
        freightUSD: decimalToCents(importData.freightUSD),
        subtotalBRL: decimalToCents(subtotalBRL),
        freightBRL: decimalToCents(freightBRL),
        importTax: decimalToCents(importTax),
        icms: decimalToCents(icms),
        otherTaxes: decimalToCents(importData.otherTaxes),
        totalCostBRL: decimalToCents(totalCostBRL),
        exchangeRate: decimalToCents(importData.exchangeRate),
      });
      
      // Calculate cost per item
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Create items
      for (const item of items) {
        const itemTotalUSD = item.unitPriceUSD * item.quantity;
        const itemProportion = itemTotalUSD / importData.subtotalUSD;
        
        // Proportional costs
        const itemFreightBRL = freightBRL * itemProportion;
        const itemImportTax = importTax * itemProportion;
        const itemIcms = icms * itemProportion;
        const itemOtherTaxes = importData.otherTaxes * itemProportion;
        
        const itemTotalCostBRL = (itemTotalUSD * importData.exchangeRate) + 
                                  itemFreightBRL + itemImportTax + itemIcms + itemOtherTaxes;
        const unitCostBRL = itemTotalCostBRL / item.quantity;
        
        await db.createImportationItem({
          id: generateId(),
          importationId,
          productId: item.productId,
          productName: item.productName,
          productDescription: item.productDescription,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unitPriceUSD: decimalToCents(item.unitPriceUSD),
          totalUSD: decimalToCents(itemTotalUSD),
          unitCostBRL: decimalToCents(unitCostBRL),
          totalCostBRL: decimalToCents(itemTotalCostBRL),
        });
        // Nota: O estoque só será atualizado quando o status mudar para "delivered"
      }
      
      return importation;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "in_transit", "customs", "delivered", "cancelled"]).optional(),
      actualDelivery: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, status, ...data } = input;
      
      // Buscar importação atual para verificar mudança de status
      const currentImportation = await db.getImportation(id);
      if (!currentImportation) throw new Error("Importação não encontrada");
      
      // Se mudou para "delivered", processar entrada de estoque
      if (status === "delivered" && currentImportation.status !== "delivered") {
        try {
          const { processImportationDelivery } = await import("../importationHelpers");
          await processImportationDelivery(id);
        } catch (error) {
          throw new Error(`Falha ao processar entrega: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (!data.actualDelivery) {
          data.actualDelivery = new Date();
        }
      }

      // Se estava "delivered" e mudou para outro status, reverter entrada
      if (currentImportation.status === "delivered" && status && status !== "delivered") {
        try {
          const { revertImportationDelivery } = await import("../importationHelpers");
          await revertImportationDelivery(id);
        } catch (error) {
          throw new Error(`Falha ao reverter entrega: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return db.updateImportation(id, { status, ...data });
    }),

  updateComplete: protectedProcedure
    .input(z.object({
      id: z.string(),
      invoiceNumber: z.string().optional(),
      supplierId: z.string(),
      importDate: z.date(),
      exchangeRate: z.number().positive(),
      subtotalUSD: z.number().min(0),
      freightUSD: z.number().min(0),
      importTaxRate: z.number().min(0).max(100),
      icmsRate: z.number().min(0).max(100),
      notes: z.string().optional(),
      items: z.array(z.object({
        id: z.string().optional(),
        productId: z.string().optional(),
        productName: z.string(),
        productDescription: z.string().optional(),
        supplierProductCode: z.string().optional(),
        color: z.string().optional(),
        size: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPriceUSD: z.number().min(0),
      })),
    }))
    .mutation(async ({ input }) => {
      const { id, items, importTaxRate, icmsRate, ...importData } = input;
      
      // Verificar se a importação já foi entregue
      const currentImportation = await db.getImportation(id);
      if (currentImportation?.status === "delivered") {
        throw new Error("Não é possível editar uma importação já entregue. Mude o status primeiro.");
      }
      
      // Calculate totals
      const totalUSD = importData.subtotalUSD + importData.freightUSD;
      const subtotalBRL = importData.subtotalUSD * importData.exchangeRate;
      const freightBRL = importData.freightUSD * importData.exchangeRate;
      const totalBeforeTaxBRL = totalUSD * importData.exchangeRate;
      
      // Calculate taxes
      const importTax = totalBeforeTaxBRL * (importTaxRate / 100);
      const icms = totalBeforeTaxBRL * (icmsRate / 100);
      const totalCostBRL = totalBeforeTaxBRL + importTax + icms;
      
      // Update importation
      await db.updateImportation(id, {
        ...importData,
        totalUSD: decimalToCents(totalUSD),
        subtotalUSD: decimalToCents(importData.subtotalUSD),
        freightUSD: decimalToCents(importData.freightUSD),
        subtotalBRL: decimalToCents(subtotalBRL),
        freightBRL: decimalToCents(freightBRL),
        importTax: decimalToCents(importTax),
        icms: decimalToCents(icms),
        totalCostBRL: decimalToCents(totalCostBRL),
        exchangeRate: decimalToCents(importData.exchangeRate),
      });
      
      // Delete existing items
      const existingItems = await db.getImportationItems(id);
      for (const item of existingItems) {
        await db.deleteImportationItem(item.id);
      }
      
      // Calculate cost per item
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const costPerUnit = totalCostBRL / totalQuantity;
      
      // Create new items
      for (const item of items) {
        const itemTotalUSD = item.quantity * item.unitPriceUSD;
        const itemProportion = itemTotalUSD / importData.subtotalUSD;
        const itemTotalCostBRL = totalCostBRL * itemProportion;
        const unitCostBRL = itemTotalCostBRL / item.quantity;
        
        await db.createImportationItem({
          id: generateId(),
          importationId: id,
          productId: item.productId,
          productName: item.productName,
          productDescription: item.productDescription,
          supplierProductCode: item.supplierProductCode,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unitPriceUSD: decimalToCents(item.unitPriceUSD),
          totalUSD: decimalToCents(itemTotalUSD),
          unitCostBRL: decimalToCents(unitCostBRL),
          totalCostBRL: decimalToCents(itemTotalCostBRL),
        });
        
        // Atualizar lastSupplierId e supplierProductCode no produto se vinculado
        if (item.productId) {
          await db.updateProduct(item.productId, {
            lastSupplierId: importData.supplierId,
            supplierProductCode: item.supplierProductCode || undefined,
          });
        }
      }
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Get items to reverse stock
      const items = await db.getImportationItems(input.id);
      
      for (const item of items) {
        if (item.productId) {
          const product = await db.getProduct(item.productId);
          if (product) {
            const newStock = product.currentStock - item.quantity;
            await db.updateProduct(item.productId, { currentStock: newStock });
            
            await db.createStockMovement({
              id: generateId(),
              productId: item.productId,
              importationId: input.id,
              movementType: "adjustment",
              quantity: -item.quantity,
              previousStock: product.currentStock,
              newStock,
              notes: "Importação deletada",
            });
          }
        }
      }
      
      await db.deleteImportation(input.id);
      return { success: true };
    }),

  linkItemToProduct: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      productId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { linkImportationItemToProduct } = await import("../importationHelpers");
      await linkImportationItemToProduct(input.itemId, input.productId);
      return { success: true };
    }),

  getPrintData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const importation = await db.getImportation(input.id);
      if (!importation) return null;
      
      const items = await db.getImportationItems(input.id);
      const supplier = await db.getSupplier(importation.supplierId);
      
      return {
        ...importation,
        exchangeRate: centsToDecimal(importation.exchangeRate),
        subtotalUSD: centsToDecimal(importation.subtotalUSD),
        freightUSD: centsToDecimal(importation.freightUSD),
        totalUSD: centsToDecimal(importation.totalUSD),
        subtotalBRL: centsToDecimal(importation.subtotalBRL),
        freightBRL: centsToDecimal(importation.freightBRL),
        importTax: centsToDecimal(importation.importTax),
        icms: centsToDecimal(importation.icms),
        otherTaxes: centsToDecimal(importation.otherTaxes),
        totalCostBRL: centsToDecimal(importation.totalCostBRL),
        supplier,
        items: items.map(item => ({
          ...item,
          unitPriceUSD: centsToDecimal(item.unitPriceUSD),
          totalUSD: centsToDecimal(item.totalUSD),
          unitCostBRL: centsToDecimal(item.unitCostBRL),
          totalCostBRL: centsToDecimal(item.totalCostBRL),
        })),
      };
    }),
});
