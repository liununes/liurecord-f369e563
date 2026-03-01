import { useEffect } from "react";
import { useSiteTheme } from "./useSiteContent";

/**
 * Reads theme colors from DB and applies them as CSS custom properties on :root
 */
export function useThemeApply() {
  const { data: themes } = useSiteTheme();

  useEffect(() => {
    if (!themes) return;
    const root = document.documentElement;
    themes.forEach((t) => {
      root.style.setProperty(`--${t.theme_key}`, t.value);
    });
  }, [themes]);
}
