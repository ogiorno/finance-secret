export type Theme = "light" | "dark";

const STORAGE_KEY = "fd-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Tema salvo, senão o do sistema. Chamar uma vez ao iniciar o app. */
export function initTheme(): Theme {
  const theme = getStoredTheme() ?? systemTheme();
  applyTheme(theme);
  return theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // sem armazenamento: o tema vale só para a sessão
  }
}
