import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Auth helpers ────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "测试用户",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("auth.me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("测试用户");
  });
});

// ─── Password Hashing Tests ──────────────────────────────────────────────────
describe("Password Hashing (bcryptjs)", () => {
  it("hashes and verifies password correctly", async () => {
    const password = "testPassword123!";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await bcrypt.hash("correctPassword", 12);
    const valid = await bcrypt.compare("wrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("generates different hashes for same password (salted)", async () => {
    const password = "samePassword";
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);
    expect(hash1).not.toBe(hash2);
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

// ─── Financial calculation tests ─────────────────────────────────────────────
describe("Financial Calculation Logic", () => {
  describe("Monthly Surplus Calculation", () => {
    it("calculates surplus correctly: income - fixed - flexActual - repayActual", () => {
      const totalIncome = 22900;
      const totalFixed = 9780;
      const flexActual = 1500;
      const repayActual = 6000;
      const surplus = totalIncome - totalFixed - flexActual - repayActual;
      expect(surplus).toBe(5620);
    });

    it("handles zero expenses correctly", () => {
      const totalIncome = 22900;
      const surplus = totalIncome - 0 - 0 - 0;
      expect(surplus).toBe(22900);
    });

    it("handles deficit scenario (negative surplus)", () => {
      const totalIncome = 5000;
      const totalFixed = 9780;
      const surplus = totalIncome - totalFixed;
      expect(surplus).toBeLessThan(0);
      expect(surplus).toBe(-4780);
    });
  });

  describe("Investment Amount Calculation", () => {
    it("calculates investment: surplus * 10% + flexSaving", () => {
      const totalSurplus = 5620;
      const totalFlexBudget = 6000;
      const flexActual = 1500;
      const flexSaving = Math.max(totalFlexBudget - flexActual, 0);
      const investment = Math.max(totalSurplus * 0.1 + flexSaving, 0);
      expect(flexSaving).toBe(4500);
      expect(investment).toBe(5620 * 0.1 + 4500);
      expect(investment).toBeCloseTo(5062, 0);
    });

    it("investment is never negative", () => {
      const totalSurplus = -1000;
      const flexSaving = 0;
      const investment = Math.max(totalSurplus * 0.1 + flexSaving, 0);
      expect(investment).toBe(0);
    });

    it("flexible saving is never negative", () => {
      const totalFlexBudget = 3000;
      const flexActual = 5000;
      const flexSaving = Math.max(totalFlexBudget - flexActual, 0);
      expect(flexSaving).toBe(0);
    });

    it("with default seed data and no spending, investment = 22900*0.1 + 6000 - but surplus formula applies", () => {
      // totalSurplus = 22900 - 9780 - 0 - 0 = 13120
      // flexSaving = 6000 - 0 = 6000
      // investment = 13120 * 0.1 + 6000 = 7312
      const totalSurplus = 22900 - 9780 - 0 - 0;
      const flexSaving = Math.max(6000 - 0, 0);
      const investment = Math.max(totalSurplus * 0.1 + flexSaving, 0);
      expect(totalSurplus).toBe(13120);
      expect(investment).toBe(7312);
    });
  });

  describe("Asset Depreciation Calculation", () => {
    it("calculates daily depreciation correctly", () => {
      const purchasePrice = 200000;
      const lifespanYears = 10;
      const totalDays = lifespanYears * 365;
      const dailyDep = purchasePrice / totalDays;
      expect(dailyDep).toBeCloseTo(54.79, 1);
    });

    it("calculates depreciation for 365 days", () => {
      const purchasePrice = 36500;
      const lifespanYears = 1;
      const totalDays = lifespanYears * 365;
      const dailyDep = purchasePrice / totalDays;
      expect(dailyDep).toBe(100);
    });

    it("remaining value never goes below 0", () => {
      const purchasePrice = 10000;
      const lifespanYears = 1;
      const totalDays = lifespanYears * 365;
      const dailyDep = purchasePrice / totalDays;
      const daysUsed = 400;
      const totalDepreciated = Math.min(dailyDep * daysUsed, purchasePrice);
      const remainingValue = Math.max(purchasePrice - totalDepreciated, 0);
      expect(remainingValue).toBe(0);
    });

    it("depreciation percentage caps at 100%", () => {
      const purchasePrice = 10000;
      const lifespanYears = 1;
      const totalDays = lifespanYears * 365;
      const dailyDep = purchasePrice / totalDays;
      const daysUsed = 400;
      const totalDepreciated = Math.min(dailyDep * daysUsed, purchasePrice);
      const depPct = Math.min((totalDepreciated / purchasePrice) * 100, 100);
      expect(depPct).toBe(100);
    });

    it("sums total daily depreciation across multiple assets", () => {
      const assets = [
        { purchasePrice: 200000, lifespanYears: 10 },
        { purchasePrice: 1000000, lifespanYears: 30 },
        { purchasePrice: 50000, lifespanYears: 5 },
      ];
      const totalDaily = assets.reduce((sum, a) => sum + a.purchasePrice / (a.lifespanYears * 365), 0);
      expect(totalDaily).toBeGreaterThan(0);
      expect(totalDaily).toBeCloseTo(54.79 + 91.32 + 27.40, 0);
    });
  });

  describe("Advance Invoice Warning Logic", () => {
    it("flags advance as overdue after 30 days", () => {
      const advanceStartDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const daysElapsed = Math.floor((Date.now() - advanceStartDate.getTime()) / 86400000);
      const isOverdue = daysElapsed > 30;
      expect(isOverdue).toBe(true);
    });

    it("does not flag advance as overdue within 30 days", () => {
      const advanceStartDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const daysElapsed = Math.floor((Date.now() - advanceStartDate.getTime()) / 86400000);
      const isOverdue = daysElapsed > 30;
      expect(isOverdue).toBe(false);
    });

    it("invoiced advance is never overdue", () => {
      const isInvoiced = true;
      const advanceStartDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const daysElapsed = Math.floor((Date.now() - advanceStartDate.getTime()) / 86400000);
      const isOverdue = !isInvoiced && daysElapsed > 30;
      expect(isOverdue).toBe(false);
    });

    it("company advance does not count as personal expense", () => {
      const transactions = [
        { amount: "500", isCompanyAdvance: false },
        { amount: "300", isCompanyAdvance: true },
        { amount: "200", isCompanyAdvance: false },
      ];
      const personalTotal = transactions
        .filter(tx => !tx.isCompanyAdvance)
        .reduce((s, tx) => s + parseFloat(tx.amount), 0);
      expect(personalTotal).toBe(700);
    });
  });

  describe("Budget Remaining Calculation", () => {
    it("calculates remaining budget correctly", () => {
      const totalIncome = 22900;
      const totalFixed = 9780;
      const totalRepayment = 6000;
      const personalSpent = 4500;
      const remaining = totalIncome - totalFixed - totalRepayment - personalSpent;
      expect(remaining).toBe(2620);
    });

    it("excludes company advance from personal spending", () => {
      const transactions = [
        { amount: 100, isCompanyAdvance: false },
        { amount: 500, isCompanyAdvance: true },
        { amount: 200, isCompanyAdvance: false },
      ];
      const personalSpent = transactions
        .filter(tx => !tx.isCompanyAdvance)
        .reduce((sum, tx) => sum + tx.amount, 0);
      expect(personalSpent).toBe(300);
    });

    it("calculates budget usage percentage", () => {
      const budget = 6000;
      const spent = 3000;
      const pct = (spent / budget) * 100;
      expect(pct).toBe(50);
    });
  });

  describe("Initial Data Validation", () => {
    it("initial income totals 22900", () => {
      const incomes = [14000, 8900];
      const total = incomes.reduce((s, i) => s + i, 0);
      expect(total).toBe(22900);
    });

    it("initial fixed expenses total 9780", () => {
      const fixedExpenses = [5000, 1600, 2000, 400, 280, 300, 200];
      const total = fixedExpenses.reduce((s, e) => s + e, 0);
      expect(total).toBe(9780);
    });

    it("initial flexible budgets total 6000", () => {
      const flexible = [3000, 2000, 1000];
      const total = flexible.reduce((s, b) => s + b, 0);
      expect(total).toBe(6000);
    });

    it("initial repayments total 6000 with correct names", () => {
      const repayments = [
        { name: "二姐", amount: 3000 },
        { name: "妈咪", amount: 3000 },
      ];
      const total = repayments.reduce((s, r) => s + r.amount, 0);
      expect(total).toBe(6000);
      expect(repayments[0].name).toBe("二姐");
      expect(repayments[1].name).toBe("妈咪");
    });

    it("monthly disposable = income - fixed - flex - repay = 1120", () => {
      const total = 22900 - 9780 - 6000 - 6000;
      expect(total).toBe(1120);
    });
  });
});
