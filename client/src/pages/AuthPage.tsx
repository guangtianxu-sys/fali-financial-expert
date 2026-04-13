import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Wallet, UserPlus, LogIn, Shield, Users, BarChart3 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AuthPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success(t("auth.loginSuccess"));
      utils.auth.me.invalidate();
      navigate("/");
    },
    onError: () => {
      toast.error(t("auth.invalidCredentials"));
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success(t("auth.registerSuccess"));
      utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => {
      if (err.message.includes("already")) {
        toast.error(t("auth.emailExists"));
      } else {
        toast.error(err.message);
      }
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = t("auth.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t("auth.emailInvalid");
    if (password.length < 6) newErrors.password = t("auth.passwordTooShort");
    if (mode === "register") {
      if (!name.trim()) newErrors.name = t("auth.nameRequired");
      if (password !== confirmPassword) newErrors.confirmPassword = t("auth.passwordMismatch");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none" />
      <div className="absolute top-[-80px] right-[-60px] w-60 h-60 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 rounded-full bg-primary/4 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-safe-top">
        <div className="pt-5" />
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col justify-center px-5 pb-8 -mt-4">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">{t("app.title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t("app.subtitle")}</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-5 shadow-xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("auth.displayName")}
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.displayName")}
                  className="h-11 bg-background/60 border-border/60 focus:border-primary/60 rounded-xl"
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-11 bg-background/60 border-border/60 focus:border-primary/60 rounded-xl"
              />
              {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-11 bg-background/60 border-border/60 focus:border-primary/60 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("auth.confirmPassword")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  className="h-11 bg-background/60 border-border/60 focus:border-primary/60 rounded-xl"
                />
                {errors.confirmPassword && <p className="text-[11px] text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm gap-2 rounded-xl mt-1"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {t("auth.login")}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t("auth.register")}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Toggle mode */}
        <div className="mt-5 text-center">
          <span className="text-xs text-muted-foreground">
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
          </span>
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErrors({});
            }}
            className="text-xs text-primary font-semibold ml-1.5 hover:underline"
          >
            {mode === "login" ? t("auth.goRegister") : t("auth.goLogin")}
          </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: mode === "login" ? t("auth.featureCollab") : t("auth.featureCollab") },
            { icon: Shield, label: t("auth.featureSecure") },
            { icon: BarChart3, label: t("auth.featureInsight") },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary/30">
              <f.icon className="w-4 h-4 text-primary/60" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
