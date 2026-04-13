import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/MobileLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, History, Calculator, PiggyBank, ArrowDown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number | string, decimals = 2) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function Settlement() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const isZh = i18n.language === "zh";

  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [showConfirm, setShowConfirm] = useState(false);

  const monthLabel = isZh
    ? `${year}年${month}月`
    : new Date(year, month - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  const { data: incomes = [] } = trpc.income.list.useQuery();
  const { data: fixedExpenses = [] } = trpc.fixedExpense.list.useQuery();
  const { data: flexibleBudgets = [] } = trpc.flexibleBudget.list.useQuery();
  const { data: repayments = [] } = trpc.repayment.list.useQuery();
  const { data: transactions = [] } = trpc.transaction.list.useQuery({ year, month });
  const { data: currentSettlement } = trpc.settlement.getByYearMonth.useQuery({ year, month });
  const { data: settlementHistory = [] } = trpc.settlement.list.useQuery();
  const { data: savings } = trpc.savings.get.useQuery();

  const calc = useMemo(() => {
    const totalIncome = incomes.filter(i => i.isActive).reduce((s, i) => s + parseFloat(i.amount), 0);
    const totalFixed = fixedExpenses.filter(e => e.isActive).reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalFlexBudget = flexibleBudgets.filter(b => b.isActive).reduce((s, b) => s + parseFloat(b.budgetAmount), 0);
    const totalRepayment = repayments.filter(r => r.isActive).reduce((s, r) => s + parseFloat(r.amount), 0);

    const personalTxns = transactions.filter(tx => !tx.isCompanyAdvance);
    const flexActual = personalTxns.filter(tx => tx.categoryType === "flexible").reduce((s, tx) => s + parseFloat(tx.amount), 0);
    const repayActual = personalTxns.filter(tx => tx.categoryType === "repayment").reduce((s, tx) => s + parseFloat(tx.amount), 0);

    const flexSaving = Math.max(totalFlexBudget - flexActual, 0);
    const totalSurplus = totalIncome - totalFixed - flexActual - repayActual;
    const investmentAmount = Math.max(totalSurplus * 0.1 + flexSaving, 0);
    const savingsAdded = investmentAmount;

    return {
      totalIncome, totalFixed, totalFlexBudget, totalRepayment,
      flexActual, repayActual, flexSaving,
      totalSurplus, investmentAmount, savingsAdded,
    };
  }, [incomes, fixedExpenses, flexibleBudgets, repayments, transactions]);

  const settleMutation = trpc.settlement.settle.useMutation({
    onSuccess: () => {
      utils.settlement.list.invalidate();
      utils.settlement.getByYearMonth.invalidate();
      utils.savings.get.invalidate();
      setShowConfirm(false);
      toast.success(t("common.success"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const handleSettle = () => {
    settleMutation.mutate({
      year, month,
      totalIncome: calc.totalIncome.toFixed(2),
      totalFixed: calc.totalFixed.toFixed(2),
      totalFlexibleBudget: calc.totalFlexBudget.toFixed(2),
      totalFlexibleActual: calc.flexActual.toFixed(2),
      totalRepayment: calc.repayActual.toFixed(2),
      totalSurplus: calc.totalSurplus.toFixed(2),
      investmentAmount: calc.investmentAmount.toFixed(2),
      savingsAdded: calc.savingsAdded.toFixed(2),
    });
  };

  const isSettled = !!currentSettlement;

  return (
    <MobileLayout title={t("settlement.title")} headerRight={<LanguageSwitcher />}>
      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{t("settlement.currentMonth")}</p>
            <p className="text-lg font-bold">{monthLabel}</p>
          </div>
          {isSettled ? (
            <Badge variant="outline" className="border-income/40 text-income gap-1 px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />{t("settlement.alreadySettled")}
            </Badge>
          ) : (
            <Button size="sm" onClick={() => setShowConfirm(true)} className="gap-1.5 h-9">
              <Calculator className="w-3.5 h-3.5" />{t("settlement.settleNow")}
            </Button>
          )}
        </div>

        {/* Calculation Breakdown */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 space-y-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">{t("settlement.surplusCalc")}</span>
            </div>

            {/* Income */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{t("settlement.totalIncome")}</span>
              <span className="text-sm font-semibold text-income">¥{formatCurrency(calc.totalIncome)}</span>
            </div>
            <Separator className="bg-border/30" />

            {/* Expenses */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{t("settlement.totalFixed")}</span>
              <span className="text-sm font-semibold text-expense">-¥{formatCurrency(calc.totalFixed)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm text-muted-foreground">{t("settlement.totalFlexibleActual")}</span>
                <p className="text-[10px] text-muted-foreground/60">
                  {t("common.budget")}: ¥{formatCurrency(calc.totalFlexBudget)}
                </p>
              </div>
              <span className="text-sm font-semibold text-expense">-¥{formatCurrency(calc.flexActual)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{t("settlement.totalRepayment")}</span>
              <span className="text-sm font-semibold text-expense">-¥{formatCurrency(calc.repayActual)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-income/80">{t("settlement.flexibleSaving")}</span>
              <span className="text-sm font-semibold text-income">+¥{formatCurrency(calc.flexSaving)}</span>
            </div>
            <Separator className="bg-border/50 my-1" />

            {/* Surplus */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold">{t("settlement.totalSurplus")}</span>
              <span className={`text-lg font-bold ${calc.totalSurplus >= 0 ? "text-income" : "text-destructive"}`}>
                ¥{formatCurrency(calc.totalSurplus)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Investment & Savings Cards */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/8 to-transparent border border-primary/15 p-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-6 translate-x-6" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs text-primary font-medium">{t("settlement.investmentAmount")}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("settlement.investmentFormula")}</p>
              </div>
              <p className="text-2xl font-bold text-primary">¥{formatCurrency(calc.investmentAmount)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-income/10 flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-income" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-income/15 via-income/5 to-transparent border border-income/15 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-income font-medium mb-1">{t("settlement.savingsAdded")}</p>
                <p className="text-2xl font-bold text-income">+¥{formatCurrency(calc.savingsAdded)}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-income/10 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-income/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Current Savings */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/8 to-transparent">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">{t("home.savings")}</p>
              <p className="text-2xl font-bold text-primary">
                <span className="text-sm font-normal mr-0.5">¥</span>
                {formatCurrency(savings?.totalAmount ?? 0)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-primary/20" />
          </CardContent>
        </Card>

        {/* Settlement History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
              <History className="w-3 h-3 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">{t("settlement.history")}</h2>
          </div>
          {settlementHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("settlement.noHistory")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settlementHistory.map(s => {
                const sMonthLabel = isZh
                  ? `${s.year}年${s.month}月`
                  : new Date(s.year, s.month - 1).toLocaleDateString("en-US", { year: "numeric", month: "short" });
                return (
                  <div key={s.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium">{sMonthLabel}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(s.settledAt)} · {s.operatorName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">{t("settlement.savingsAdded")}</p>
                        <p className="text-sm font-bold text-income">+¥{formatCurrency(s.savingsAdded)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                      <div className="text-center">
                        <span className="block text-xs font-medium text-income">¥{formatCurrency(s.totalIncome, 0)}</span>
                        <span className="text-[10px] text-muted-foreground">{t("settlement.totalIncome")}</span>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs font-medium ${parseFloat(s.totalSurplus) >= 0 ? "text-income" : "text-expense"}`}>
                          ¥{formatCurrency(s.totalSurplus, 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{t("settlement.totalSurplus")}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-medium text-primary">¥{formatCurrency(s.investmentAmount, 0)}</span>
                        <span className="text-[10px] text-muted-foreground">{t("settlement.investmentAmount")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t("settlement.settleNow")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">{t("settlement.settleConfirm")}</p>
            <div className="p-3.5 rounded-xl bg-primary/8 border border-primary/15 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("settlement.totalSurplus")}</span>
                <span className={`font-semibold ${calc.totalSurplus >= 0 ? "text-income" : "text-expense"}`}>
                  ¥{formatCurrency(calc.totalSurplus)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("settlement.investmentAmount")}</span>
                <span className="text-primary font-semibold">¥{formatCurrency(calc.investmentAmount)}</span>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("settlement.savingsAdded")}</span>
                <span className="text-income font-bold">+¥{formatCurrency(calc.savingsAdded)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 h-10">{t("common.cancel")}</Button>
            <Button onClick={handleSettle} disabled={settleMutation.isPending} className="flex-1 h-10">
              {settleMutation.isPending ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
