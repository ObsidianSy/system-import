import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

const generateId = () => randomBytes(16).toString("hex");
const centsToDecimal = (cents: number) => cents / 100;
const decimalToCents = (decimal: number) => Math.round(decimal * 100);

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          console.log(`[Auth] Login attempt for email: ${input.email}`);
          
          const user = await db.getUserByEmail(input.email);
          console.log(`[Auth] User found:`, !!user);
          
          if (!user || !user.password) {
            console.log(`[Auth] Login failed: Invalid credentials`);
            throw new Error("Credenciais inválidas");
          }
          
          if (!user.isActive) {
            console.log(`[Auth] Login failed: User inactive`);
            throw new Error("Usuário inativo");
          }
          
          const validPassword = await bcrypt.compare(input.password, user.password);
          console.log(`[Auth] Password valid:`, validPassword);
          
          if (!validPassword) {
            console.log(`[Auth] Login failed: Invalid password`);
            throw new Error("Credenciais inválidas");
          }
          
          // Atualizar último login
          await db.updateUser(user.id, { lastSignedIn: new Date() });
          
          // Criar JWT token
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({ 
            userId: user.id,
            email: user.email,
            name: user.name,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret);
          
          // Definir cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
          
          console.log(`[Auth] Cookie set: ${COOKIE_NAME}, options:`, cookieOptions);
          console.log(`[Auth] Login successful for user: ${user.email}`);
          
          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          };
        } catch (error) {
          console.error(`[Auth] Login error:`, error);
          throw error;
        }
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========== User Management ==========
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem listar usuários");
      }
      return db.listUsers();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin" && ctx.user?.id !== input.id) {
          throw new Error("Sem permissão");
        }
        return db.getUser(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Apenas administradores podem criar usuários");
        }

        // Verificar se email já existe
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new Error("Email já cadastrado");
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);

        return db.createUser({
          id: generateId(),
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role,
          loginMethod: "password",
          isActive: true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin" && ctx.user?.id !== input.id) {
          throw new Error("Sem permissão");
        }

        const { id, password, ...data } = input;
        const updateData: any = { ...data };

        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        return db.updateUser(id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Apenas administradores podem excluir usuários");
        }

        if (ctx.user.id === input.id) {
          throw new Error("Não pode excluir seu próprio usuário");
        }

        await db.deleteUser(input.id);
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("Não autenticado");
        }

        const user = await db.getUser(ctx.user.id);
        if (!user || !user.password) {
          throw new Error("Usuário não encontrado");
        }

        const validPassword = await bcrypt.compare(input.currentPassword, user.password);
        if (!validPassword) {
          throw new Error("Senha atual incorreta");
        }

        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await db.updateUser(ctx.user.id, { password: hashedPassword });

        return { success: true };
      }),
  }),

  // ========== Suppliers ==========
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return db.listSuppliers();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return db.getSupplier(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        companyName: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional().refine((val) => !val || val === '' || z.string().email().safeParse(val).success, { message: 'Invalid email address' }),
        whatsapp: z.string().optional(),
        contactPerson: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplier({
          id: generateId(),
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        companyName: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional().refine((val) => !val || val === '' || z.string().email().safeParse(val).success, { message: 'Invalid email address' }),
        whatsapp: z.string().optional(),
        contactPerson: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplier(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteSupplier(input.id);
        return { success: true };
      }),
  }),

  // ========== Products ==========
  products: router({
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // Se o custo médio foi atualizado e o preço de venda não foi especificado,
        // calcular automaticamente: custo médio + R$ 5,00
        if (data.averageCostBRL !== undefined && data.salePriceBRL === undefined) {
          data.salePriceBRL = data.averageCostBRL + 500; // +R$ 5,00 (500 centavos)
        }
        
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
        // TODO: Implement storage solution (AWS S3, Cloudinary, etc.)
        // For now, return a placeholder URL
        const timestamp = Date.now();
        const url = `/uploads/products/${input.productId}-${timestamp}.jpg`;
        
        await db.updateProduct(input.productId, { imageUrl: url });
        
        return { url };
      }),
  }),

  orders: router({
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
        const data: any = {};
        if (input.quantity !== undefined) data.quantity = input.quantity;
        if (input.unitPriceUSD !== undefined) data.unitPriceUSD = Math.round(input.unitPriceUSD);
        if (data.quantity !== undefined && data.unitPriceUSD !== undefined) data.subtotalUSD = Math.round(data.quantity * data.unitPriceUSD);
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
  }),

  // ========== Importations ==========
  importations: router({
    list: protectedProcedure.query(async () => {
      const imports = await db.listImportations();
      
      // Fetch items for all importations to allow detailed reporting
      const importsWithItems = await Promise.all(imports.map(async (imp) => {
        const items = await db.getImportationItems(imp.id);
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
      }));
      
      return importsWithItems;
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
        exchangeRate: z.number(),
        subtotalUSD: z.number(),
        freightUSD: z.number(),
        importTaxRate: z.number(), // Tax rate in percentage
        icmsRate: z.number(), // Tax rate in percentage
        otherTaxes: z.number().default(0),
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
          quantity: z.number(),
          unitPriceUSD: z.number(),
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
          const { processImportationDelivery } = await import("./importationHelpers");
          await processImportationDelivery(id);
          
          // Definir data de entrega se não foi fornecida
          if (!data.actualDelivery) {
            data.actualDelivery = new Date();
          }
        }
        
        // Se estava "delivered" e mudou para outro status, reverter entrada
        if (currentImportation.status === "delivered" && status && status !== "delivered") {
          const { revertImportationDelivery } = await import("./importationHelpers");
          await revertImportationDelivery(id);
        }
        
        return db.updateImportation(id, { status, ...data });
      }),

    updateComplete: protectedProcedure
      .input(z.object({
        id: z.string(),
        invoiceNumber: z.string().optional(),
        supplierId: z.string(),
        importDate: z.date(),
        exchangeRate: z.number(),
        subtotalUSD: z.number(),
        freightUSD: z.number(),
        importTaxRate: z.number(),
        icmsRate: z.number(),
        notes: z.string().optional(),
        items: z.array(z.object({
          id: z.string().optional(),
          productId: z.string().optional(),
          productName: z.string(),
          productDescription: z.string().optional(),
          supplierProductCode: z.string().optional(),
          color: z.string().optional(),
          size: z.string().optional(),
          quantity: z.number(),
          unitPriceUSD: z.number(),
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
        const { linkImportationItemToProduct } = await import("./importationHelpers");
        await linkImportationItemToProduct(input.itemId, input.productId);
        return { success: true };
      }),
  }),

  // ========== Stock ==========
  stock: router({
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
  }),

  // ========== Tax Config ==========
  taxConfig: router({
    list: protectedProcedure.query(async () => {
      const configs = await db.listTaxConfigs();
      return configs.map(config => ({
        ...config,
        importTaxRate: config.importTaxRate / 100, // Convert basis points to percentage
        icmsRate: config.icmsRate / 100,
      }));
    }),

    getActive: protectedProcedure.query(async () => {
      const config = await db.getActiveTaxConfig();
      if (!config) return null;
      
      return {
        ...config,
        importTaxRate: config.importTaxRate / 100,
        icmsRate: config.icmsRate / 100,
      };
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        importTaxRate: z.number(), // Percentage
        icmsRate: z.number(), // Percentage
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        // If setting as active, deactivate others
        if (input.isActive) {
          const configs = await db.listTaxConfigs();
          for (const config of configs) {
            if (config.isActive) {
              await db.updateTaxConfig(config.id, { isActive: false });
            }
          }
        }
        
        return db.createTaxConfig({
          id: generateId(),
          name: input.name,
          importTaxRate: Math.round(input.importTaxRate * 100), // Convert to basis points
          icmsRate: Math.round(input.icmsRate * 100),
          isActive: input.isActive,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        importTaxRate: z.number().optional(),
        icmsRate: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // If setting as active, deactivate others
        if (data.isActive) {
          const configs = await db.listTaxConfigs();
          for (const config of configs) {
            if (config.isActive && config.id !== id) {
              await db.updateTaxConfig(config.id, { isActive: false });
            }
          }
        }
        
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.importTaxRate !== undefined) updateData.importTaxRate = Math.round(data.importTaxRate * 100);
        if (data.icmsRate !== undefined) updateData.icmsRate = Math.round(data.icmsRate * 100);
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        
        return db.updateTaxConfig(id, updateData);
      }),
  }),

  // ========== Dashboard Stats ==========
  dashboard: router({
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
  }),
});

export type AppRouter = typeof appRouter;

