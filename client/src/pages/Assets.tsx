import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/MobileLayout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, TrendingDown, Package, Calendar, Timer } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number | string, decimals = 2) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function calcDepreciation(asset: {
  purchasePrice: string;
  lifespanYears: number;
  purchaseDate: string | Date;
}) {
  const price = parseFloat(asset.purchasePrice);
  const totalDays = asset.lifespanYears * 365;
  const dailyDep = price / totalDays;
  const purchaseDateObj = asset.purchaseDate instanceof Date ? asset.purchaseDate : new Date(asset.purchaseDate);
  const daysUsed = Math.max(0, Math.floor((Date.now() - purchaseDateObj.getTime()) / 86400000));
  const daysRemaining = Math.max(0, totalDays - daysUsed);
  const totalDepreciated = Math.min(dailyDep * daysUsed, price);
  const remainingValue = Math.max(price - totalDepreciated, 0);
  const depreciationPct = Math.min((totalDepreciated / price) * 100, 100);
  return { dailyDep, daysUsed, daysRemaining, totalDepreciated, remainingValue, depreciationPct };
}

type AssetRow = {
  id: number;
  name: string;
  nameEn: string | null;
  purchasePrice: string;
  lifespanYears: number;
  purchaseDate: string | Date;
};

const emptyForm = { name: "", nameEn: "", purchasePrice: "", lifespanYears: "5", purchaseDate: "" };

