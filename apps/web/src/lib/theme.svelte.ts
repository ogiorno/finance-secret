import { getStoredTheme, setTheme, type Theme } from "@finance/ui";

/** Tema do app, compartilhado entre o botão do topo e as Configurações. */
class AppTheme {
  value = $state<Theme>("light");

  /** Lê o tema que o app já aplicou na página; chamar uma vez, no navegador. */
  sync() {
    this.value = (document.documentElement.getAttribute("data-theme") as Theme | null) ?? getStoredTheme() ?? "light";
  }

  set(theme: Theme) {
    this.value = theme;
    setTheme(theme);
  }

  toggle() {
    this.set(this.value === "dark" ? "light" : "dark");
  }
}

export const appTheme = new AppTheme();
