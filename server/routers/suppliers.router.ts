import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { randomBytes } from "crypto";
import * as db from "../db";

const generateId = () => randomBytes(16).toString("hex");

export const suppliersRouter = router({
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
});
