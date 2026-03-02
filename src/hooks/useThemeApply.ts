import { useEffect } from "react";
import { useSiteTheme, useSiteContent } from "./useSiteContent";

/**
 * Reads theme colors from DB and applies them as CSS custom properties on :root.
 * Also applies background settings from site settings.
 */
export function useThemeApply() {
  const { data: themes } = useSiteTheme();
  const { data: settings } = useSiteContent("settings");

  useEffect(() => {
    if (!themes) return;
    const root = document.documentElement;
    themes.forEach((t) => {
      root.style.setProperty(`--${t.theme_key}`, t.value);
    });
  }, [themes]);

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    const body = document.body;

    // Reset
    body.style.removeProperty("background-color");
    body.style.removeProperty("background-image");

    if (s.background_type === "solid" && s.background_value) {
      body.style.backgroundColor = s.background_value;
    } else if (s.background_type === "gradient" && s.background_value) {
      body.style.backgroundImage = s.background_value;
    } else if (s.background_type === "image" && s.background_value) {
      body.style.backgroundImage = `url(${s.background_value})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
    }
  }, [settings]);
}
