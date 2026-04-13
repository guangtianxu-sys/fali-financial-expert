import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/MobileLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, DollarSign, LogOut, User, Globe, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

type ConfigItem = { id: number; name: string; nameEn?: string | null; amount?: string; budgetAmount?: string; isActive: boolean };

interface ConfigSectionProps {
  items: ConfigItem[];
  totalLabel: string;
  totalAmount: number;
  amountField: "amount" | "budgetAmount";
  addLabel: string;
  editLabel: string;
  onAdd: (data: { name: string; nameEn?: string; amount: string }) => void;
  onEdit: (id: number, data: { name?: string; nameEn?: string; amount?: string; isActive?: boolean }) => void;
  onDelete: (id: number) => void;
  isAuthenticated: boolean;
}

function ConfigSection({
  items, totalLabel, totalAmount, amountField,
  addLabel, editLabel, onAdd, onEdit, onDelete, isAuthenticated,
}: ConfigSectionProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ConfigItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", nameEn: "", amount: "" });

  const openAdd = () => { setEditItem(null); setForm({ name: "", nameEn: "", amount: "" }); setShowForm(true); };
  const openEdit = (item: ConfigItem) => {
    setEditItem(item);
    setForm({ name: item.name, nameEn: item.nameEn ?? "", amount: item.amount ?? item.budgetAmount ?? "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) {
      toast.error(isZh ? "请填写名称和金额" : "Please fill in name and amount");
      return;
    }
    if (editItem) {
      onEdit(editItem.id, { name: form.name, nameEn: form.nameEn || undefined, amount: form.amount });
    } else {
      onAdd({ name: form.name, nameEn: form.nameEn || undefined, amount: form.amount });
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ name: "", nameEn: "", amount: "" });
  };

  return (
    <div className="space-y-2">
      {/* Total & Add */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-muted-foreground">
          {totalLabel}: <span className="text-primary font-semibold">¥{formatCurrency(totalAmount)}</span>
        </span>
        {isAuthenticated && (
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={openAdd}>
            <Plus className="w-3 h-3" />{t("common.add")}
          </Button>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-sm font-medium truncate ${!item.isActive ? "text-muted-foreground line-through" : ""}`}>
                  {item.name}
                </span>
                {!item.isActive && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 h-4">{t("common.inactive")}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-sm font-semibold tabular-nums">¥{formatCurrency(item.amount ?? item.budgetAmount ?? 0)}</span>
                {isAuthenticated && (
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEdit(item)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditItem(null); } }}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editItem ? editLabel : addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("common.name")} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {isZh ? "英文名（可选）" : "English Name (optional)"}
              </Label>
              <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("settings.monthlyAmount")} (¥) *</Label>
              <Input type="number" inputMode="decimal" placeholder="0" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-10">{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} className="flex-1 h-10">{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader><DialogTitle className="text-base">{t("common.delete")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("common.deleteConfirm")}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 h-10">{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }} className="flex-1 h-10">
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const isZh = i18n.language === "zh";

  const { data: incomes = [] } = trpc.income.list.useQuery();
  const { data: fixedExpenses = [] } = trpc.fixedExpense.list.useQuery();
  const { data: flexibleBudgets = [] } = trpc.flexibleBudget.list.useQuery();
  const { data: repayments = [] } = trpc.repayment.list.useQuery();

  // Mutations
  const createIncome = trpc.income.create.useMutation({ onSuccess: () => { utils.income.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const updateIncome = trpc.income.update.useMutation({ onSuccess: () => { utils.income.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const deleteIncome = trpc.income.delete.useMutation({ onSuccess: () => { utils.income.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });

  const createFixed = trpc.fixedExpense.create.useMutation({ onSuccess: () => { utils.fixedExpense.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const updateFixed = trpc.fixedExpense.update.useMutation({ onSuccess: () => { utils.fixedExpense.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const deleteFixed = trpc.fixedExpense.delete.useMutation({ onSuccess: () => { utils.fixedExpense.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });

  const createFlex = trpc.flexibleBudget.create.useMutation({ onSuccess: () => { utils.flexibleBudget.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const updateFlex = trpc.flexibleBudget.update.useMutation({ onSuccess: () => { utils.flexibleBudget.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const deleteFlex = trpc.flexibleBudget.delete.useMutation({ onSuccess: () => { utils.flexibleBudget.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });

  const createRepay = trpc.repayment.create.useMutation({ onSuccess: () => { utils.repayment.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const updateRepay = trpc.repayment.update.useMutation({ onSuccess: () => { utils.repayment.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });
  const deleteRepay = trpc.repayment.delete.useMutation({ onSuccess: () => { utils.repayment.list.invalidate(); toast.success(t("common.success")); }, onError: () => toast.error(t("common.error")) });

  const totalIncome = incomes.filter(i => i.isActive).reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalFixed = fixedExpenses.filter(e => e.isActive).reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalFlex = flexibleBudgets.filter(b => b.isActive).reduce((s, b) => s + parseFloat(b.budgetAmount), 0);
  const totalRepay = repayments.filter(r => r.isActive).reduce((s, r) => s + parseFloat(r.amount), 0);
  const netBudget = totalIncome - totalFixed - totalFlex - totalRepay;

  return (
    <MobileLayout title={t("settings.title")} headerRight={<LanguageSwitcher />}>
      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* User Profile Card */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8" onClick={logout}>
                <LogOut className="w-3.5 h-3.5" />{t("auth.logout")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language Switcher */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t("settings.language")}</span>
            </div>
            <div className="flex gap-1.5 bg-secondary/40 rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i18n.language === "zh" || i18n.language.startsWith("zh")
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => i18n.changeLanguage("zh")}
              >
                {t("settings.languageZh")}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i18n.language === "en"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => i18n.changeLanguage("en")}
              >
                {t("settings.languageEn")}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/15 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">{isZh ? "月度预算概览" : "Monthly Budget Overview"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/30 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("settings.totalMonthlyIncome")}</p>
              <p className="text-sm font-bold text-income mt-0.5">¥{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-background/30 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("settings.totalFixedExpense")}</p>
              <p className="text-sm font-bold text-expense mt-0.5">¥{formatCurrency(totalFixed)}</p>
            </div>
            <div className="bg-background/30 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("settings.totalFlexibleBudget")}</p>
              <p className="text-sm font-bold text-foreground mt-0.5">¥{formatCurrency(totalFlex)}</p>
            </div>
            <div className="bg-background/30 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">{t("settings.totalRepayment")}</p>
              <p className="text-sm font-bold text-foreground mt-0.5">¥{formatCurrency(totalRepay)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-primary/10 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{isZh ? "预算净余" : "Net Budget"}</span>
            <span className={`text-sm font-bold ${netBudget >= 0 ? "text-income" : "text-destructive"}`}>
              ¥{formatCurrency(netBudget)}
            </span>
          </div>
        </div>

        {/* Config Tabs */}
        <Tabs defaultValue="income">
          <TabsList className="grid grid-cols-4 w-full bg-secondary/30 h-9 rounded-xl p-0.5">
            <TabsTrigger value="income" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">{t("settings.income")}</TabsTrigger>
            <TabsTrigger value="fixed" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">{t("settings.fixedExpenses")}</TabsTrigger>
            <TabsTrigger value="flexible" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">{t("settings.flexibleBudgets")}</TabsTrigger>
            <TabsTrigger value="repayment" className="text-[11px] rounded-lg data-[state=active]:shadow-sm">{t("settings.repayments")}</TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="mt-3">
            <ConfigSection
              items={incomes}
              totalLabel={t("settings.totalMonthlyIncome")}
              totalAmount={totalIncome}
              amountField="amount"
              addLabel={t("settings.addIncome")}
              editLabel={t("settings.editIncome")}
              onAdd={d => createIncome.mutate(d)}
              onEdit={(id, d) => updateIncome.mutate({ id, ...d })}
              onDelete={id => deleteIncome.mutate({ id })}
              isAuthenticated={isAuthenticated}
            />
          </TabsContent>

          <TabsContent value="fixed" className="mt-3">
            <ConfigSection
              items={fixedExpenses}
              totalLabel={t("settings.totalFixedExpense")}
              totalAmount={totalFixed}
              amountField="amount"
              addLabel={t("settings.addFixedExpense")}
              editLabel={t("settings.editFixedExpense")}
              onAdd={d => createFixed.mutate(d)}
              onEdit={(id, d) => updateFixed.mutate({ id, ...d })}
              onDelete={id => deleteFixed.mutate({ id })}
              isAuthenticated={isAuthenticated}
            />
          </TabsContent>

          <TabsContent value="flexible" className="mt-3">
            <ConfigSection
              items={flexibleBudgets.map(b => ({ ...b, amount: b.budgetAmount }))}
              totalLabel={t("settings.totalFlexibleBudget")}
              totalAmount={totalFlex}
              amountField="budgetAmount"
              addLabel={t("settings.addFlexibleBudget")}
              editLabel={t("settings.editFlexibleBudget")}
              onAdd={d => createFlex.mutate({ name: d.name, nameEn: d.nameEn, budgetAmount: d.amount })}
              onEdit={(id, d) => updateFlex.mutate({ id, name: d.name, nameEn: d.nameEn, budgetAmount: d.amount, isActive: d.isActive })}
              onDelete={id => deleteFlex.mutate({ id })}
              isAuthenticated={isAuthenticated}
            />
          </TabsContent>

          <TabsContent value="repayment" className="mt-3">
            <ConfigSection
              items={repayments}
              totalLabel={t("settings.totalRepayment")}
              totalAmount={totalRepay}
              amountField="amount"
              addLabel={t("settings.addRepayment")}
              editLabel={t("settings.editRepayment")}
              onAdd={d => createRepay.mutate(d)}
              onEdit={(id, d) => updateRepay.mutate({ id, ...d })}
              onDelete={id => deleteRepay.mutate({ id })}
              isAuthenticated={isAuthenticated}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
