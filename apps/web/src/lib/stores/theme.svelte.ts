import { browser } from "$app/environment";

type Theme = "light" | "dark";

class ThemeStore {
  theme = $state<Theme>("light");

  constructor() {
    if (browser) {
      // Load theme from localStorage or default to light
      const stored = localStorage.getItem("theme") as Theme | null;
      this.theme = stored || "light";
      this.applyTheme(this.theme);
    }
  }

  toggle() {
    this.theme = this.theme === "light" ? "dark" : "light";
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
