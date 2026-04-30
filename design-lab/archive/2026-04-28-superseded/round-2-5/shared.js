(function () {
  const STORAGE_KEY = "buildfi_lab_product_theme";

  function applyTheme(theme) {
    const pages = document.querySelectorAll(".surface.product");
    pages.forEach((page) => {
      page.setAttribute("data-theme", theme);
    });
    const label = document.querySelector("[data-theme-label]");
    if (label) label.textContent = theme === "dark" ? "Dark product mode" : "Light product mode";
  }

  function getInitialTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "dark";
  }

  function initThemeButtons() {
    const buttons = document.querySelectorAll("[data-set-theme]");
    if (!buttons.length) return;
    let current = getInitialTheme();
    applyTheme(current);
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        current = button.getAttribute("data-set-theme") || "dark";
        try {
          localStorage.setItem(STORAGE_KEY, current);
        } catch {}
        applyTheme(current);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initThemeButtons);
})();
