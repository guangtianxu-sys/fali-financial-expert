import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  assets,
  fixedExpenses,
  flexibleBudgets,
  incomeSources,
  monthlySettlements,
  repaymentPlans,
  savings,
  transactions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(data: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    password: data.password,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  const user = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return user[0];
}

// ─── Income Sources ───────────────────────────────────────────────────────────
export async function getIncomeSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incomeSources).orderBy(incomeSources.id);
}

export async function createIncomeSource(data: { name: string; nameEn?: string; amount: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(incomeSources).values({ name: data.name, nameEn: data.nameEn, amount: data.amount });
}

export async function updateIncomeSource(id: number, data: { name?: string; nameEn?: string; amount?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(incomeSources).set({ ...data, updatedAt: new Date() }).where(eq(incomeSources.id, id));
}

export async function deleteIncomeSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(incomeSources).where(eq(incomeSources.id, id));
}

// ─── Fixed Expenses ───────────────────────────────────────────────────────────
export async function getFixedExpenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fixedExpenses).orderBy(fixedExpenses.id);
}

export async function createFixedExpense(data: { name: string; nameEn?: string; amount: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(fixedExpenses).values({ name: data.name, nameEn: data.nameEn, amount: data.amount });
}

export async function updateFixedExpense(id: number, data: { name?: string; nameEn?: string; amount?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(fixedExpenses).set({ ...data, updatedAt: new Date() }).where(eq(fixedExpenses.id, id));
}

export async function deleteFixedExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(fixedExpenses).where(eq(fixedExpenses.id, id));
}

// ─── Flexible Budgets ─────────────────────────────────────────────────────────
export async function getFlexibleBudgets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flexibleBudgets).orderBy(flexibleBudgets.id);
}

export async function createFlexibleBudget(data: { name: string; nameEn?: string; budgetAmount: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(flexibleBudgets).values({ name: data.name, nameEn: data.nameEn, budgetAmount: data.budgetAmount });
}

export async function updateFlexibleBudget(id: number, data: { name?: string; nameEn?: string; budgetAmount?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(flexibleBudgets).set({ ...data, updatedAt: new Date() }).where(eq(flexibleBudgets.id, id));
}

export async function deleteFlexibleBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(flexibleBudgets).where(eq(flexibleBudgets.id, id));
}

// ─── Repayment Plans ──────────────────────────────────────────────────────────
export async function getRepaymentPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(repaymentPlans).orderBy(repaymentPlans.id);
}

