import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/MobileLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, TrendingUp, Wallet, ArrowRight, User,
  CreditCard, PiggyBank, Receipt, ChevronRight, AlertCircle
} from "lucide-react";
import { useMemo, useState } from "react";

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: incomes = [] } = trpc.income.list.useQuery();
  const { data: fixedExpenses = [] } = trpc.fixedExpense.list.useQuery();
  const { data: flexibleBudgets = [] } = trpc.flexibleBudget.list.useQuery();
  const { data: repayments = [] } = trpc.repayment.list.useQuery();
  const { data: transactions = [] } = trpc.transaction.list.useQuery({ year, month });
  const { data: overdueAdvances = [] } = trpc.transaction.overdueAdvances.useQuery();
  const { data: savings } = trpc.savings.get.useQuery();

  const stats = useMemo(() => {
    const totalIncome = incomes.filter(i => i.isActive).reduce((s, i) => s + parseFloat(i.amount), 0);
    const totalFixed = fixedExpenses.filter(e => e.isActive).reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalFlexBudget = flexibleBudgets.filter(b => b.isActive).reduce((s, b) => s + parseFloat(b.budgetAmount), 0);
    const totalRepayment = repayments.filter(r => r.isActive).reduce((s, r) => s + parseFloat(r.amount), 0);

    const personalTxns = transactions.filter(tx => !tx.isCompanyAdvance);
    const flexActual = personalTxns.filter(tx => tx.categoryType === "flexible").reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const repayActual = personalTxns.filter(tx => tx.categoryType === "repayment").reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const otherActual = personalTxns.filter(tx => tx.categoryType === "other").reduce((s, tx) => s + parseFloat(tx.amount), 0);

    const totalExpense = totalFixed + flexActual + repayActual + otherActual;
    const remaining = totalIncome - totalExpense;
    const flexRemaining = totalFlexBudget - flexActual;
    const budgetUsagePct = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;
    const flexUsagePct = totalFlexBudget > 0 ? Math.min((flexActual / totalFlexBudget) * 100, 100) : 0;

    return {
      totalIncome, totalFixed, totalFlexBudget, totalRepayment,
      flexActual, repayActual, totalExpense, remaining,
      flexRemaining, budgetUsagePct, flexUsagePct,
    };
  }, [incomes, fixedExpenses, flexibleBudgets, repayments, transactions]);

  const recentTxns = transactions.slice(0, 5);
  const pendingAdvances = transactions.filter(tx => tx.isCompanyAdvance && !tx.isInvoiced);
  const isZh = i18n.language === "zh";
  const monthLabel = isZh
    ? `${year}年${month}月`
    : new Date(year, month - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <MobileLayout
      title={t("app.title")}
      headerRight={
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <div className="flex items-center gap-1.5 bg-secondary/60 rounded-full px-2.5 py-1">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs text-foreground/80 max-w-[60px] truncate">{user?.name}</span>
          </div>
        </div>
      }
    >
      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* Month label */}
        <p className="text-xs text-muted-foreground font-medium tracking-wide">{monthLabel}</p>

        {/* Hero Card: Remaining Budget */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/15 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/8 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground/70 font-medium">{t("home.remainingBudget")}</span>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className={`text-4xl font-bold tracking-tight mb-1 ${stats.remaining >= 0 ? "text-foreground" : "text-destructive"}`}>
              <span className="text-lg font-normal mr-0.5">¥</span>
              {formatCurrency(Math.abs(stats.remaining))}
            </div>
            {stats.remaining < 0 && (
              <span className="text-xs text-destructive font-medium">{t("common.overspent")}</span>
            )}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-foreground/50">{t("home.budgetUsage")}</span>
                <span className={`font-medium ${stats.budgetUsagePct > 85 ? "text-destructive" : "text-foreground/60"}`}>
                  {stats.budgetUsagePct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-background/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(stats.budgetUsagePct, 100)}%`,
                    background: stats.budgetUsagePct > 85
                      ? "var(--expense-color)"
                      : "var(--primary)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-income/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-income" />
                </div>
                <span className="text-[11px] text-muted-foreground">{t("home.totalIncome")}</span>
              </div>
              <p className="text-xl font-bold text-income">¥{formatCurrency(stats.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-expense/15 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-expense" />
                </div>
                <span className="text-[11px] text-muted-foreground">{t("home.totalExpense")}</span>
              </div>
              <p className="text-xl font-bold text-expense">¥{formatCurrency(stats.totalExpense)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{t("home.fixedExpense")}</p>
            <p className="text-sm font-semibold text-foreground">¥{formatCurrency(stats.totalFixed)}</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{t("home.repayment")}</p>
            <p className="text-sm font-semibold text-foreground">¥{formatCurrency(stats.totalRepayment)}</p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{t("home.flexibleExpense")}</p>
            <p className="text-sm font-semibold text-foreground">¥{formatCurrency(stats.flexActual)}</p>
          </div>
        </div>

        {/* Flexible Budget Progress */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-sm font-medium">{t("home.flexibleBudgetRemaining")}</span>
              <span className={`text-sm font-bold ${stats.flexRemaining >= 0 ? "text-income" : "text-destructive"}`}>
                ¥{formatCurrency(Math.abs(stats.flexRemaining))}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>¥{formatCurrency(stats.flexActual)} {t("common.actual")}</span>
              <span>¥{formatCurrency(stats.totalFlexBudget)} {t("common.budget")}</span>
            </div>
            <div className="h-2.5 bg-secondary/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(stats.flexUsagePct, 100)}%`,
                  background: stats.flexUsagePct > 90
                    ? "var(--expense-color)"
                    : stats.flexUsagePct > 70
                      ? "var(--warning-color)"
                      : "var(--income-color)",
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Savings Card */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/8 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("home.savings")}</p>
              <p className="text-2xl font-bold text-primary">
                <span className="text-sm font-normal mr-0.5">¥</span>
                {formatCurrency(savings?.totalAmount ?? 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Advance Warnings */}
        {overdueAdvances.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/8">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                </div>
                <span className="text-sm font-semibold text-destructive">{t("home.overdueInvoice")}</span>
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{overdueAdvances.length}</Badge>
              </div>
              <div className="space-y-2">
                {overdueAdvances.slice(0, 3).map(tx => {
                  const days = Math.floor((Date.now() - new Date(tx.advanceStartDate!).getTime()) / 86400000);
                  return (
                    <div key={tx.id} className="flex justify-between items-center text-xs overdue-pulse">
                      <span className="text-destructive font-medium">{tx.categoryName || t("transactions.categoryOther")}</span>
                      <span className="text-destructive/80">¥{formatCurrency(tx.amount)} · {days}{isZh ? "天" : "d"}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8">
                  {t("home.viewAll")} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pending Advances (not overdue yet) */}
        {pendingAdvances.length > 0 && overdueAdvances.length === 0 && (
          <Card className="border-advance/20 bg-advance/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-advance/10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-advance" />
                </div>
                <div>
                  <p className="text-xs text-advance font-medium">{t("home.advanceWarning")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pendingAdvances.length} {t("home.pendingAdvances")}
                  </p>
                </div>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="text-advance text-xs h-8 px-2">
                  {t("home.view")} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{t("home.recentTransactions")}</h2>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 hover:text-primary">
                {t("home.viewAll")} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("home.noTransactions")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTxns.map(tx => {
                const isOverdue = tx.isCompanyAdvance && !tx.isInvoiced &&
                  tx.advanceStartDate && (Date.now() - new Date(tx.advanceStartDate).getTime()) > 30 * 86400000;
                const categoryKey = tx.categoryType.charAt(0).toUpperCase() + tx.categoryType.slice(1);
                return (
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isOverdue
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/40 bg-card/60 hover:bg-card/80"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {tx.categoryName || t(`transactions.category${categoryKey}`)}
                        </span>
                        {tx.isCompanyAdvance && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                            isOverdue ? "border-destructive/50 text-destructive" : "border-advance/40 text-advance"
                          }`}>
                            {tx.isInvoiced
                              ? t("transactions.invoiced")
                              : isOverdue
                                ? (isZh ? "逾期" : "Overdue")
                                : (isZh ? "垫付" : "Adv")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(tx.transactionDate)} · {tx.operatorName}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ml-3 tabular-nums ${
                      tx.isCompanyAdvance ? "text-advance" : "text-expense"
                    }`}>
                      {tx.isCompanyAdvance ? "" : "-"}¥{formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