export default function Assets() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const isZh = i18n.language === "zh";

  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    ...emptyForm,
    purchaseDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  });

  const { data: assets = [], isLoading } = trpc.asset.list.useQuery();

  const totalDailyDep = useMemo(() => {
    return assets.reduce((sum, a) => sum + calcDepreciation(a).dailyDep, 0);
  }, [assets]);

  const totalValue = useMemo(() => {
    return assets.reduce((sum, a) => sum + parseFloat(a.purchasePrice), 0);
  }, [assets]);

  const totalRemaining = useMemo(() => {
    return assets.reduce((sum, a) => sum + calcDepreciation(a).remainingValue, 0);
  }, [assets]);

  const createMutation = trpc.asset.create.useMutation({
    onSuccess: () => { utils.asset.list.invalidate(); setShowForm(false); setForm({ ...emptyForm, purchaseDate: form.purchaseDate }); toast.success(t("common.success")); },
    onError: () => toast.error(t("common.error")),
  });

  const updateMutation = trpc.asset.update.useMutation({
    onSuccess: () => { utils.asset.list.invalidate(); setShowForm(false); setEditAsset(null); toast.success(t("common.success")); },
    onError: () => toast.error(t("common.error")),
  });

  const deleteMutation = trpc.asset.delete.useMutation({
    onSuccess: () => { utils.asset.list.invalidate(); setDeleteId(null); toast.success(t("common.success")); },
    onError: () => toast.error(t("common.error")),
  });

  const openAdd = () => {
    setEditAsset(null);
    const today = new Date();
    setForm({
      ...emptyForm,
      purchaseDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    });
    setShowForm(true);
  };

  const openEdit = (asset: AssetRow) => {
    setEditAsset(asset);
    const pd = asset.purchaseDate instanceof Date
      ? `${asset.purchaseDate.getFullYear()}-${String(asset.purchaseDate.getMonth() + 1).padStart(2, "0")}-${String(asset.purchaseDate.getDate()).padStart(2, "0")}`
      : String(asset.purchaseDate).slice(0, 10);
    setForm({ name: asset.name, nameEn: asset.nameEn ?? "", purchasePrice: asset.purchasePrice, lifespanYears: String(asset.lifespanYears), purchaseDate: pd });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.purchasePrice || !form.purchaseDate) {
      toast.error(isZh ? "请填写完整信息" : "Please fill in all required fields");
      return;
    }
    const payload = {
      name: form.name,
      nameEn: form.nameEn || undefined,
      purchasePrice: form.purchasePrice,
      lifespanYears: parseInt(form.lifespanYears) || 5,
      purchaseDate: form.purchaseDate,
    };
    if (editAsset) {
      updateMutation.mutate({ id: editAsset.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formatPurchaseDate = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <MobileLayout
      title={t("assets.title")}
      headerRight={
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {isAuthenticated && (
            <Button size="sm" className="h-8 px-3 text-xs gap-1" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />{t("common.add")}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* Total Daily Depreciation Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-destructive/20 via-destructive/8 to-transparent border border-destructive/15 p-5">
          <div className="absolute top-0 right-0 w-28 h-28 bg-destructive/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground/70 font-medium">{t("assets.totalDailyDepreciation")}</span>
              <div className="w-8 h-8 rounded-xl bg-destructive/15 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
            </div>
            <div className="text-3xl font-bold text-destructive tracking-tight mb-1">
              <span className="text-lg font-normal mr-0.5">-¥</span>
              {formatCurrency(totalDailyDep)}
              <span className="text-sm font-normal text-destructive/60 ml-1">/{isZh ? "天" : "day"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{t("assets.depreciationFormula")}</p>
          </div>
        </div>

        {/* Summary Row */}
        {assets.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{isZh ? "资产总值" : "Total Value"}</p>
              <p className="text-sm font-semibold text-foreground">¥{formatCurrency(totalValue, 0)}</p>
            </div>
            <div className="bg-income/8 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{t("assets.remainingValue")}</p>
              <p className="text-sm font-semibold text-income">¥{formatCurrency(totalRemaining, 0)}</p>
            </div>
          </div>
        )}

        {/* Asset List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">{t("common.loading")}</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">{t("assets.noAssets")}</p>
            {isAuthenticated && (
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openAdd}>
                <Plus className="w-3.5 h-3.5" />{t("assets.addAsset")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map(asset => {
              const dep = calcDepreciation(asset);
              return (
                <Card key={asset.id} className="border-border/50 bg-card/80 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Card Header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-semibold">{asset.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatPurchaseDate(asset.purchaseDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {asset.lifespanYears}{t("assets.lifespanUnit")}
                            </span>
                          </div>
                        </div>
                        {isAuthenticated && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(asset as AssetRow)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(asset.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Value Grid */}
                    <div className="grid grid-cols-3 gap-px bg-border/30 mx-4">
                      <div className="bg-card p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{t("assets.purchasePrice")}</p>
                        <p className="text-sm font-semibold mt-0.5">¥{formatCurrency(asset.purchasePrice, 0)}</p>
                      </div>
                      <div className="bg-card p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{t("assets.totalDepreciated")}</p>
                        <p className="text-sm font-semibold text-destructive mt-0.5">-¥{formatCurrency(dep.totalDepreciated, 0)}</p>
                      </div>
                      <div className="bg-card p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground">{t("assets.remainingValue")}</p>
                        <p className="text-sm font-semibold text-income mt-0.5">¥{formatCurrency(dep.remainingValue, 0)}</p>
                      </div>
                    </div>

                    {/* Depreciation Progress */}
                    <div className="p-4 pt-3">
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-muted-foreground">
                          {t("assets.valueLost")} {dep.depreciationPct.toFixed(1)}%
                        </span>
                        <span className="text-destructive font-medium">
                          -¥{formatCurrency(dep.dailyDep)}/{isZh ? "天" : "d"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-secondary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${dep.depreciationPct}%`,
                            background: dep.depreciationPct > 80
                              ? "var(--expense-color)"
                              : dep.depreciationPct > 50
                                ? "var(--warning-color)"
                                : "var(--primary)",
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{t("assets.assetAge")}: {dep.daysUsed}{t("assets.assetAgeUnit")}</span>
                        <span>{isZh ? "剩余" : "Left"}: {dep.daysRemaining}{isZh ? "天" : "d"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditAsset(null); } }}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{editAsset ? t("assets.editAsset") : t("assets.addAsset")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("common.name")} *</Label>
              <Input placeholder={isZh ? "如：家用轿车" : "e.g. Family Car"} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {isZh ? "英文名（可选）" : "English Name (optional)"}
              </Label>
              <Input placeholder="e.g. Family Car" value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("assets.purchasePrice")} *</Label>
                <Input type="number" inputMode="decimal" placeholder="0" value={form.purchasePrice}
                  onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))}
                  className="h-10 text-sm bg-background/50 border-border/60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("assets.lifespanYears")}</Label>
                <Input type="number" inputMode="numeric" placeholder="5" value={form.lifespanYears}
                  onChange={e => setForm(f => ({ ...f, lifespanYears: e.target.value }))}
                  className="h-10 text-sm bg-background/50 border-border/60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("assets.purchaseDate")} *</Label>
              <Input type="date" value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                className="h-10 text-sm bg-background/50 border-border/60" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditAsset(null); }} className="flex-1 h-10">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-10">
              {(createMutation.isPending || updateMutation.isPending) ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-border/60 max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t("common.delete")}</DialogTitle>
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
