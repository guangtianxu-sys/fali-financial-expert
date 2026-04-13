import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/MobileLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Plus, CheckCircle, Trash2, Clock, Receipt, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type FilterType = "all" | "advance" | "overdue";

export default function Transactions() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const isZh = i18n.language === "zh";

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [filter, setFilter] = useState<FilterType>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [form, setForm] = useState({
    amount: "",
    categoryType: "flexible" as "fixed" | "flexible" | "repayment" | "other",
    categoryId: "",
    categoryName: "",
    note: "",
    transactionDate: `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    isCompanyAdvance: false,
  });

  const { data: transactions = [], isLoading } = trpc.transaction.list.useQuery({ year, month });
  const { data: fixedExpenses = [] } = trpc.fixedExpense.list.useQuery();
  const { data: flexibleBudgets = [] } = trpc.flexibleBudget.list.useQuery();
  const { data: repayments = [] } = trpc.repayment.list.useQuery();

  const createMutation = trpc.transaction.create.useMutation({
    onSuccess: () => {
      utils.transaction.list.invalidate();
      utils.transaction.overdueAdvances.invalidate();
      setShowAdd(false);
      resetForm();
      toast.success(t("common.success"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const markInvoicedMutation = trpc.transaction.markInvoiced.useMutation({
    onSuccess: () => {
      utils.transaction.list.invalidate();
      utils.transaction.overdueAdvances.invalidate();
      toast.success(t("common.success"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteMutation = trpc.transaction.delete.useMutation({
    onSuccess: () => {
      utils.transaction.list.invalidate();
      utils.transaction.overdueAdvances.invalidate();
      setDeleteId(null);
      toast.success(t("common.success"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const resetForm = () => setForm({
    amount: "", categoryType: "flexible", categoryId: "", categoryName: "",
    note: "", transactionDate: `${year}-${String(month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
    isCompanyAdvance: false,
  });

  const getCategoryOptions = () => {
    if (form.categoryType === "fixed") return fixedExpenses.filter(e => e.isActive);
    if (form.categoryType === "flexible") return flexibleBudgets.filter(b => b.isActive).map(b => ({ id: b.id, name: b.name }));
    if (form.categoryType === "repayment") return repayments.filter(r => r.isActive);
    return [];
  };

  const handleCategoryTypeChange = (val: string) => {
    setForm(f => ({ ...f, categoryType: val as typeof f.categoryType, categoryId: "", categoryName: "" }));
  };

  const handleCategorySelect = (val: string) => {
    const opts = getCategoryOptions();
    const found = opts.find(o => String(o.id) === val);
    setForm(f => ({ ...f, categoryId: val, categoryName: found?.name ?? "" }));
  };

  const handleSubmit = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error(isZh ? "请输入有效金额" : "Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      amount: form.amount,
      categoryType: form.categoryType,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      categoryName: form.categoryName || undefined,
      note: form.note || undefined,
      transactionDate: form.transactionDate,
      isCompanyAdvance: form.isCompanyAdvance,
    });
  };

  const getAdvanceDays = (tx: typeof transactions[0]) => {
    if (!tx.advanceStartDate) return 0;
    return Math.floor((Date.now() - new Date(tx.advanceStartDate).getTime()) / 86400000);
  };

  const isOverdue = (tx: typeof transactions[0]) => {
    return tx.isCompanyAdvance && !tx.isInvoiced && getAdvanceDays(tx) > 30;
  };

  const filteredTxns = useMemo(() => {
    if (filter === "advance") return transactions.filter(tx => tx.isCompanyAdvance && !tx.isInvoiced);
    if (filter === "overdue") return transactions.filter(isOverdue);
    return transactions;
  }, [transactions, filter]);

  const overdueCount = transactions.filter(isOverdue).length;

  return (
    <MobileLayout
      title={t("transactions.title")}
      headerRight={
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {isAuthenticated && (
            <Button size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" />{t("common.add")}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 bg-secondary/30 rounded-xl p-1">
          {(["all", "advance", "overdue"] as FilterType[]).map(f => (
            <button
              key={f}
              className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
              onClick={() => setFilter(f)}
            >
              {t(`transactions.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              {f === "overdue" && overdueCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">{t("common.loading")}</p>
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Receipt className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">{t("transactions.noTransactions")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTxns.map(tx => {
              const overdue = isOverdue(tx);
              const days = getAdvanceDays(tx);
              const categoryKey = tx.categoryType.charAt(0).toUpperCase() + tx.categoryType.slice(1);
              return (
                <div
                  key={tx.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    overdue
                      ? "border-destructive/30 bg-destructive/5 overdue-pulse"
                      : "border-border/40 bg-card/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {tx.categoryName || t(`transactions.category${categoryKey}`)}
                        </span>
                        {tx.isCompanyAdvance && !tx.isInvoiced && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                            overdue ? "border-destructive/50 text-destructive" : "border-advance/40 text-advance"
                          }`}>
                            {overdue
                              ? <><AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />{t("transactions.advanceOverdueDays", { days: days - 30 })}</>
                              : <><Clock className="w-2.5 h-2.5 mr-0.5 inline" />{t("transactions.advanceDaysLeft", { days: 30 - days })}</>
                            }
                          </Badge>
                        )}
                        {tx.isInvoiced && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-income/40 text-income">
                            <CheckCircle className="w-2.5 h-2.5 mr-0.5 inline" />{t("transactions.invoiced")}
                          </Badge>
                        )}
                      </div>
                      {tx.note && <p className="text-[11px] text-muted-foreground mt-1 truncate">{tx.note}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDate(tx.transactionDate)} · {tx.operatorName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-base font-bold tabular-nums ${
                        tx.isCompanyAdvance ? "text-advance" : "text-expense"
                      }`}>
                        {tx.isCompanyAdvance ? "" : "-"}¥{formatCurrency(tx.amount)}
                      </span>
                      <div className="flex gap-1">
                        {tx.isCompanyAdvance && !tx.isInvoiced && isAuthenticated && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-income hover:text-income hover:bg-income/10"
                            onClick={() => markInvoicedMutation.mutate({ id: tx.id })}>
                            <CheckCircle className="w-3 h-3 mr-0.5" />{t("transactions.markInvoiced")}
                          </Button>
                        )}
                        {isAuthenticated && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(tx.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t("transactions.addTransaction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("transactions.category")}</Label>
                <Select value={form.categoryType} onValueChange={handleCategoryTypeChange}>
                  <SelectTrigger className="h-10 text-sm bg-background/50 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="fixed">{t("transactions.categoryFixed")}</SelectItem>
                    <SelectItem value="flexible">{t("transactions.categoryFlexible")}</SelectItem>
                    <SelectItem value="repayment">{t("transactions.categoryRepayment")}</SelectItem>
                    <SelectItem value="other">{t("transactions.categoryOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("common.amount")} (¥)</Label>
                <Input type="number" inputMode="decimal" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="h-10 text-sm bg-background/50 border-border/60" />
              </div>
            </div>

            {form.categoryType !== "other" && getCategoryOptions().length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("transactions.selectCategory")}</Label>
                <Select value={form.categoryId} onValueChange={handleCategorySelect}>
                  <SelectTrigger className="h-10 text-sm bg-background/50 border-border/60">
                    <SelectValue placeholder={t("transactions.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {getCategoryOptions().map(opt => (
                      <SelectItem key={opt.id} value={String(opt.id)}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.categoryType === "other" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("common.name")}</Label>
                <Input placeholder={isZh ? "支出名称" : "Expense name"} value={form.categoryName}
                  onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
                  className="h-10 text-sm bg-background/50 border-border/60" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("transactions.transactionDate")}</Label>
              <Input type="date" value={form.transactionDate}
                onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("common.note")}</Label>
              <Input placeholder={isZh ? "可选备注" : "Optional note"} value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-advance/8 border border-advance/15">
              <Checkbox id="advance" checked={form.isCompanyAdvance}
                onCheckedChange={v => setForm(f => ({ ...f, isCompanyAdvance: v === true }))}
                className="mt-0.5 border-advance data-[state=checked]:bg-advance data-[state=checked]:border-advance" />
              <div>
                <Label htmlFor="advance" className="text-sm font-medium text-advance cursor-pointer">
                  {t("transactions.companyAdvance")}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("transactions.companyAdvanceDesc")}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 h-10">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 h-10">
              {createMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t("transactions.deleteTransaction")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("common.deleteConfirm")}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 h-10">{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending} className="flex-1 h-10">
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
