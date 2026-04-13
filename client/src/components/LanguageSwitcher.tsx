import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh" || i18n.language.startsWith("zh");

  const toggle = () => {
    i18n.changeLanguage(isZh ? "en" : "zh");
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground h-7 px-2 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors"
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="text-[11px] font-medium">{isZh ? "EN" : "中"}</span>
    </button>
  );
}
