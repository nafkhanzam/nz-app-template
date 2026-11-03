import { browser } from "$app/env";

type Theme = "light" | "dark";

const LIGHT: Theme = "light";
const DARK: Theme = "dark";

class ThemeStore {
  theme = $state<Theme>(LIGHT);

  constructor() {
    if (browser) {
      // Load theme from localStorage or default to light
      const stored = localStorage.getItem("theme") as Theme | null;
      this.theme = stored || LIGHT;
      this.applyTheme(this.theme);
    }
  }

  toggle() {
    this.theme = this.theme === LIGHT ? DARK : LIGHT;
    this.applyTheme(this.theme);
    if (browser) {
      localStorage.setItem("theme", this.theme);
    }
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.applyTheme(theme);
    if (browser) {
      localStorage.setItem("theme", theme);
    }
  }

  private applyTheme(theme: Theme) {
    if (browser) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }
}

export const themeStore = new ThemeStore();
