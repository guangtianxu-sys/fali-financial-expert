import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, TrendingUp, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/transactions", icon: BookOpen, labelKey: "nav.transactions" },
  { path: "/settlement", icon: TrendingUp, labelKey: "nav.settlement" },
  { path: "/assets", icon: BarChart3, labelKey: "nav.assets" },
  { path: "/settings", icon: Settings, labelKey: "nav.settings" },
];

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
}

export default function MobileLayout({ children, title, headerRight }: MobileLayoutProps) {
  const { t } = useTranslation();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
      {title && (
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 h-12 flex items-center justify-between">
          <h1 className="text-base font-semibold text-foreground tracking-tight">{title}</h1>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-card/90 backdrop-blur-xl border-t border-border/30"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map(({ path, icon: Icon, labelKey }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <button className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 active:text-foreground"
                )}>
                  {isActive && (
                    <span className="absolute -top-1.5 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                  <Icon className={cn(
                    "w-[18px] h-[18px] transition-all duration-200",
                    isActive && "scale-110"
                  )} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className={cn(
                    "text-[9px] font-medium leading-none mt-0.5",
                    isActive && "font-semibold"
                  )}>
                    {t(labelKey)}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
