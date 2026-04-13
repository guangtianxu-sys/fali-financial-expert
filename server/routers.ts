import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  createAsset,
  createFixedExpense,
  createFlexibleBudget,
  createIncomeSource,
  createMonthlySettlement,
  createRepaymentPlan,
  createTransaction,
  createUser,
  deleteAsset,
  deleteFixedExpense,
  deleteFlexibleBudget,
  deleteIncomeSource,
  deleteRepaymentPlan,
  deleteTransaction,
  getAssets,
  getFixedExpenses,
  getFlexibleBudgets,
  getIncomeSources,
  getMonthlySettlements,
  getOverdueAdvances,
  getRepaymentPlans,
  getSavings,
  getSettlementByYearMonth,
  getTransactions,
  getUserByEmail,
  markTransactionInvoiced,
  updateAsset,
  updateFixedExpense,
  updateFlexibleBudget,
  updateIncomeSource,
  updateRepaymentPlan,
  updateTransaction,
  upsertUser,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { password, ...safeUser } = opts.ctx.user as any;
      return safeUser;
    }),

    register: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        email: z.string().email().max(320),
        password: z.string().min(6).max(128),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
        }
        const hashedPassword = await bcrypt.hash(input.password, 12);
        const user = await createUser({
          name: input.name,
          email: input.email,
          password: hashedPassword,
        });
        // Create session
        const token = await sdk.createSessionToken(user.openId, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        // Update last sign in
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        // Create session
        const token = await sdk.createSessionToken(user.openId, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Config: Income Sources ─────────────────────────────────────────────────
  income: router({
    list: publicProcedure.query(() => getIncomeSources()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), nameEn: z.string().optional(), amount: z.string() }))
      .mutation(({ input }) => createIncomeSource(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), nameEn: z.string().optional(), amount: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateIncomeSource(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteIncomeSource(input.id)),
  }),

  // ─── Config: Fixed Expenses ─────────────────────────────────────────────────
  fixedExpense: router({
    list: publicProcedure.query(() => getFixedExpenses()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), nameEn: z.string().optional(), amount: z.string() }))
      .mutation(({ input }) => createFixedExpense(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), nameEn: z.string().optional(), amount: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateFixedExpense(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFixedExpense(input.id)),
  }),

  // ─── Config: Flexible Budgets ───────────────────────────────────────────────
  flexibleBudget: router({
    list: publicProcedure.query(() => getFlexibleBudgets()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), nameEn: z.string().optional(), budgetAmount: z.string() }))
      .mutation(({ input }) => createFlexibleBudget(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), nameEn: z.string().optional(), budgetAmount: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateFlexibleBudget(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFlexibleBudget(input.id)),
  }),

  // ─── Config: Repayment Plans ────────────────────────────────────────────────
  repayment: router({
    list: publicProcedure.query(() => getRepaymentPlans()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), nameEn: z.string().optional(), amount: z.string() }))
      .mutation(({ input }) => createRepaymentPlan(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), nameEn: z.string().optional(), amount: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateRepaymentPlan(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteRepaymentPlan(input.id)),
  }),

  // ─── Transactions ───────────────────────────────────────────────────────────
  transaction: router({
    list: publicProcedure
      .input(z.object({ year: z.number().optional(), month: z.number().optional() }).optional())
      .query(({ input }) => getTransactions(input)),
    overdueAdvances: publicProcedure.query(() => getOverdueAdvances()),
    create: protectedProcedure
      .input(z.object({
        amount: z.string(),
        categoryType: z.enum(["fixed", "flexible", "repayment", "other"]),
        categoryId: z.number().optional(),
        categoryName: z.string().optional(),
        note: z.string().optional(),
        transactionDate: z.string(),
        isCompanyAdvance: z.boolean().optional(),
      }))
      .mutation(({ input, ctx }) => createTransaction({ ...input, userId: ctx.user.id })),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        amount: z.string().optional(),
        categoryType: z.enum(["fixed", "flexible", "repayment", "other"]).optional(),
        categoryId: z.number().optional(),
        categoryName: z.string().optional(),
        note: z.string().optional(),
        transactionDate: z.string().optional(),
        isCompanyAdvance: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateTransaction(id, data); }),
    markInvoiced: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => markTransactionInvoiced(input.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTransaction(input.id)),
  }),

  // ─── Monthly Settlement ─────────────────────────────────────────────────────
  settlement: router({
    list: publicProcedure.query(() => getMonthlySettlements()),
    getByYearMonth: publicProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input }) => getSettlementByYearMonth(input.year, input.month)),
    settle: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        totalIncome: z.string(),
        totalFixed: z.string(),
        totalFlexibleBudget: z.string(),
        totalFlexibleActual: z.string(),
        totalRepayment: z.string(),
        totalSurplus: z.string(),
        investmentAmount: z.string(),
        savingsAdded: z.string(),
      }))
      .mutation(({ input, ctx }) => createMonthlySettlement({ ...input, userId: ctx.user.id })),
  }),

  // ─── Savings ────────────────────────────────────────────────────────────────
  savings: router({
    get: publicProcedure.query(() => getSavings()),
  }),

  // ─── Assets ─────────────────────────────────────────────────────────────────
  asset: router({
    list: publicProcedure.query(() => getAssets()),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        nameEn: z.string().optional(),
        purchasePrice: z.string(),
        lifespanYears: z.number().min(1),
        purchaseDate: z.string(),
      }))
      .mutation(({ input, ctx }) => createAsset({ ...input, userId: ctx.user.id })),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameEn: z.string().optional(),
        purchasePrice: z.string().optional(),
        lifespanYears: z.number().optional(),
        purchaseDate: z.string().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return updateAsset(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteAsset(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
