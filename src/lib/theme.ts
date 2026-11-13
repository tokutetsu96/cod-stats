export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

/** 未設定時のテーマ。従来のダーク固定の見た目を維持する */
export const DEFAULT_THEME: Theme = "dark";

const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark" || v === "system";

export function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** html要素の .dark クラスと color-scheme を反映する */
export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ストレージ不可（プライベートモード等）でも表示の切替だけは行う
  }
  applyTheme(theme);
}

/**
 * hydration前に同期実行してテーマを適用するスクリプト（ちらつき防止）。
 * 「システム」選択時はOS設定の変更にも追従する。
 */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},d=${JSON.stringify(DEFAULT_THEME)},m=window.matchMedia("(prefers-color-scheme: dark)");function g(){var t=null;try{t=localStorage.getItem(k)}catch(e){}return t==="light"||t==="dark"||t==="system"?t:d}function a(){var t=g(),x=t==="dark"||(t==="system"&&m.matches),r=document.documentElement;r.classList.toggle("dark",x);r.style.colorScheme=x?"dark":"light"}a();m.addEventListener("change",a)}catch(e){}})();`;
