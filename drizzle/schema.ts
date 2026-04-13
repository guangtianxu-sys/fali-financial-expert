import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: varchar("password", { length: 255 }),  // bcrypt hash for custom auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Income Sources ───────────────────────────────────────────────────────────
// Configurable income items (e.g., salary A: 14000, salary B: 8900)
export const incomeSources = mysqlTable("income_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IncomeSource = typeof incomeSources.$inferSelect;

// ─── Fixed Expenses ───────────────────────────────────────────────────────────
// Monthly fixed costs: 房贷, 交通, 高速, 停车, 物业, 水电煤, 宽带
export const fixedExpenses = mysqlTable("fixed_expenses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FixedExpense = typeof fixedExpenses.$inferSelect;

// ─── Flexible Budgets ─────────────────────────────────────────────────────────
// Monthly flexible budget categories: 餐饮, 备用金, 用品
export const flexibleBudgets = mysqlTable("flexible_budgets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }),
  budgetAmount: decimal("budgetAmount", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlexibleBudget = typeof flexibleBudgets.$inferSelect;

// ─── Repayment Plans ──────────────────────────────────────────────────────────
// Monthly repayments: 二姐 3000, 妈咪 3000
export const repaymentPlans = mysqlTable("repayment_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),      // 二姐 / 妈咪
  nameEn: varchar("nameEn", { length: 128 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RepaymentPlan = typeof repaymentPlans.$inferSelect;

// ─── Transactions ─────────────────────────────────────────────────────────────
// Daily expense records
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                        // operator
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  categoryType: mysqlEnum("categoryType", [
    "fixed",
    "flexible",
    "repayment",
    "other",
  ]).notNull(),
  categoryId: int("categoryId"),                          // FK to fixed/flexible/repayment table
  categoryName: varchar("categoryName", { length: 128 }), // snapshot of name
  note: text("note"),
  transactionDate: date("transactionDate").notNull(),
  // Company advance fields
  isCompanyAdvance: boolean("isCompanyAdvance").default(false).notNull(),
  advanceStartDate: timestamp("advanceStartDate"),        // when advance was toggled
  isInvoiced: boolean("isInvoiced").default(false).notNull(),
  invoicedAt: timestamp("invoicedAt"),
  // Settlement linkage
  settlementId: int("settlementId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Monthly Settlements ──────────────────────────────────────────────────────
export const monthlySettlements = mysqlTable("monthly_settlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                        // who triggered
  year: int("year").notNull(),
  month: int("month").notNull(),                          // 1-12
  totalIncome: decimal("totalIncome", { precision: 12, scale: 2 }).notNull(),
  totalFixed: decimal("totalFixed", { precision: 12, scale: 2 }).notNull(),
  totalFlexibleBudget: decimal("totalFlexibleBudget", { precision: 12, scale: 2 }).notNull(),
  totalFlexibleActual: decimal("totalFlexibleActual", { precision: 12, scale: 2 }).notNull(),
  totalRepayment: decimal("totalRepayment", { precision: 12, scale: 2 }).notNull(),
  totalSurplus: decimal("totalSurplus", { precision: 12, scale: 2 }).notNull(),
  investmentAmount: decimal("investmentAmount", { precision: 12, scale: 2 }).notNull(),
  savingsAdded: decimal("savingsAdded", { precision: 12, scale: 2 }).notNull(),
  settledAt: timestamp("settledAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MonthlySettlement = typeof monthlySettlements.$inferSelect;

// ─── Savings ──────────────────────────────────────────────────────────────────
// Running total of family savings
export const savings = mysqlTable("savings", {
  id: int("id").autoincrement().primaryKey(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Savings = typeof savings.$inferSelect;

// ─── Assets ───────────────────────────────────────────────────────────────────
// Fixed assets: car, house, luxury goods, etc.
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                        // who added
  name: varchar("name", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }),
  purchasePrice: decimal("purchasePrice", { precision: 14, scale: 2 }).notNull(),
  lifespanYears: int("lifespanYears").notNull(),           // useful life in years
  purchaseDate: date("purchaseDate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