export async function createRepaymentPlan(data: { name: string; nameEn?: string; amount: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(repaymentPlans).values({ name: data.name, nameEn: data.nameEn, amount: data.amount });
}

export async function updateRepaymentPlan(id: number, data: { name?: string; nameEn?: string; amount?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(repaymentPlans).set({ ...data, updatedAt: new Date() }).where(eq(repaymentPlans.id, id));
}

export async function deleteRepaymentPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(repaymentPlans).where(eq(repaymentPlans.id, id));
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function getTransactions(filters?: { year?: number; month?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.year && filters?.month) {
    const start = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${String(filters.month).padStart(2, "0")}-${lastDay}`;
    conditions.push(sql`${transactions.transactionDate} >= ${start}`);
    conditions.push(sql`${transactions.transactionDate} <= ${end}`);
  }
  if (filters?.userId) conditions.push(eq(transactions.userId, filters.userId));

  const rows = conditions.length > 0
    ? await db.select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
    : await db.select().from(transactions).orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

  // Join user names
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const userMap = new Map(allUsers.map(u => [u.id, u.name ?? "Unknown"]));
  return rows.map(r => ({ ...r, operatorName: userMap.get(r.userId) ?? "Unknown" }));
}

export async function getOverdueAdvances() {
  const db = await getDb();
  if (!db) return [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db.select().from(transactions).where(
    and(
      eq(transactions.isCompanyAdvance, true),
      eq(transactions.isInvoiced, false),
      lte(transactions.advanceStartDate, thirtyDaysAgo)
    )
  ).orderBy(transactions.advanceStartDate);
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const userMap = new Map(allUsers.map(u => [u.id, u.name ?? "Unknown"]));
  return rows.map(r => ({ ...r, operatorName: userMap.get(r.userId) ?? "Unknown" }));
}

export async function createTransaction(data: {
  userId: number;
  amount: string;
  categoryType: "fixed" | "flexible" | "repayment" | "other";
  categoryId?: number;
  categoryName?: string;
  note?: string;
  transactionDate: string;
  isCompanyAdvance?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const advanceStartDate = data.isCompanyAdvance ? new Date() : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.insert(transactions).values({
    userId: data.userId,
    amount: data.amount,
    categoryType: data.categoryType,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    note: data.note,
    transactionDate: data.transactionDate as any,
    isCompanyAdvance: data.isCompanyAdvance ?? false,
    advanceStartDate,
  } as any);
  return result;
}

export async function updateTransaction(id: number, data: {
  amount?: string;
  categoryType?: "fixed" | "flexible" | "repayment" | "other";
  categoryId?: number;
  categoryName?: string;
  note?: string;
  transactionDate?: string;
  isCompanyAdvance?: boolean;
  isInvoiced?: boolean;
  invoicedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.isCompanyAdvance === true) updateData.advanceStartDate = new Date();
  if (data.isInvoiced === true) updateData.invoicedAt = new Date();
  await db.update(transactions).set(updateData).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function markTransactionInvoiced(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(transactions).set({ isInvoiced: true, invoicedAt: new Date(), updatedAt: new Date() }).where(eq(transactions.id, id));
}

// ─── Monthly Settlement ───────────────────────────────────────────────────────
export async function getMonthlySettlements() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(monthlySettlements).orderBy(desc(monthlySettlements.year), desc(monthlySettlements.month));
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const userMap = new Map(allUsers.map(u => [u.id, u.name ?? "Unknown"]));
  return rows.map(r => ({ ...r, operatorName: userMap.get(r.userId) ?? "Unknown" }));
}

export async function getSettlementByYearMonth(year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(monthlySettlements)
    .where(and(eq(monthlySettlements.year, year), eq(monthlySettlements.month, month)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createMonthlySettlement(data: {
  userId: number;
  year: number;
  month: number;
  totalIncome: string;
  totalFixed: string;
  totalFlexibleBudget: string;
  totalFlexibleActual: string;
  totalRepayment: string;
  totalSurplus: string;
  investmentAmount: string;
  savingsAdded: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(monthlySettlements).values(data);
  // Update savings
  await db.update(savings).set({ totalAmount: sql`totalAmount + ${data.savingsAdded}` });
}

// ─── Savings ──────────────────────────────────────────────────────────────────
export async function getSavings() {
  const db = await getDb();
  if (!db) return { id: 1, totalAmount: "0", updatedAt: new Date() };
  const result = await db.select().from(savings).limit(1);
  return result.length > 0 ? result[0] : { id: 1, totalAmount: "0", updatedAt: new Date() };
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function getAssets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.isActive, true)).orderBy(assets.createdAt);
}

export async function createAsset(data: {
  userId: number;
  name: string;
  nameEn?: string;
  purchasePrice: string;
  lifespanYears: number;
  purchaseDate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // MySQL accepts YYYY-MM-DD string for date columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(assets).values(data as any);
}

export async function updateAsset(id: number, data: {
  name?: string;
  nameEn?: string;
  purchasePrice?: string;
  lifespanYears?: number;
  purchaseDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData = { ...data, updatedAt: new Date() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(assets).set(updateData as any).where(eq(assets.id, id));
}

export async function deleteAsset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(assets).set({ isActive: false, updatedAt: new Date() }).where(eq(assets.id, id));
}
